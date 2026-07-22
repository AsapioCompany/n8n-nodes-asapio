import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AsapioApi implements ICredentialType {
	name = 'asapioApi';

	displayName = 'ASAPIO API';

	documentationUrl = 'https://github.com/AsapioCompany/n8n-nodes-asapio#credentials';

	icon: ICredentialType['icon'] = { light: 'file:asapio.svg', dark: 'file:asapio.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'Signing Secret',
			name: 'signingSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Shared secret configured for this endpoint in the ASAPIO Integration Add-on (Event Studio n8n channel). Used to verify the HMAC-SHA256 signature of incoming events.',
		},
	];

	// This node only receives and verifies webhooks — the Signing Secret is
	// configured locally in Event Studio, so there is no ASAPIO API it could
	// be validated against, and the secret is never sent over the network.
	// This check only confirms ASAPIO's infrastructure is reachable from
	// this n8n instance.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://asapio.com',
			url: '/api/n8n/ping',
			method: 'GET',
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 200,
					message: 'Could not reach asapio.com. Check your network connection and try again.',
				},
			},
		],
	};
}
