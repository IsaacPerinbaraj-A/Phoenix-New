import { useRef, useState } from "react";

export default function PhotoUpload({ file, onChange }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFile = (f) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f) {
      setPreviewUrl(URL.createObjectURL(f));
      onChange(f);
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
