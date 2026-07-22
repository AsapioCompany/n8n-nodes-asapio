import type { ICredentialType, INodeProperties } from 'n8n-workflow';

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
}
