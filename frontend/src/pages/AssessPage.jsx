import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getHealth, submitCase } from "../api.js";
import { getUser } from "../auth.js";
import AgentTrace from "../components/AgentTrace.jsx";
import Disclaimer from "../components/Disclaimer.jsx";
import PhotoUpload from "../components/PhotoUpload.jsx";
import Questionnaire, { BODY_SITES } from "../components/Questionnaire.jsx";

function CaseSummary({ questionnaire, imageFile, phase, onReset }) {
  const site =
    BODY_SITES.find(([v]) => v === questionnaire.body_site)?.[1] ||
    questionnaire.body_site;
  const flags = [
    questionnaire.changed_recently && "Changed recently",
    questionnaire.bleeding && "Bleeding",
    questionnaire.itching && "Itching",
    questionnaire.family_history_melanoma && "Family history of melanoma",
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Case being assessed
      </p>
      <dl className="mt-2 space-y-1 text-sm text-slate-700">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Photograph</dt>
          <dd className="font-medium">{imageFile ? "Provided" : "None"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Age</dt>
          <dd className="font-medium">{questionnaire.age} years</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Duration</dt>
          <dd className="font-medium">{questionnaire.duration_months} months</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Body site</dt>
          <dd className="font-medium">{site}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Skin type</dt>
          <dd className="font-medium">Fitzpatrick {questionnaire.fitzpatrick}</dd>
        </div>
      </dl>
      {flags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {flags.map((f) => (
            <span
              key={f}
              className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900"
            >
              {f}
            </span>
          ))}
        </div>
      )}
      {phase === "running" ? (
        <p className="mt-3 text-sm font-medium text-blue-600">
          <span className="animate-pulse">●</span> Assessing…
        </p>
      ) : (
        <button
          type="button"
          onClick={onReset}
          className="mt-3 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Start a new case
        </button>
      )}
    </div>
  );
}

const EMPTY_QUESTIONNAIRE = {
  age: "",
  fitzpatrick: 3,
  duration_months: "",
  // null = not answered yet; all four must be explicitly answered.
  changed_recently: null,
  bleeding: null,
  itching: null,
  body_site: "arm",
  family_history_melanoma: null,
};

const REQUIRED_ANSWERS = [
  ["changed_recently", "Has it changed recently?"],
  ["bleeding", "Does it bleed?"],
  ["itching", "Does it itch?"],
  ["family_history_melanoma", "Family history of melanoma?"],
];

export default function AssessPage() {
  const [phase, setPhase] = useState("form"); // form | running | error
  const [imageFile, setImageFile] = useState(null);
  const [photoLooksBlurry, setPhotoLooksBlurry] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(EMPTY_QUESTIONNAIRE);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const user = getUser();
  const navigate = useNavigate();
  const pipelineRef = useRef(null);
  const eventsRef = useRef([]);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  // On small screens the pipeline sits below the form: bring it into view
  // the moment an assessment starts so the user sees something happening.
  useEffect(() => {
    if (phase === "running" && window.matchMedia("(max-width: 1023px)").matches) {
      pipelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [phase]);

  const validate = () => {
    const age = Number(questionnaire.age);
    const duration = Number(questionnaire.duration_months);
    if (!Number.isFinite(age) || age < 0 || age > 120)
      return "Please enter a valid age (0–120).";
    if (!Number.isFinite(duration) || duration < 0)
      return "Please enter how many months the lesion has been there.";
    const missing = REQUIRED_ANSWERS.filter(
      ([field]) => typeof questionnaire[field] !== "boolean"
    );
    if (missing.length > 0)
      return `Please answer: ${missing.map(([, label]) => label).join(" · ")}`;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    // The server precheck rejected the photo: give the worker a real chance
    // to retake before running an answers-only assessment. Never a hard
    // block — a case must always be assessable even when a better photo is
    // impossible.
    if (imageFile && photoLooksBlurry) {
      const proceed = window.confirm(
        `The photo will be rejected: ${photoLooksBlurry}\n\n` +
          "OK — assess anyway (the result will use the answers only)\n" +
          "Cancel — go back and retake the photo"
      );
      if (!proceed) return;
    }
    setError(null);
    setEvents([]);
    eventsRef.current = [];
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
            // Let the completed pipeline be visible for a beat, then move
            // to the dedicated results page (the trace travels along).
            const trace = eventsRef.current;
            setTimeout(() => {
              navigate(`/cases/${event.case_id}`, {
                state: { fromAssessment: true, events: trace },
              });
            }, 900);
            return;
          }
          eventsRef.current = [...eventsRef.current, event];
          setEvents(eventsRef.current);
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
    eventsRef.current = [];
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
        {/* Left: the case form, replaced by a compact summary once running */}
        <div className="lg:col-span-2">
          {phase === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <PhotoUpload
                file={imageFile}
                onChange={setImageFile}
                onQualityWarning={setPhotoLooksBlurry}
              />
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
          ) : (
            <CaseSummary
              questionnaire={questionnaire}
              imageFile={imageFile}
              phase={phase}
              onReset={reset}
            />
          )}
        </div>

        {/* Right: live pipeline + result */}
        <div ref={pipelineRef} className="scroll-mt-20 space-y-6 lg:col-span-3">
          {phase === "form" && (
            <div className="hidden h-full min-h-[300px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-400 lg:flex">
              <div>
                <p className="text-4xl" aria-hidden="true">🩺</p>
                <p className="mt-2 font-medium">
                  The live agent pipeline and result will appear here.
                </p>
              </div>
            </div>
          )}

          {phase === "running" && (
            <>
              <AgentTrace events={events} running />
              <p className="text-center text-sm text-slate-500">
                You'll be taken to the results page when the analysis
                completes.
              </p>
            </>
          )}

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
