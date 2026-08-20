import Icon from "./Icon.jsx";

export const BODY_SITES = [
  ["head_neck", "Head / neck"],
  ["face", "Face"],
  ["trunk", "Chest / stomach"],
  ["back", "Back"],
  ["arm", "Arm"],
  ["hand", "Hand"],
  ["leg", "Leg"],
  ["foot", "Foot"],
  ["palm_sole", "Palm / sole"],
  ["nail", "Nail"],
  ["genital", "Genital area"],
  ["other", "Other"],
];

// Fitzpatrick swatches: colour is illustrative only — the numeric type and
// description always accompany it (never colour alone).
const FITZPATRICK = [
  [1, "#f5d5c0", "Type 1 — always burns, never tans"],
  [2, "#eec1a8", "Type 2 — usually burns, tans lightly"],
  [3, "#d9a986", "Type 3 — sometimes burns, tans"],
  [4, "#b97d56", "Type 4 — rarely burns, tans easily"],
  [5, "#8d5a3b", "Type 5 — very rarely burns, deep tan"],
  [6, "#5b3a26", "Type 6 — never burns, deeply pigmented"],
];

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

function AnswerCard({ selected, tone, onClick, children, ariaChecked }) {
  const toneStyles =
    tone === "yes"
      ? "border-urgent-line bg-urgent-bg text-urgent-text"
      : "border-ok-line bg-ok-bg text-ok-text";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ariaChecked}
      onClick={onClick}
      className={`relative flex h-14 items-center justify-center rounded-xl border-2 text-base font-bold transition-colors duration-150 ${
        selected
          ? toneStyles
          : "border-line bg-surface-card text-ink-secondary hover:border-line-strong hover:bg-surface-muted"
      }`}
    >
      {selected && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2">
          <Icon name="check" size={16} strokeWidth={2.2} />
        </span>
      )}
      {children}
    </button>
  );
}

function YesNo({ label, value, onChange }) {
  // value: true | false | null (null = not answered yet — answering is
  // required, so a worker cannot accidentally submit all-"No").
  const unanswered = value !== true && value !== false;
  return (
    <div className="card p-4">
      <p className="text-[15px] font-semibold leading-snug text-ink">
        {label}
        {unanswered && (
          <span className="ml-1.5 text-[13px] font-normal text-ink-muted">
            (choose one)
          </span>
        )}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={label}>
        <AnswerCard
          selected={value === true}
          ariaChecked={value === true}
          tone="yes"
          onClick={() => onChange(true)}
        >
          Yes
        </AnswerCard>
        <AnswerCard
          selected={value === false}
          ariaChecked={value === false}
          tone="no"
          onClick={() => onChange(false)}
        >
          No
        </AnswerCard>
      </div>
    </div>
  );
}

export default function Questionnaire({ value, onChange }) {
  const set = (field, v) => onChange({ ...value, [field]: v });
  const selectedFitz = FITZPATRICK.find(([n]) => n === value.fitzpatrick);

  return (
    <section aria-labelledby="questions-heading" className="space-y-4">
      <div>
        <h2 id="questions-heading" className="text-lg font-semibold tracking-tight text-ink">
          2. Patient history
        </h2>
        <p className="text-sm text-ink-secondary">Eight quick questions</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Age (years)</span>
          <input
            type="number"
            min="0"
            max="120"
            required
            value={value.age}
            onChange={(e) => set("age", e.target.value)}
            className="input"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            How many months has it been there?
          </span>
          <input
            type="number"
            min="0"
            step="0.5"
            required
            value={value.duration_months}
            onChange={(e) => set("duration_months", e.target.value)}
            className="input"
          />
        </label>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink">Skin type (Fitzpatrick 1–6)</p>
        <div
          className="grid grid-cols-6 gap-1.5"
          role="radiogroup"
          aria-label="Fitzpatrick skin type"
        >
          {FITZPATRICK.map(([n, hex, desc]) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value.fitzpatrick === n}
              aria-label={desc}
              onClick={() => set("fitzpatrick", n)}
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-xl border-2 transition-colors duration-150 ${
                value.fitzpatrick === n
                  ? "border-brand-600 bg-brand-50"
                  : "border-line bg-surface-card hover:border-line-strong"
              }`}
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border border-black/10"
                style={{ backgroundColor: hex }}
              />
              <span
                className={`text-xs font-bold ${
                  value.fitzpatrick === n ? "text-brand-700" : "text-ink-muted"
                }`}
              >
                {ROMAN[n - 1]}
              </span>
            </button>
          ))}
        </div>
        {selectedFitz && (
          <p className="mt-1.5 text-[13px] text-ink-secondary">{selectedFitz[2]}</p>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          Where on the body is it?
        </span>
        <select
          value={value.body_site}
          onChange={(e) => set("body_site", e.target.value)}
          className="input"
        >
          {BODY_SITES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <YesNo
          label="Has it changed recently (size, shape, colour)?"
          value={value.changed_recently}
          onChange={(v) => set("changed_recently", v)}
        />
        <YesNo
          label="Does it bleed?"
          value={value.bleeding}
          onChange={(v) => set("bleeding", v)}
        />
        <YesNo
          label="Does it itch?"
          value={value.itching}
          onChange={(v) => set("itching", v)}
        />
        <YesNo
          label="Has anyone in the family had melanoma (serious skin cancer)?"
          value={value.family_history_melanoma}
          onChange={(v) => set("family_history_melanoma", v)}
        />
      </div>
    </section>
  );
}
