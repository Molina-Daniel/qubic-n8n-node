import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class QubicTrigger implements ICredentialType {
	name = 'QubicTrigger';
	displayName = 'Qubic Trigger';
	documentationUrl =
		'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';
	properties: INodeProperties[] = [
		{
			displayName: 'Qubic RPC URL',
			name: 'rpcUrl',
			type: 'string',
			default: '',
		},
	];
}
