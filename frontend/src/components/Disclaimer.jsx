export default function Disclaimer({ text }) {
  return (
    <div
      role="note"
      className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
    >
      ⚠️ {text || "This is not a diagnosis. Only a doctor can tell you what it is."}
    </div>
  );
}
