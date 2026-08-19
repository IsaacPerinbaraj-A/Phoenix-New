import { useRef, useState } from "react";

// Ask the backend to run the EXACT ingestion quality gate on the photo,
// so the early warning always matches what the pipeline will decide.
async function precheckPhoto(f) {
  const form = new FormData();
  form.append("image", f);
  const resp = await fetch("/api/assess/precheck", {
    method: "POST",
    body: form,
  });
  if (!resp.ok) return null;
  return resp.json();
}

export default function PhotoUpload({ file, onChange, onQualityWarning }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [qualityNote, setQualityNote] = useState(null);
  const [checking, setChecking] = useState(false);

  const handleFile = async (f) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setQualityNote(null);
    onQualityWarning?.(null);
    if (f) {
      setPreviewUrl(URL.createObjectURL(f));
      onChange(f);
      setChecking(true);
      try {
        const check = await precheckPhoto(f);
        if (check?.checked && check.image_ok === false) {
          setQualityNote(check.quality_note || "Photograph is not usable.");
          onQualityWarning?.(check.quality_note || "Photograph is not usable.");
        }
      } catch {
        // Precheck is best-effort; the pipeline gate still applies.
      } finally {
        setChecking(false);
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
          {checking && (
            <p className="text-xs text-slate-500">Checking photo quality…</p>
          )}
          {qualityNote && (
            <div
              role="alert"
              className="rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              <p className="font-bold">⚠️ This photo will be rejected: {qualityNote}</p>
              <p className="mt-0.5">
                The assessment would then use the answers only. Please retake
                the photo — hold the phone steady in good light.
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
