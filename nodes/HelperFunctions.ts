import fetch from 'node-fetch';

const baseURL = 'https://rpc.qubic.org';

interface RPCStatus {
	lastProcessedTick: {
		epoch: number;
	};
	processedTickIntervalsPerEpoch: {
		epoch: number;
		intervals: {
			initialProcessedTick: number;
			lastProcessedTick: number;
		}[];
	}[];
}

interface TickRange {
	startTick: number;
	endTick: number;
}

export async function getRPCStatus(): Promise<RPCStatus> {
	const res = await fetch(`${baseURL}/v1/status`);
	const data = await res.json();

	return data as RPCStatus;
}

export async function getTicksForCurrentEpoch(): Promise<TickRange> {
	// Fetching RPC status
	const rpcStatus = await getRPCStatus();
	// Getting current epoch
	const currentEpoch = rpcStatus.lastProcessedTick.epoch;
	let startTick = 0;
	let endTick = 0;

	// Getting tick ranges for current epoch
	rpcStatus.processedTickIntervalsPerEpoch.forEach((epochIntervals) => {
		if (epochIntervals.epoch === currentEpoch) {
			epochIntervals.intervals.forEach((interval) => {
				if (startTick === 0) {
					startTick = interval.initialProcessedTick;
				}
				endTick = interval.lastProcessedTick;
			});
		}
	});

	return { startTick, endTick };
}
