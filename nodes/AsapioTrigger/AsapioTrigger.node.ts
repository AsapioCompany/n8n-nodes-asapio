import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IHookFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
	INodeCredentialTestResult,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { computeSignature, extractHexSignature, isTimestampFresh, safeCompare } from './signature';

const SIGNATURE_HEADER = 'x-asapio-signature';
const TIMESTAMP_HEADER = 'x-asapio-timestamp';
const DEFAULT_TOLERANCE_SECONDS = 300;

export class AsapioTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ASAPIO Event Trigger',
		name: 'asapioTrigger',
		icon: { light: 'file:asapio.svg', dark: 'file:asapio.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["path"]}}',
		description:
			'Starts the workflow when the ASAPIO Integration Add-on (Event Studio) sends an event from your SAP® software',
		documentationUrl: 'https://github.com/AsapioCompany/n8n-nodes-asapio#readme',
		defaults: {
			name: 'ASAPIO Event Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'asapioApi',
				required: true,
				testedBy: 'asapioCredentialTest',
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: '={{$parameter["path"]}}',
				rawBody: true,
			},
		],
		triggerPanel: {
			header: 'Pasting the webhook URLs into Event Studio',
			executionsHelp: {
				active:
					'This node listens for events sent by Event Studio. Copy the Production URL above into the n8n target configuration of the corresponding Event Studio channel.',
				inactive:
					'This node listens for events sent by Event Studio. While building your workflow, copy the Test URL above into Event Studio (or send a test request to it), then come back and click "Execute step" to see the event data. Once the workflow is active, switch Event Studio to the Production URL.',
			},
			activationHint:
				'Once you\'re happy with your workflow, activate it, then switch the target URL in Event Studio from the Test URL to the Production URL shown above.',
		},
		hints: [
			{
				message:
					'Verification results are available under the "asapio" field on the output item (asapio.signatureValid, asapio.timestampValid). Add an IF node to branch on them if "Reject Invalid Signatures" is off.',
				type: 'info',
				location: 'outputPane',
			},
		],
		properties: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: 'asapio-events',
				required: true,
				description:
					'The last segment of the webhook URL n8n generates for this node (shown above once you save/activate). You choose this value freely — then paste the resulting URL into the n8n target configuration in Event Studio, so ASAPIO knows where to send events.',
			},
			{
				displayName: 'Timestamp Tolerance (Seconds)',
				name: 'timestampTolerance',
				type: 'number',
				default: DEFAULT_TOLERANCE_SECONDS,
				description:
					'Maximum allowed age of the X-ASAPIO-Timestamp header before the event is flagged as stale (replay protection)',
			},
			{
				displayName: 'Reject Invalid Signatures',
				name: 'rejectInvalid',
				type: 'boolean',
				default: false,
				description:
					'Whether to respond with HTTP 401 and skip triggering the workflow when the signature is missing, invalid, or stale. When disabled, the workflow always triggers and the verification result is attached to the output item under "asapio.signatureValid" so the workflow can decide.',
			},
			{
				displayName: 'Response Code',
				name: 'responseCode',
				type: 'number',
				default: 200,
				description:
					'HTTP status code returned to Event Studio to acknowledge receipt. Event Studio uses this to mark the event as delivered. Applies to the success path only — an invalid signature always responds with 401 when "Reject Invalid Signatures" is on.',
			},
			{
				displayName: 'Response Body',
				name: 'responseBody',
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '{ "received": true }',
				description:
					'Body returned to Event Studio on successful receipt. Valid JSON is sent with a JSON content type; anything else is sent as plain text. Leave empty to send no body.',
			},
		],
	};

	methods = {
		credentialTest: {
			async asapioCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const secret = (credential.data?.signingSecret as string | undefined) ?? '';
				if (secret.length < 16) {
					return {
						status: 'Error',
						message: 'Signing Secret should be at least 16 characters long',
					};
				}
				return { status: 'OK', message: 'Signing Secret looks valid' };
			},
		},
	};

	webhookMethods = {
		default: {
			// The webhook path is defined manually in Event Studio, not registered
			// dynamically against ASAPIO, so it is always considered present.
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const credentials = await this.getCredentials('asapioApi');
		const secret = credentials.signingSecret as string;
		const tolerance = this.getNodeParameter('timestampTolerance', DEFAULT_TOLERANCE_SECONDS) as number;
		const rejectInvalid = this.getNodeParameter('rejectInvalid', false) as boolean;

		const req = this.getRequestObject();
		const headers = this.getHeaderData() as Record<string, string | string[] | undefined>;

		if (!Buffer.isBuffer(req.rawBody)) {
			throw new NodeOperationError(
				this.getNode(),
				'Raw body unavailable — set rawBody: true in the webhook description. ' +
					'Refusing to verify HMAC against a re-serialized body.',
			);
		}
		const rawBody: Buffer = req.rawBody;

		const signatureHeader = headers[SIGNATURE_HEADER];
		const timestampHeader = headers[TIMESTAMP_HEADER];

		const receivedSignature = extractHexSignature(
			Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader,
		);
		const receivedTimestamp = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;

		const expectedSignature = computeSignature(secret, receivedTimestamp ?? '', rawBody);
		const signatureValid = safeCompare(receivedSignature, expectedSignature);

		const { valid: timestampValid, ageSeconds } = isTimestampFresh(receivedTimestamp, tolerance);

		const isValid = signatureValid && timestampValid;

		if (rejectInvalid && !isValid) {
			const reasons: string[] = [];
			if (!receivedSignature) {
				reasons.push(`missing or malformed ${SIGNATURE_HEADER} header`);
			} else if (!signatureValid) {
				reasons.push('signature does not match — check the Signing Secret in your ASAPIO API credential matches the one configured for this target in Event Studio');
			}
			if (!timestampValid) {
				reasons.push(
					receivedTimestamp
						? `${TIMESTAMP_HEADER} is outside the allowed tolerance (${ageSeconds}s old, max ${tolerance}s)`
						: `missing or malformed ${TIMESTAMP_HEADER} header`,
				);
			}

			return {
				webhookResponse: {
					status: 401,
					body: { message: 'Signature verification failed', reasons },
				},
			};
		}

		const responseCode = this.getNodeParameter('responseCode', 200) as number;
		const responseBodyRaw = this.getNodeParameter('responseBody', '') as string;
		let responseBody: unknown = responseBodyRaw;
		try {
			responseBody = JSON.parse(responseBodyRaw);
		} catch {
			// Not JSON — send the raw string as-is (or empty string for no body).
		}

		return {
			webhookResponse: {
				status: responseCode,
				body: responseBody,
			},
			workflowData: [
				[
					{
						json: {
							...(this.getBodyData() as object),
							asapio: {
								signatureValid,
								timestampValid,
								timestampAgeSeconds: ageSeconds,
							},
						},
					},
				],
			],
		};
	}
}
