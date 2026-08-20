import { Link } from "react-router-dom";
import Disclaimer from "../components/Disclaimer.jsx";
import Icon from "../components/Icon.jsx";
import { BAND_META } from "../components/BandPill.jsx";

const AGENTS = [
  ["camera", "Ingestion", "Checks the photograph is sharp and well-lit before analysis."],
  ["focus", "Vision", "EfficientNet-B0 trained on HAM10000 estimates lesion class probabilities."],
  ["clipboard", "History", "An XGBoost model scores the eight-question patient history — works fully offline."],
  ["message-square", "Reasoning", "A local LLM writes a plain-language ABCDE explanation. Advisory only."],
  ["shield", "Safety Verifier", "Pure-Python deterministic rules make the final call — and can only escalate."],
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section
        className="border-b border-navy-line bg-navy px-4 py-20 text-white"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="section-label !text-navy-text">
              Multi-agent skin lesion triage support
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.15] tracking-tight sm:text-[44px]">
              Know how soon to see a doctor.
              <br />
              <span className="text-navy-text">Never guess what it is.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-navy-text">
              SkinSight helps community health workers turn one lesion
              photograph and eight quick questions into a clear urgency
              recommendation. Five AI agents analyse the case — and a
              deterministic safety engine, not the AI, always makes the final
              decision.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/assess" className="btn-primary">
                Start an assessment
                <Icon name="arrow-right" size={16} />
              </Link>
              <Link
                to="/register"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-navy-line px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-soft"
              >
                Create an account
              </Link>
            </div>
            <p className="mt-8 flex items-start gap-2 border-l-2 border-review-dot pl-3 text-[13px] leading-relaxed text-navy-text">
              <span>
                This is not a diagnosis. Only a doctor can tell you what it is.
                Every result routes the patient toward professional care.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Principle */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              The LLM explains. Deterministic rules decide.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Machine-learning models contribute evidence and explanations, but
              the final urgency band and the action instruction come only from
              auditable, pure-Python safety rules that can never lower urgency.
            </p>
          </div>
        </div>
      </section>

      {/* Five agents */}
      <section className="px-4 pb-14">
        <div className="mx-auto max-w-6xl">
          <p className="section-label mb-4">How a case flows through the five agents</p>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {AGENTS.map(([icon, name, blurb], i) => (
              <li key={name} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                    <Icon name={icon} size={16} />
                  </span>
                  <span className="num text-[11px] text-ink-faint">0{i + 1}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{name}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">{blurb}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bands */}
      <section className="px-4 pb-14">
        <div className="mx-auto max-w-6xl">
          <p className="section-label mb-4">Every case ends in exactly one urgency band</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(BAND_META).map(([key, m]) => (
              <div
                key={key}
                className={`rounded-lg border border-l-4 bg-white p-4 shadow-card ${m.line} ${m.accent}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${m.dot}`} />
                  <p className={`text-sm font-semibold ${m.text}`}>{m.label}</p>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest limitations */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-6xl space-y-3">
          <Disclaimer />
          <div className="card p-4">
            <p className="section-label">Honest limitations</p>
            <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-secondary">
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                Hackathon research prototype — not a medical device, not clinically validated.
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                The vision model is trained on dermatoscopic images; smartphone photos differ (documented domain gap).
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                Training data under-represents darker skin tones; image-independent safety rules mitigate but do not eliminate this.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
