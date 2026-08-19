import { useRef, useState } from "react";

// Quick client-side sharpness estimate (variance of a 4-neighbour
// Laplacian on a downscaled grayscale copy). A heuristic warning only —
// the server-side ingestion agent remains the authoritative quality gate.
const CLIENT_BLUR_THRESHOLD = 25;

async function estimateSharpness(f) {
  const bitmap = await createImageBitmap(f);
  const width = 256;
  const height = Math.max(
    1,
    Math.round((bitmap.height / bitmap.width) * width)
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] =
      0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap =
        gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] -
        4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean; // variance
}

export default function PhotoUpload({ file, onChange, onQualityWarning }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [looksBlurry, setLooksBlurry] = useState(false);

  const handleFile = async (f) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setLooksBlurry(false);
    onQualityWarning?.(false);
    if (f) {
      setPreviewUrl(URL.createObjectURL(f));
      onChange(f);
      try {
        const sharpness = await estimateSharpness(f);
        const blurry = sharpness < CLIENT_BLUR_THRESHOLD;
        setLooksBlurry(blurry);
        onQualityWarning?.(blurry);
      } catch {
        // Estimation is best-effort; the server gate still applies.
      }
    } else {
      setPreviewUrl(null);
      onChange(null);
    }
  };

  return (
    <section aria-labelledby="photo-heading" className="space-y-3">
      <h2 id="photo-heading" className="text-lg font-semibold text-slate-800">
        1. Lesion photograph <span className="font-normal text-slate-500">(optional but recommended)</span>
      </h2>

      <ul className="list-disc pl-5 text-sm text-slate-600">
        <li>Use good daylight.</li>
        <li>Keep the lesion centred.</li>
        <li>Hold the phone steady to avoid blur.</li>
        <li>Photograph from roughly a consistent distance.</li>
      </ul>
      <p className="text-xs text-slate-500">
        Following these tips helps, but does not guarantee the photo can be assessed.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        id="photo-input"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-8 text-center text-slate-600 hover:border-blue-400 hover:text-blue-600"
        >
          📷 Take or choose a photo
        </button>
      ) : (
        <div className="space-y-2">
          <img
            src={previewUrl}
            alt="Preview of the uploaded lesion photograph"
            className="max-h-64 w-full rounded-xl border border-slate-200 object-contain"
          />
          {looksBlurry && (
            <div
              role="alert"
              className="rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              <p className="font-bold">⚠️ This photo looks blurry.</p>
              <p className="mt-0.5">
                It will likely be rejected and the assessment would then use
                the answers only. Please retake it — hold the phone steady in
                good light.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Replace photo
            </button>
            <button
              type="button"
              onClick={() => handleFile(null)}
              className="min-h-[44px] flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Remove photo
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
