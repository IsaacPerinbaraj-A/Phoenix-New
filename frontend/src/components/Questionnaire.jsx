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

function YesNo({ label, value, onChange }) {
  // value: true | false | null (null = not answered yet — answering is
  // required, so a worker cannot accidentally submit all-"No").
  const unanswered = value !== true && value !== false;
  return (
    <div className="card p-3.5">
      <p className="text-[13px] font-medium leading-snug text-ink">
        {label}
        {unanswered && (
          <span className="ml-1.5 text-xs font-normal text-ink-faint">(choose one)</span>
        )}
      </p>
      <div
        className="mt-2.5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line-strong bg-line-strong"
        role="radiogroup"
        aria-label={label}
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === true}
          onClick={() => onChange(true)}
          className={`flex h-10 items-center justify-center gap-1.5 text-sm font-medium transition-colors duration-150 ${
            value === true
              ? "bg-urgent-bg text-urgent-text"
              : "bg-white text-ink-secondary hover:bg-stone-50"
          }`}
        >
          {value === true && <span className="h-1.5 w-1.5 rounded-full bg-urgent-dot" />}
          Yes
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === false}
          onClick={() => onChange(false)}
          className={`flex h-10 items-center justify-center gap-1.5 text-sm font-medium transition-colors duration-150 ${
            value === false
              ? "bg-ok-bg text-ok-text"
              : "bg-white text-ink-secondary hover:bg-stone-50"
          }`}
        >
          {value === false && <span className="h-1.5 w-1.5 rounded-full bg-ok-dot" />}
          No
        </button>
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
        <h2 id="questions-heading" className="text-base font-semibold tracking-tight text-ink">
          Patient history
        </h2>
        <p className="text-[13px] text-ink-muted">Eight quick questions</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Age (years)</span>
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
          <span className="mb-1.5 block text-[13px] font-medium text-ink">
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
        <p className="mb-1.5 text-[13px] font-medium text-ink">Skin type (Fitzpatrick 1–6)</p>
        <div
          className="grid grid-cols-6 gap-px overflow-hidden rounded-md border border-line-strong bg-line-strong"
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
              className={`flex h-12 flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                value.fitzpatrick === n
                  ? "bg-brand-50 ring-1 ring-inset ring-brand-500"
                  : "bg-white hover:bg-stone-50"
              }`}
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border border-black/10"
                style={{ backgroundColor: hex }}
              />
              <span
                className={`text-[11px] font-semibold ${
                  value.fitzpatrick === n ? "text-brand-700" : "text-ink-muted"
                }`}
              >
                {ROMAN[n - 1]}
              </span>
            </button>
          ))}
        </div>
        {selectedFitz && (
          <p className="mt-1.5 text-xs text-ink-muted">{selectedFitz[2]}</p>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">
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
