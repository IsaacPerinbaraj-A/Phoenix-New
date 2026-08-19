import { useEffect, useRef, useState } from "react";

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
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [qualityNote, setQualityNote] = useState(null);
  const [checking, setChecking] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  // Never leave the camera running when the component unmounts.
  useEffect(() => closeCamera, []);

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

  const openCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "The in-browser camera needs a secure connection (localhost or " +
          "HTTPS). Use “Upload a photo” instead — on a phone it opens the " +
          "camera app directly."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(
        "Camera unavailable or permission denied. Use “Upload a photo” " +
          "instead — on a phone it opens the camera app directly."
      );
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const f = new File([blob], "camera-capture.jpg", {
            type: "image/jpeg",
          });
          closeCamera();
          handleFile(f);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <section aria-labelledby="photo-heading" className="space-y-3">
      <h2 id="photo-heading" className="text-lg font-semibold text-slate-800">
        1. Lesion photograph <span className="font-normal text-slate-500">(optional but recommended)</span>
      </h2>

      <details className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-600">
          📋 Tips for a usable photo
        </summary>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
          <li>Use good daylight.</li>
          <li>Keep the lesion centred.</li>
          <li>Hold the phone steady to avoid blur.</li>
          <li>Photograph from roughly a consistent distance.</li>
        </ul>
        <p className="mt-1 text-xs text-slate-500">
          Following these tips helps, but does not guarantee the photo can be
          assessed.
        </p>
      </details>

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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={openCamera}
            className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-6 text-center font-medium text-blue-700 hover:border-blue-400 hover:bg-blue-100"
          >
            📷 Use camera
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-6 text-center font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600"
          >
            🖼️ Upload a photo
          </button>
        </div>
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
              onClick={openCamera}
              className="min-h-[44px] flex-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              📷 Retake
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => handleFile(null)}
              className="min-h-[44px] flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {cameraError && (
        <p className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
          {cameraError}
        </p>
      )}

      {/* Live camera modal */}
      {cameraOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-label="Camera"
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-h-[70vh] w-full max-w-2xl rounded-xl object-contain"
          />
          <div className="mt-4 flex w-full max-w-2xl gap-3">
            <button
              type="button"
              onClick={captureFrame}
              className="min-h-[52px] flex-1 rounded-xl bg-blue-600 px-4 py-3 text-lg font-bold text-white hover:bg-blue-700"
            >
              📸 Capture
            </button>
            <button
              type="button"
              onClick={closeCamera}
              className="min-h-[52px] flex-1 rounded-xl border border-slate-400 px-4 py-3 text-lg font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            Keep the lesion centred and hold steady.
          </p>
        </div>
      )}
    </section>
  );
}
