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

function YesNo({ label, value, onChange }) {
  // value: true | false | null (null = not answered yet — answering is
  // required, so a worker cannot accidentally submit all-"No").
  const unanswered = value !== true && value !== false;
  return (
    <div
      className={`rounded-xl border-2 bg-white p-3 ${
        unanswered ? "border-slate-200" : "border-slate-300"
      }`}
    >
      <p className="text-sm font-medium text-slate-700">
        {label}
        {unanswered && (
          <span className="ml-1 align-middle text-xs font-normal text-slate-400">
            (choose one)
          </span>
        )}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label={label}>
        <button
          type="button"
          role="radio"
          aria-checked={value === true}
          onClick={() => onChange(true)}
          className={`min-h-[44px] rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
            value === true
              ? "border-red-500 bg-red-500 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === false}
          onClick={() => onChange(false)}
          className={`min-h-[44px] rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
            value === false
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

export default function Questionnaire({ value, onChange }) {
  const set = (field, v) => onChange({ ...value, [field]: v });

  return (
    <section aria-labelledby="questions-heading" className="space-y-4">
      <h2 id="questions-heading" className="text-lg font-semibold text-slate-800">
        2. Patient history <span className="font-normal text-slate-500">(8 quick questions)</span>
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-sm font-medium text-slate-700">Age (years)</span>
          <input
            type="number"
            min="0"
            max="120"
            required
            value={value.age}
            onChange={(e) => set("age", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-sm font-medium text-slate-700">
            How many months has it been there?
          </span>
          <input
            type="number"
            min="0"
            step="0.5"
            required
            value={value.duration_months}
            onChange={(e) => set("duration_months", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <fieldset className="rounded-lg border border-slate-200 bg-white p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">
          Skin type (Fitzpatrick 1–6)
        </legend>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Fitzpatrick skin type">
          {FITZPATRICK.map(([n, hex, desc]) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value.fitzpatrick === n}
              aria-label={desc}
              onClick={() => set("fitzpatrick", n)}
              className={`flex min-h-[44px] items-center gap-2 rounded-lg border p-2 text-left text-xs ${
                value.fitzpatrick === n
                  ? "border-blue-600 ring-2 ring-blue-300"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span
                aria-hidden="true"
                className="h-6 w-6 shrink-0 rounded-full border border-slate-400"
                style={{ backgroundColor: hex }}
              />
              <span className="text-slate-700">{desc}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block rounded-lg border border-slate-200 bg-white p-3">
        <span className="text-sm font-medium text-slate-700">Where on the body is it?</span>
        <select
          value={value.body_site}
          onChange={(e) => set("body_site", e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
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
