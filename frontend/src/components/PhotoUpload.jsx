import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";

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
      <div>
        <h2 id="photo-heading" className="text-base font-semibold tracking-tight text-ink">
          Lesion photograph
        </h2>
        <p className="text-[13px] text-ink-muted">Optional but recommended</p>
      </div>

      <details className="card px-3.5 py-2.5">
        <summary className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink-secondary">
          <Icon name="info" size={14} className="text-ink-muted" />
          Tips for a usable photo
        </summary>
        <ul className="mt-2 space-y-1 pl-6 text-[13px] text-ink-secondary">
          <li className="list-disc">Use good daylight.</li>
          <li className="list-disc">Keep the lesion centred.</li>
          <li className="list-disc">Hold the phone steady to avoid blur.</li>
          <li className="list-disc">Photograph from roughly a consistent distance.</li>
        </ul>
        <p className="mt-1.5 pl-6 text-xs text-ink-muted">
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
            className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-white text-sm font-medium text-ink-secondary transition-colors duration-150 hover:border-brand-500 hover:text-brand-600"
          >
            <Icon name="camera" size={20} />
            Use camera
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-white text-sm font-medium text-ink-secondary transition-colors duration-150 hover:border-brand-500 hover:text-brand-600"
          >
            <Icon name="upload" size={20} />
            Upload a photo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <img
            src={previewUrl}
            alt="Preview of the uploaded lesion photograph"
            className="max-h-64 w-full rounded-lg border border-line object-contain"
          />
          {checking && (
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Icon name="loader" size={12} className="animate-spin" />
              Checking photo quality…
            </p>
          )}
          {qualityNote && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-review-line bg-review-bg px-3.5 py-2.5 text-[13px] text-review-text"
            >
              <Icon name="alert-triangle" size={15} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">
                  This photo will be rejected: {qualityNote}
                </p>
                <p className="mt-0.5">
                  The assessment would then use the answers only. Please retake
                  the photo — hold the phone steady in good light.
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={openCamera} className="btn-outline flex-1">
              <Icon name="camera" size={15} />
              Retake
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-outline flex-1"
            >
              <Icon name="image" size={15} />
              Replace
            </button>
            <button
              type="button"
              onClick={() => handleFile(null)}
              className="btn-danger-outline flex-1"
            >
              <Icon name="x" size={15} />
              Remove
            </button>
          </div>
        </div>
      )}

      {cameraError && (
        <p className="rounded-md border border-line bg-white px-3.5 py-2.5 text-[13px] text-ink-secondary">
          {cameraError}
        </p>
      )}

      {/* Live camera modal */}
      {cameraOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy/95 p-4"
          role="dialog"
          aria-label="Camera"
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-h-[70vh] w-full max-w-2xl rounded-lg object-contain"
          />
          <div className="mt-4 flex w-full max-w-2xl gap-2">
            <button
              type="button"
              onClick={captureFrame}
              className="btn-primary h-12 flex-1 text-base"
            >
              <Icon name="camera" size={18} />
              Capture
            </button>
            <button
              type="button"
              onClick={closeCamera}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-navy-line px-4 text-base font-medium text-white transition-colors duration-150 hover:bg-navy-soft"
            >
              Cancel
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-navy-text">
            Keep the lesion centred and hold steady.
          </p>
        </div>
      )}
    </section>
  );
}
