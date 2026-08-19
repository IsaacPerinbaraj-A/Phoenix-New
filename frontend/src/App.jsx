import { useEffect, useState } from "react";
import { getHealth, submitCase } from "./api.js";
import AgentTrace from "./components/AgentTrace.jsx";
import Disclaimer from "./components/Disclaimer.jsx";
import PhotoUpload from "./components/PhotoUpload.jsx";
import Questionnaire from "./components/Questionnaire.jsx";
import ResultCard from "./components/ResultCard.jsx";

const EMPTY_QUESTIONNAIRE = {
  age: "",
  fitzpatrick: 3,
  duration_months: "",
  changed_recently: false,
  bleeding: false,
  itching: false,
  body_site: "arm",
  family_history_melanoma: false,
};

export default function App() {
  const [phase, setPhase] = useState("form"); // form | running | done | error
  const [imageFile, setImageFile] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(EMPTY_QUESTIONNAIRE);
  const [events, setEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  const validate = () => {
    const age = Number(questionnaire.age);
    const duration = Number(questionnaire.duration_months);
    if (!Number.isFinite(age) || age < 0 || age > 120)
      return "Please enter a valid age (0–120).";
    if (!Number.isFinite(duration) || duration < 0)
      return "Please enter how many months the lesion has been there.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setEvents([]);
    setResult(null);
    setPhase("running");

    try {
      await submitCase({
        imageFile,
        questionnaire: {
          ...questionnaire,
          age: Number(questionnaire.age),
          duration_months: Number(questionnaire.duration_months),
          fitzpatrick: Number(questionnaire.fitzpatrick),
        },
        language: "en",
        onEvent: (event) => {
          if (event.error) {
            setError(event.message || "Assessment failed.");
            setPhase("error");
            return;
          }
          if (event.done) {
            setResult(event.result);
            setPhase("done");
            return;
          }
          setEvents((prev) => [...prev, event]);
        },
      });
    } catch (err) {
      setError(err.message || "Could not reach the assessment service.");
      setPhase("error");
    }
  };

  const reset = () => {
    setPhase("form");
    setEvents([]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 px-4 py-4 text-white">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold">DermaTriage</h1>
          <p className="text-sm text-slate-300">
            Skin lesion triage support — tells you how soon to see a doctor,
            never what the disease is.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <Disclaimer />

        {health && !health.ollama && phase === "form" && (
          <p className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600">
            Note: the local explanation model is currently unavailable. Cases
            can still be assessed; they will be treated with extra caution.
          </p>
        )}

        {phase === "form" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <PhotoUpload file={imageFile} onChange={setImageFile} />
            <Questionnaire value={questionnaire} onChange={setQuestionnaire} />
            {error && (
              <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                Error: {error}
              </p>
            )}
            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-blue-600 px-4 py-3 text-lg font-bold text-white hover:bg-blue-700"
            >
              Assess this case
            </button>
          </form>
        )}

        {(phase === "running" || phase === "done") && (
          <AgentTrace events={events} running={phase === "running"} />
        )}

        {phase === "done" && result && (
          <>
            <ResultCard result={result} />
            <button
              type="button"
              onClick={reset}
              className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Start a new case
            </button>
          </>
        )}

        {phase === "error" && (
          <div className="space-y-4">
            <div role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
              <p className="font-bold text-red-800">The assessment could not be completed.</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <p className="mt-2 text-sm font-medium text-red-800">
                If you are concerned about this lesion, please see a clinician —
                do not wait for this tool.
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
          </div>
        )}
      </main>

      <footer className="px-4 py-6 text-center text-xs text-slate-500">
        Hackathon research prototype · Not a medical device · Not clinically
        validated
      </footer>
    </div>
  );
}
