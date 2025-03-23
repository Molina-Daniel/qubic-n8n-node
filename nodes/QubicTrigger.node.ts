import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	NodeConnectionType,
} from 'n8n-workflow';
import { getTicksForCurrentEpoch } from './HelperFunctions';

// Store previous response outside the class as static data
let previousResponseData: any = null;

export class CityWeather implements INodeType {
	description: INodeTypeDescription = {
		// Basic node details will go here
		displayName: 'Qubic Entity Trigger',
		name: 'qubicTrigger',
		icon: 'file:qubic.svg',
		group: ['trigger'],
		version: 1,
		subtitle: 'Get data from Qubic RPC',
		description: 'Get data from Qubic RPC',
		defaults: {
			name: 'Qubic Entity Trigger',
		},
		inputs: [],
		outputs: ['main'] as unknown as NodeConnectionType[],
		polling: true,
		properties: [
			{
				displayName: 'Polling Interval',
				name: 'pollInterval',
				type: 'options',
				options: [
					{
						name: 'Every 15 Seconds',
						value: 15,
					},
					{
						name: 'Every 30 Seconds',
						value: 30,
					},
					{
						name: 'Every Minute',
						value: 60,
					},
					{
						name: 'Every 5 Minutes',
						value: 300,
					},
					{
						name: 'Every 15 Minutes',
						value: 900,
					},
				],
				default: 60,
				description: 'How often to poll for new transactions',
			},
			// Required parameters
			{
				displayName: 'Identity',
				name: 'identity',
				type: 'string',
				default: '',
				placeholder: 'Enter identity',
				extractValue: {
					type: 'regex',
					regex: '^[A-Z0-9]{60}$',
				},
				required: true,
				description: 'The identity of wallet',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const identity = this.getNodeParameter('identity') as string;
		const { startTick, endTick } = await getTicksForCurrentEpoch();

		try {
			const response = await this.helpers.request({
				method: 'GET',
				url: `https://rpc.qubic.org/v2/identities/${identity}/transfers?startTick=${startTick}&endTick=${endTick}&page=1&pageSize=10`,
			});

			const parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;

			// Compare with previous response
			const hasChanged = checkForChanges(parsedResponse);

			// Store the current response for future comparison
			previousResponseData = parsedResponse;

			// Return a boolean result indicating if there was a change
			const items: INodeExecutionData[] = [
				{
					json: { hasChanged },
				},
			];

			return [items];
		} catch (error) {
			if (this.getMode() === 'manual') {
				throw error;
			}
			return null;
		}
	}
}

/**
 * Compares the current response with the previous one to detect changes
 * @param currentResponse The new response data to compare
 * @returns boolean indicating whether there are changes
 */
function checkForChanges(currentResponse: any): boolean {
	// If there's no previous response, this is the first run
	if (previousResponseData === null) {
		return false; // No change detected on first run
	}

	// If the structure is different, consider it a change
	if (
		!Array.isArray(currentResponse.transactions) ||
		!Array.isArray(previousResponseData.transactions)
	) {
		return true;
	}

	try {
		// Extract transaction IDs from current response
		const currentTxIds = extractTransactionIds(currentResponse);
		// Extract transaction IDs from previous response
		const previousTxIds = extractTransactionIds(previousResponseData);
		// Check if there are any new transaction IDs
		for (const txId of currentTxIds) {
			if (!previousTxIds.includes(txId)) {
				return true; // Found a new transaction
			}
		}

		return false; // No new transactions found
	} catch (error) {
		console.error('Error comparing responses:', error);
		return true; // Consider it changed if comparison fails
	}
}

/**
 * Extracts all transaction IDs from the response
 * @param response The API response
 * @returns Array of transaction IDs
 */
function extractTransactionIds(response: any): string[] {
	const txIds: string[] = [];

	if (response && Array.isArray(response.transactions)) {
		for (const txGroup of response.transactions) {
			if (txGroup.transactions && Array.isArray(txGroup.transactions)) {
				for (const tx of txGroup.transactions) {
					if (tx.transaction && tx.transaction.txId) {
						txIds.push(tx.transaction.txId);
					}
				}
			}
		}
	}

	return txIds;
}
