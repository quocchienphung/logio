// Dot generation worker (reference: dotGeneration.worker, module 48343). Receives DotGenerationParams,
// posts DotData back with its buffers transferred.

import { type DotData, type DotGenerationParams, generateDots, transferables } from "./dots";

interface WorkerScope {
  onmessage: ((e: MessageEvent<DotGenerationParams>) => void) | null;
  postMessage(data: DotData, transfer: Transferable[]): void;
}

const scope = globalThis as unknown as WorkerScope;
scope.onmessage = (e) => {
  const data = generateDots(e.data);
  scope.postMessage(data, transferables(data));
};
