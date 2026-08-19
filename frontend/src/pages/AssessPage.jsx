import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHealth, submitCase } from "../api.js";
import { getUser } from "../auth.js";
import AgentTrace from "../components/AgentTrace.jsx";
import Disclaimer from "../components/Disclaimer.jsx";
import PhotoUpload from "../components/PhotoUpload.jsx";
import Questionnaire from "../components/Questionnaire.jsx";
import ResultCard from "../components/ResultCard.jsx";

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

export default function AssessPage() {
  const [phase, setPhase] = useState("form"); // form | running | done | error
  const [imageFile, setImageFile] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(EMPTY_QUESTIONNAIRE);
  const [events, setEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const user = getUser();

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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">New assessment</h1>
          <p className="text-sm text-slate-500">
            One photograph + eight questions → an urgency recommendation.
          </p>
        </div>
        {!user && (
          <p className="text-sm text-slate-500">
            <Link to="/login" className="font-semibold text-blue-600 hover:underline">
              Log in
            </Link>{" "}
            to save this case to your history.
          </p>
        )}
      </div>

      <Disclaimer />

      {health && !health.ollama && phase === "form" && (
        <p className="mt-4 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600">
          Note: the local explanation model is currently unavailable. Cases can
          still be assessed; they will be treated with extra caution.
        </p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-5">
        {/* Left: the case form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset disabled={phase === "running"} className="space-y-6">
              <PhotoUpload file={imageFile} onChange={setImageFile} />
              <Questionnaire value={questionnaire} onChange={setQuestionnaire} />
            </fieldset>

            {error && phase === "form" && (
              <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                Error: {error}
              </p>
            )}

            {phase === "form" && (
              <button
                type="submit"
                className="min-h-[48px] w-full rounded-xl bg-blue-600 px-4 py-3 text-lg font-bold text-white hover:bg-blue-700"
              >
                Assess this case
              </button>
            )}
            {(phase === "done" || phase === "error") && (
              <button
                type="button"
                onClick={reset}
                className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                Start a new case
              </button>
            )}
            {phase === "running" && (
              <p className="text-center text-sm font-medium text-slate-500">
                Assessing… watch the pipeline on the right.
              </p>
            )}
          </form>
        </div>

        {/* Right: live pipeline + result */}
        <div className="space-y-6 lg:col-span-3">
          {phase === "form" && (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-400">
              <div>
                <p className="text-4xl" aria-hidden="true">🩺</p>
                <p className="mt-2 font-medium">
                  The live agent pipeline and result will appear here.
                </p>
              </div>
            </div>
          )}

          {(phase === "running" || phase === "done") && (
            <AgentTrace events={events} running={phase === "running"} />
          )}

          {phase === "done" && result && <ResultCard result={result} />}

          {phase === "error" && (
            <div role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
              <p className="font-bold text-red-800">
                The assessment could not be completed.
              </p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <p className="mt-2 text-sm font-medium text-red-800">
                If you are concerned about this lesion, please see a clinician —
                do not wait for this tool.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
