import Icon from "./Icon.jsx";

export default function Disclaimer({ text }) {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-md border border-review-line bg-review-bg px-3.5 py-2.5 text-sm text-review-text"
    >
      <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
      <p className="font-medium">
        {text || "This is not a diagnosis. Only a doctor can tell you what it is."}
      </p>
    </div>
  );
}
