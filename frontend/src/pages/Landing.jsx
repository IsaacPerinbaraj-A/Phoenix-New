import { Link } from "react-router-dom";
import Disclaimer from "../components/Disclaimer.jsx";

const AGENTS = [
  ["📷", "Ingestion", "Checks the photograph is sharp and well-lit before analysis."],
  ["🔬", "Vision", "EfficientNet-B0 trained on HAM10000 estimates lesion class probabilities."],
  ["📋", "History", "An XGBoost model scores the eight-question patient history — works fully offline."],
  ["💬", "Reasoning", "A local LLM writes a plain-language ABCDE explanation. Advisory only."],
  ["🛡️", "Safety Verifier", "Pure-Python deterministic rules make the final call — and can only escalate."],
];

const BANDS = [
  ["🔴", "URGENT", "See a doctor within 72 hours", "border-red-400 bg-red-50"],
  ["🟠", "REVIEW", "Clinic review within 2–4 weeks", "border-orange-400 bg-orange-50"],
  ["🟡", "MONITOR", "Re-photograph in 3 months", "border-yellow-400 bg-yellow-50"],
  ["⚪", "INCONCLUSIVE", "See a clinician regardless", "border-slate-400 bg-slate-50"],
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-3 inline-block rounded-full border border-slate-600 px-3 py-1 text-xs font-medium uppercase tracking-wider text-slate-300">
              Multi-agent skin lesion triage support
            </p>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              Know <span className="text-blue-400">how soon</span> to see a
              doctor — never guess what it is.
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              DermaTriage helps community health workers turn one lesion
              photograph and eight quick questions into a clear urgency
              recommendation. Five AI agents analyse the case — and a
              deterministic safety engine, not the AI, always makes the final
              decision.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/assess"
                className="rounded-xl bg-blue-600 px-6 py-3 text-lg font-bold text-white shadow-lg hover:bg-blue-700"
              >
                Start an assessment →
              </Link>
              <Link
                to="/register"
                className="rounded-xl border border-slate-500 px-6 py-3 text-lg font-semibold text-slate-200 hover:bg-slate-700"
              >
                Create an account
              </Link>
            </div>
            <p className="mt-6 border-l-4 border-amber-400 pl-3 text-sm text-amber-200">
              ⚠️ This is not a diagnosis. Only a doctor can tell you what it
              is. Every result routes the patient toward professional care.
            </p>
          </div>
        </div>
      </section>

      {/* Principle */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-2xl font-bold text-slate-800">
            The LLM explains. Deterministic rules decide.
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-slate-600">
            Machine-learning models contribute evidence and explanations, but
            the final urgency band and the action instruction come only from
            auditable, pure-Python safety rules that can never lower urgency.
          </p>
        </div>
      </section>

      {/* Five agents */}
      <section className="px-4 pb-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-xl font-bold text-slate-800">
            How a case flows through the five agents
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AGENTS.map(([icon, name, blurb], i) => (
              <li
                key={name}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-3xl" aria-hidden="true">{icon}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Agent {i + 1}
                </p>
                <p className="font-bold text-slate-800">{name}</p>
                <p className="mt-1 text-sm text-slate-600">{blurb}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bands */}
      <section className="px-4 pb-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-xl font-bold text-slate-800">
            Every case ends in exactly one urgency band
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BANDS.map(([icon, band, action, style]) => (
              <div key={band} className={`rounded-2xl border-2 p-4 ${style}`}>
                <p className="text-2xl" aria-hidden="true">{icon}</p>
                <p className="mt-1 text-lg font-extrabold text-slate-800">{band}</p>
                <p className="text-sm text-slate-600">{action}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest limitations */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-6xl space-y-4">
          <Disclaimer />
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">Honest limitations</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Hackathon research prototype — not a medical device, not clinically validated.</li>
              <li>The vision model is trained on dermatoscopic images; smartphone photos differ (documented domain gap).</li>
              <li>Training data under-represents darker skin tones; image-independent safety rules mitigate but do not eliminate this.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
