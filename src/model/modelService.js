import { TracelineInfer } from "./infer.js";

let inferInstance = null;
let modelMeta = null;
let initPromise = null;
let lastLatencyMs = 0;

export async function getOrt() {
  if (typeof window !== "undefined" && window.ort) {
    return window.ort;
  }
  try {
    const ort = await import("onnxruntime-web");
    if (ort?.env?.wasm) {
      ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
      ort.env.wasm.numThreads = 1;
    }
    return ort;
  } catch (err) {
    console.warn("Falling back to CDN onnxruntime-web:", err);
    const ort = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort.min.mjs");
    if (ort?.env?.wasm) {
      ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
      ort.env.wasm.numThreads = 1;
    }
    return ort;
  }
}

export async function initTracelineModel() {
  if (inferInstance) return inferInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const ort = await getOrt();
      const metaRes = await fetch("/model_meta.json");
      if (!metaRes.ok) throw new Error(`Failed to load model_meta.json: ${metaRes.statusText}`);
      modelMeta = await metaRes.json();

      const modelRes = await fetch("/model.onnx");
      if (!modelRes.ok) throw new Error(`Failed to load model.onnx: ${modelRes.statusText}`);
      const modelBytes = new Uint8Array(await modelRes.arrayBuffer());

      const t0 = performance.now();
      inferInstance = await TracelineInfer.create({
        ort,
        meta: modelMeta,
        modelBytes,
        sessionOptions: { executionProviders: ["wasm", "cpu"] }
      });
      lastLatencyMs = performance.now() - t0;
      console.log(`Traceline ONNX Model loaded in ${lastLatencyMs.toFixed(1)}ms`);
      return inferInstance;
    } catch (e) {
      console.error("Error initializing Traceline ONNX Model:", e);
      initPromise = null;
      throw e;
    }
  })();

  return initPromise;
}

export function resetTracelineModel() {
  if (inferInstance) {
    inferInstance.reset();
  }
}

export async function runTracelineStep({ anchors, dt_s = 0.5, venue = { width_m: 40, height_m: 24 } }) {
  const instance = await initTracelineModel();
  const t0 = performance.now();
  const out = await instance.step({ anchors, dt_s, venue });
  lastLatencyMs = performance.now() - t0;
  return { ...out, latency_ms: lastLatencyMs };
}

export async function runBrowserBenchmark(onProgress) {
  const ort = await getOrt();
  const metaRes = await fetch("/model_meta.json");
  const meta = await metaRes.json();
  const modelRes = await fetch("/model.onnx");
  const bytes = await modelRes.arrayBuffer();

  const t0 = performance.now();
  const t = await TracelineInfer.create({
    ort,
    meta,
    modelBytes: new Uint8Array(bytes),
    sessionOptions: { executionProviders: ["wasm"] }
  });
  const coldMs = performance.now() - t0;

  const testAnchors = Array.from({ length: 6 }, (_, i) => ({
    anchor_id: i,
    x_m: 5 + 6 * i,
    y_m: 3 + 3 * (i % 3),
    range_m: 8 + 1.5 * i,
    rssi_dbm: -60 - i
  }));

  // Warmup
  for (let i = 0; i < 20; i++) {
    await t.step({ anchors: testAnchors, dt_s: 0.5, venue: { width_m: 40, height_m: 24 } });
  }

  const latencies = [];
  t.reset();
  const totalSteps = 200;
  for (let i = 0; i < totalSteps; i++) {
    const s = performance.now();
    await t.step({ anchors: testAnchors, dt_s: 0.5, venue: { width_m: 40, height_m: 24 } });
    latencies.push(performance.now() - s);
    if (onProgress && i % 40 === 0) {
      onProgress(Math.round(((i + 1) / totalSteps) * 100));
    }
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const max = latencies[latencies.length - 1];

  return {
    environment: typeof navigator !== "undefined" ? navigator.userAgent : "Node",
    modelSizeBytes: bytes.byteLength,
    coldLoadMs: coldMs,
    p50Ms: p50,
    p95Ms: p95,
    maxMs: max,
    steps: totalSteps,
    targets: {
      median_ms: 50,
      p95_ms: 100,
      size_bytes: 15 * 1024 * 1024
    },
    meetsTargets: p50 <= 50 && p95 <= 100 && bytes.byteLength <= 15 * 1024 * 1024
  };
}
