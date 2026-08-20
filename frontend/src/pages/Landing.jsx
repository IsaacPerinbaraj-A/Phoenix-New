import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";

const FLOW_STEPS = ["Photo / Symptoms", "AI Assessment", "Safety Review", "Recommended Step"];

const STEPS = [
  ["01", "Share information", "Upload a photo and answer eight quick questions about the lesion."],
  ["02", "Review signals", "SkinSight processes image and questionnaire signals through five agents."],
  ["03", "See the next step", "Receive an urgency recommendation with supporting information."],
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-surface-card px-4 py-16 lg:py-20">
        <div className="mx-auto grid max-w-shell items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Skin lesion triage support</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.12] tracking-tight text-navy sm:text-5xl">
              Understand your skin concern with structured guidance.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-secondary">
              SkinSight helps organise image and symptom information to support
              appropriate next steps. Five AI agents analyse each case — and a
              deterministic safety engine, not the AI, always makes the final
              decision.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/assess" className="btn-primary">
                Start an assessment
                <Icon name="arrow-right" size={16} />
              </Link>
              <a href="#how-it-works" className="btn-secondary">
                View how it works
              </a>
            </div>
            <p className="mt-8 flex items-start gap-2 text-sm text-ink-secondary">
              <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0 text-review-dot" />
              <span>
                <strong className="font-semibold text-ink">This is not a diagnosis.</strong>{" "}
                Only a doctor can tell you what it is.
              </span>
            </p>
          </div>

          {/* Analysis flow card */}
          <div className="mx-auto w-full max-w-sm">
            <div className="card rounded-hero p-6 shadow-raised">
              <p className="eyebrow text-center">Analysis flow</p>
              <div className="mt-5 space-y-0">
                {FLOW_STEPS.map((step, i) => (
                  <div key={step}>
                    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-bg px-4 py-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          i === FLOW_STEPS.length - 1
                            ? "bg-brand-600 text-white"
                            : "bg-brand-100 text-brand-700"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-ink">{step}</span>
                    </div>
                    {i < FLOW_STEPS.length - 1 && (
                      <div className="mx-auto h-4 w-px bg-line-strong" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three-step explanation */}
      <section id="how-it-works" className="scroll-mt-20 px-4 py-16">
        <div className="mx-auto max-w-shell">
          <h2 className="text-center text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            How it works
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map(([n, title, blurb]) => (
              <div key={n} className="card p-6">
                <span className="num text-sm font-bold text-brand-600">{n}</span>
                <p className="mt-3 text-lg font-semibold text-ink">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principle */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-shell">
          <div className="card rounded-hero bg-surface-card p-8 text-center">
            <h2 className="text-xl font-bold tracking-tight text-navy">
              The LLM explains. Deterministic rules decide.
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
              Machine-learning models contribute evidence and explanations, but
              the final urgency band and the action instruction come only from
              auditable, pure-Python safety rules that can never lower urgency.
            </p>
          </div>
        </div>
      </section>

      {/* Safety section */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-shell">
          <div className="flex items-start gap-3 rounded-card border border-review-line bg-review-bg p-6">
            <Icon name="info" size={18} className="mt-0.5 shrink-0 text-review-text" />
            <div>
              <p className="text-base font-semibold text-review-text">Important</p>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-review-text/90">
                SkinSight is a prototype and not a medical device. It provides
                advisory support, not a diagnosis. The vision model is trained
                on dermatoscopic images and its training data under-represents
                darker skin tones; every result routes the patient toward
                professional care, never away from it.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
