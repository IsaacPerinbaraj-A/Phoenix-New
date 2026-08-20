import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getHealth, submitCase } from "../api.js";
import { getUser } from "../auth.js";
import AgentTrace from "../components/AgentTrace.jsx";
import Disclaimer from "../components/Disclaimer.jsx";
import Icon from "../components/Icon.jsx";
import PhotoUpload from "../components/PhotoUpload.jsx";
import Questionnaire, { BODY_SITES } from "../components/Questionnaire.jsx";
import { clearLastRun, loadLastRun, saveLastRun } from "../lastRun.js";

function CaseSummary({ questionnaire, hasImage, phase, onReset }) {
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
    <div className="card p-4">
      <p className="section-label">Case being assessed</p>
      <dl className="mt-3 space-y-2 text-[13px]">
        {[
          ["Photograph", hasImage ? "Provided" : "None"],
          ["Age", `${questionnaire.age} years`],
          ["Duration", `${questionnaire.duration_months} months`],
          ["Body site", site],
          ["Skin type", `Fitzpatrick ${questionnaire.fitzpatrick}`],
        ].map(([dt, dd]) => (
          <div key={dt} className="flex justify-between gap-2 border-b border-line pb-2 last:border-0 last:pb-0">
            <dt className="text-ink-muted">{dt}</dt>
            <dd className="font-medium text-ink">{dd}</dd>
          </div>
        ))}
      </dl>
      {flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {flags.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 rounded-full border border-review-line bg-review-bg px-2 py-0.5 text-[11px] font-medium text-review-text"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-review-dot" />
              {f}
            </span>
          ))}
        </div>
      )}
      {phase === "running" ? (
        <p className="mt-4 flex items-center gap-2 text-[13px] font-medium text-brand-600">
          <Icon name="loader" size={14} className="animate-spin" />
          Assessing…
        </p>
      ) : (
        <button type="button" onClick={onReset} className="btn-outline mt-4 w-full">
          <Icon name="arrow-left" size={15} />
          Start a new case
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
  const [lastRun] = useState(loadLastRun);
  // phase: form | running | completed | error
  const [phase, setPhase] = useState(lastRun ? "completed" : "form");
  const [imageFile, setImageFile] = useState(null);
  const [hadImage, setHadImage] = useState(lastRun?.hadImage || false);
  const [caseId, setCaseId] = useState(lastRun?.caseId || null);
  const [photoLooksBlurry, setPhotoLooksBlurry] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(
    lastRun?.questionnaire || EMPTY_QUESTIONNAIRE
  );
  const [events, setEvents] = useState(lastRun?.events || []);
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
            // Persist the completed run so returning to this page shows
            // the finished pipeline instead of a blank form.
            const trace = eventsRef.current;
            saveLastRun({
              events: trace,
              questionnaire,
              hadImage: !!imageFile,
              caseId: event.case_id,
            });
            setHadImage(!!imageFile);
            setCaseId(event.case_id);
            setPhase("completed");
            // Let the completed pipeline be visible for a beat, then move
            // to the dedicated results page (the trace travels along).
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
    clearLastRun();
    setPhase("form");
    setEvents([]);
    eventsRef.current = [];
    setError(null);
    setImageFile(null);
    setHadImage(false);
    setCaseId(null);
    setQuestionnaire(EMPTY_QUESTIONNAIRE);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">New assessment</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            One photograph + eight questions → an urgency recommendation.
          </p>
        </div>
        {!user && (
          <p className="text-[13px] text-ink-muted">
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              Log in
            </Link>{" "}
            to save this case to your history.
          </p>
        )}
      </div>

      <Disclaimer />

      {health && !health.ollama && phase === "form" && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-line bg-white px-3.5 py-2.5 text-xs text-ink-secondary">
          <Icon name="info" size={14} className="mt-px shrink-0 text-ink-muted" />
          The local explanation model is currently unavailable. Cases can still
          be assessed; they will be treated with extra caution.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
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
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-urgent-line bg-urgent-bg px-3.5 py-2.5 text-[13px] font-medium text-urgent-text"
                >
                  <Icon name="alert-triangle" size={15} className="mt-px shrink-0" />
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary h-11 w-full text-[15px]">
                Assess this case
                <Icon name="arrow-right" size={16} />
              </button>
            </form>
          ) : (
            <CaseSummary
              questionnaire={questionnaire}
              hasImage={phase === "running" ? !!imageFile : hadImage}
              phase={phase}
              onReset={reset}
            />
          )}
        </div>

        {/* Right: live pipeline + result */}
        <div ref={pipelineRef} className="scroll-mt-20 space-y-4 lg:col-span-3">
          {phase === "form" && (
            <div className="hidden h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed border-line-strong lg:flex">
              <div className="text-center text-ink-faint">
                <Icon name="activity" size={24} className="mx-auto" />
                <p className="mt-2 text-sm font-medium">
                  The live agent pipeline and result will appear here.
                </p>
              </div>
            </div>
          )}

          {phase === "running" && (
            <>
              <AgentTrace events={events} running />
              <p className="text-center text-[13px] text-ink-muted">
                You'll be taken to the results page when the analysis
                completes.
              </p>
            </>
          )}

          {phase === "completed" && (
            <>
              {caseId && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ok-line border-l-4 border-l-ok-dot bg-ok-bg px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ok-text">
                    <Icon name="check" size={16} />
                    Analysis complete
                  </p>
                  <Link
                    to={`/cases/${caseId}`}
                    state={{ fromAssessment: true, events }}
                    className="btn-primary h-9 px-3 text-[13px]"
                  >
                    View full result
                    <Icon name="arrow-right" size={14} />
                  </Link>
                </div>
              )}
              <AgentTrace events={events} running={false} />
            </>
          )}

          {phase === "error" && (
            <div
              role="alert"
              className="rounded-lg border border-urgent-line border-l-4 border-l-urgent-dot bg-urgent-bg p-4"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-urgent-text">
                <Icon name="alert-triangle" size={16} />
                The assessment could not be completed.
              </p>
              <p className="mt-1 text-[13px] text-urgent-text/90">{error}</p>
              <p className="mt-2 text-[13px] font-medium text-urgent-text">
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
