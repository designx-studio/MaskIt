const { parentPort, workerData } = require('worker_threads');

try {
  const { pattern, flags, text, sab, port } = workerData;
  const targetPort = port || parentPort;
  const regex = new RegExp(pattern, flags || 'gi');
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[0]);
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }
  if (targetPort) {
    targetPort.postMessage({ matches, ok: true });
  }
  if (sab) {
    const int32 = new Int32Array(sab);
    Atomics.store(int32, 0, 1);
    Atomics.notify(int32, 0);
  }
} catch (err) {
  const targetPort = (workerData && workerData.port) || parentPort;
  if (targetPort) {
    targetPort.postMessage({ error: err.message, ok: false });
  }
  if (workerData && workerData.sab) {
    const int32 = new Int32Array(workerData.sab);
    Atomics.store(int32, 0, 1);
    Atomics.notify(int32, 0);
  }
}
