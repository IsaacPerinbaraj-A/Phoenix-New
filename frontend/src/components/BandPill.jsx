// Shared urgency-band metadata and pill components. Display only — bands
// are decided exclusively by the backend safety verifier.

export const BAND_META = {
  URGENT: {
    label: "URGENT",
    title: "Urgent",
    sub: "Needs professional assessment within 72 hours",
    icon: "alert-triangle",
    text: "text-urgent-text",
    bg: "bg-urgent-bg",
    line: "border-urgent-line",
    dot: "bg-urgent-dot",
    accent: "border-l-urgent-dot",
  },
  REVIEW: {
    label: "REVIEW",
    title: "Review",
    sub: "Professional examination within 2–4 weeks",
    icon: "clock",
    text: "text-review-text",
    bg: "bg-review-bg",
    line: "border-review-line",
    dot: "bg-review-dot",
    accent: "border-l-review-dot",
  },
  MONITOR: {
    label: "MONITOR",
    title: "Monitor",
    sub: "Low concern — re-photograph in 3 months",
    icon: "eye",
    text: "text-monitor-text",
    bg: "bg-monitor-bg",
    line: "border-monitor-line",
    dot: "bg-monitor-dot",
    accent: "border-l-monitor-dot",
  },
  INCONCLUSIVE: {
    label: "INCONCLUSIVE",
    title: "Inconclusive",
    sub: "Could not be assessed — see a clinician regardless",
    icon: "help-circle",
    text: "text-inconclusive-text",
    bg: "bg-inconclusive-bg",
    line: "border-inconclusive-line",
    dot: "bg-inconclusive-dot",
    accent: "border-l-inconclusive-dot",
  },
};

export function bandMeta(band) {
  return BAND_META[band] || BAND_META.INCONCLUSIVE;
}

export function BandPill({ band, className = "" }) {
  const m = bandMeta(band);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${m.bg} ${m.line} ${m.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

const STATUS_META = {
  pending: { text: "text-review-text", bg: "bg-review-bg", line: "border-review-line", dot: "bg-review-dot" },
  reviewed: { text: "text-brand-700", bg: "bg-brand-50", line: "border-brand-100", dot: "bg-brand-500" },
  referred: { text: "text-ok-text", bg: "bg-ok-bg", line: "border-ok-line", dot: "bg-ok-dot" },
  closed: { text: "text-ink-secondary", bg: "bg-inconclusive-bg", line: "border-inconclusive-line", dot: "bg-inconclusive-dot" },
};

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.pending;
}
