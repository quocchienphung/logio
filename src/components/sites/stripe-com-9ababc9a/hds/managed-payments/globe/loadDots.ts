// Land-mask decode + dot generation (reference GlobeRenderer.startImagePreload / generateDotsAsync).
// The mask is drawn to a 2D canvas, then the dots are generated in a worker; if the worker cannot be
// created or errors, generation falls back to the main thread (as the reference does).

import { DOT_DEFAULTS, type DotData, type DotGenerationParams, generateDots } from "./dots";

function loadImageData(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      // Read back once: a CPU-backed canvas avoids a GPU readback stall.
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("2d context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => reject(new Error(`land mask failed to load: ${url}`));
    img.src = url;
  });
}

function generateInWorker(params: DotGenerationParams): Promise<DotData> {
  if (typeof Worker === "undefined") return Promise.resolve(generateDots(params));
  try {
    const worker = new Worker(new URL("./dots.worker.ts", import.meta.url));
    return new Promise((resolve) => {
      worker.onmessage = (e: MessageEvent<DotData>) => {
        worker.terminate();
        resolve(e.data);
      };
      worker.onerror = () => {
        worker.terminate();
        resolve(generateDots(params));
      };
      worker.postMessage(params);
    });
  } catch {
    return Promise.resolve(generateDots(params));
  }
}

export async function loadDots(url: string, dotCount: number): Promise<DotData> {
  const img = await loadImageData(url);
  return generateInWorker({ imageWidth: img.width, imageHeight: img.height, imageData: img.data, dotCount, ...DOT_DEFAULTS });
}
