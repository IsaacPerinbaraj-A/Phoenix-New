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
  const [qualityOk, setQualityOk] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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
    setQualityOk(false);
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
        } else if (check?.checked && check.image_ok === true) {
          setQualityOk(true);
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
          "HTTPS). Use “Upload photo” instead — on a phone it opens the " +
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
        "Camera unavailable or permission denied. Use “Upload photo” " +
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
        <h2 id="photo-heading" className="text-lg font-semibold tracking-tight text-ink">
          1. Lesion photograph
        </h2>
        <p className="text-sm text-ink-secondary">Optional but recommended</p>
      </div>

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
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f && f.type.startsWith("image/")) handleFile(f);
          }}
          className={`flex flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 ${
            dragOver
              ? "border-brand-500 bg-brand-50"
              : "border-line-strong bg-surface-card"
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon name="camera" size={22} />
          </span>
          <p className="mt-3 text-base font-semibold text-ink">Add a clear photo</p>
          <p className="mt-1 text-sm text-ink-secondary">
            Drag and drop, or choose an option below
          </p>
          <div className="mt-4 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-primary flex-1"
            >
              <Icon name="upload" size={16} />
              Upload photo
            </button>
            <button type="button" onClick={openCamera} className="btn-secondary flex-1">
              <Icon name="camera" size={16} />
              Use camera
            </button>
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            Good daylight · lesion centred · hold steady · consistent distance
          </p>
        </div>
      ) : (
        <div className="card space-y-3 p-4">
          <img
            src={previewUrl}
            alt="Preview of the uploaded lesion photograph"
            className="max-h-64 w-full rounded-xl border border-line object-contain"
          />
          {checking && (
            <p className="flex items-center gap-2 text-sm text-ink-secondary">
              <Icon name="loader" size={14} className="animate-spin" />
              Checking photo quality…
            </p>
          )}
          {qualityOk && !checking && (
            <p className="flex items-center gap-2 rounded-xl border border-ok-line bg-ok-bg px-3.5 py-2.5 text-sm font-semibold text-ok-text">
              <Icon name="check-circle" size={16} />
              Image checked — it can be used for assessment.
            </p>
          )}
          {qualityNote && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-review-line bg-review-bg px-3.5 py-3 text-sm text-review-text"
            >
              <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={openCamera} className="btn-secondary flex-1">
              <Icon name="camera" size={15} />
              Retake
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-secondary flex-1"
            >
              <Icon name="image" size={15} />
              Replace
            </button>
            <button
              type="button"
              onClick={() => handleFile(null)}
              className="btn-danger flex-1"
            >
              <Icon name="x" size={15} />
              Remove
            </button>
          </div>
        </div>
      )}

      {cameraError && (
        <p className="rounded-xl border border-line bg-surface-card px-3.5 py-2.5 text-sm text-ink-secondary">
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
            className="max-h-[70vh] w-full max-w-2xl rounded-card object-contain"
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
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/25 px-4 text-base font-semibold text-white transition-colors duration-150 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-white/60">
            Keep the lesion centred and hold steady.
          </p>
        </div>
      )}
    </section>
  );
}
