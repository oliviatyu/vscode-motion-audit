export const BENCHMARK_VERSION = 2;

export function median(values) {
	if (!values.length || values.some(value => !Number.isFinite(value))) {
		throw new Error('Measurements must contain finite numbers.');
	}
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizePairs(pairs, metric) {
	const deltas = pairs.map(pair => pair.active[metric] - pair.baseline[metric]);
	return {
		active: median(pairs.map(pair => pair.active[metric])),
		baseline: median(pairs.map(pair => pair.baseline[metric])),
		delta: median(deltas),
		range: [Math.min(...deltas), Math.max(...deltas)]
	};
}

export function cpuAssessment(summary) {
	if (summary.range[0] >= 5) {
		return 'High';
	}
	if (summary.range[0] >= 1) {
		return 'Moderate';
	}
	if (summary.range[1] < 1 && summary.range[0] > -1) {
		return 'Low';
	}
	return 'Inconclusive';
}

export function extractFixtures(source) {
	const productionBlock = source.match(/const productionLibraryItems = \[([\s\S]*?)\n\]\.map/);
	const explorerBlock = source.match(/const animatedComponentExplorerFixtures = \[([\s\S]*?)\n\];/);
	if (!productionBlock || !explorerBlock) {
		throw new Error('Could not find Library fixture definitions in app.js.');
	}
	return [...new Set([
		...[...productionBlock[1].matchAll(/\bfixture:\s*'([^']+)'/g)].map(match => match[1]),
		...[...explorerBlock[1].matchAll(/'([^']+)'/g)].map(match => match[1])
	])];
}

export function requiresBrowserRestart(error) {
	return /timed out|DevTools connection closed|context.*destroyed|cannot find context|insufficient samples/i.test(error.message);
}

export function extractLightOnlyFixtures(source) {
	const block = source.match(/const lightOnlyLibraryFixtures = new Set\(\[([\s\S]*?)\n\]\);/);
	if (!block) {
		throw new Error('Could not find Library theme overrides in app.js.');
	}
	return new Set([...block[1].matchAll(/'([^']+)'/g)].map(match => match[1]));
}

export function canResumeRun(previous, current) {
	return previous?.benchmarkVersion === BENCHMARK_VERSION &&
		['metric', 'control', 'runs', 'measurementSecondsPerCondition'].every(key => previous.method?.[key] === current.method[key]) &&
		['browser', 'platform', 'architecture'].every(key => previous.environment?.[key] === current.environment[key]);
}

export function isReusableResult(result, runs) {
	return result?.benchmarkVersion === BENCHMARK_VERSION && result.status === 'fixture-screened' &&
		Array.isArray(result.pairs) && result.pairs.length === runs && result.pairs.every(({ active, baseline }) =>
			active?.verification?.disabled === false && baseline?.verification?.disabled === true &&
			active.verification.visible === true && baseline.verification.visible === true &&
			active.verification.stateHash && active.verification.stateHash === baseline.verification.stateHash &&
			(active.verification.cssAnimations > 0 || active.verification.drawUpdates > 0) &&
			baseline.verification.cssAnimations === 0 && baseline.verification.drawUpdates === 0 && baseline.verification.mutations === 0 &&
			[active, baseline].every(sample => sample.frameCount >= 30 && sample.inputCount >= 3 &&
				['rendererCpuUtilization', 'frameP95Ms', 'inputDelayP95Ms', 'clickToFrameP95Ms'].every(key => Number.isFinite(sample[key])))
		);
}

export class CdpClient {
	constructor(url) {
		this.socket = new WebSocket(url);
		this.nextId = 1;
		this.pending = new Map();
		this.listeners = new Map();
		this.ready = new Promise((resolve, reject) => {
			this.socket.addEventListener('open', resolve, { once: true });
			this.socket.addEventListener('error', reject, { once: true });
		});
		this.socket.addEventListener('message', event => {
			const message = JSON.parse(event.data);
			if (!message.id) {
				this.listeners.get(message.method)?.(message.params);
				return;
			}
			const pending = this.pending.get(message.id);
			if (!pending) {
				return;
			}
			this.pending.delete(message.id);
			clearTimeout(pending.timeout);
			if (message.error) {
				pending.reject(new Error(message.error.message));
			} else {
				pending.resolve(message.result);
			}
		});
		this.socket.addEventListener('close', () => {
			for (const pending of this.pending.values()) {
				clearTimeout(pending.timeout);
				pending.reject(new Error('Chrome DevTools connection closed.'));
			}
			this.pending.clear();
		});
	}

	async send(method, params = {}, timeoutMilliseconds = 30000) {
		await this.ready;
		const id = this.nextId++;
		const response = new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`${method} timed out after ${timeoutMilliseconds} ms`));
			}, timeoutMilliseconds);
			this.pending.set(id, { resolve, reject, timeout });
		});
		this.socket.send(JSON.stringify({ id, method, params }));
		return response;
	}

	async evaluate(expression) {
		const response = await this.send('Runtime.evaluate', {
			expression, returnByValue: true, awaitPromise: true,
			...(this.contextId ? { contextId: this.contextId } : {})
		});
		if (response.exceptionDetails) {
			throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
		}
		return response.result.value;
	}

	close() {
		this.socket.close();
	}
}

export const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
