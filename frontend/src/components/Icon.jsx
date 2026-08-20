// Single inline-SVG icon set (Lucide-style: 24 viewBox, stroke 1.5,
// round caps). Usage: <Icon name="camera" size={16} className="..." />

const PATHS = {
  activity: [<path key="a" d="M22 12h-4l-3 8-6-16-3 8H2" />],
  "alert-triangle": [
    <path
      key="a"
      d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
    />,
    <path key="b" d="M12 9v4" />,
    <path key="c" d="M12 17h.01" />,
  ],
  "arrow-left": [<path key="a" d="M19 12H5" />, <path key="b" d="m12 19-7-7 7-7" />],
  "arrow-right": [<path key="a" d="M5 12h14" />, <path key="b" d="m12 5 7 7-7 7" />],
  camera: [
    <path
      key="a"
      d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5L14.5 4z"
    />,
    <circle key="b" cx="12" cy="13" r="3" />,
  ],
  check: [<path key="a" d="M20 6 9 17l-5-5" />],
  "chevron-down": [<path key="a" d="m6 9 6 6 6-6" />],
  "chevron-right": [<path key="a" d="m9 18 6-6-6-6" />],
  clipboard: [
    <rect key="a" x="8" y="2" width="8" height="4" rx="1" />,
    <path
      key="b"
      d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
    />,
  ],
  clock: [<circle key="a" cx="12" cy="12" r="9" />, <path key="b" d="M12 7v5l3 2" />],
  "corner-down-right": [
    <path key="a" d="M4 5v6a4 4 0 0 0 4 4h11" />,
    <path key="b" d="m15 10 5 5-5 5" />,
  ],
  eye: [
    <path key="a" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />,
    <circle key="b" cx="12" cy="12" r="3" />,
  ],
  "file-text": [
    <path key="a" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />,
    <path key="b" d="M14 2v6h6" />,
    <path key="c" d="M9 13h6" />,
    <path key="d" d="M9 17h6" />,
  ],
  focus: [
    <path key="a" d="M4 8V6a2 2 0 0 1 2-2h2" />,
    <path key="b" d="M16 4h2a2 2 0 0 1 2 2v2" />,
    <path key="c" d="M20 16v2a2 2 0 0 1-2 2h-2" />,
    <path key="d" d="M8 20H6a2 2 0 0 1-2-2v-2" />,
    <circle key="e" cx="12" cy="12" r="3" />,
  ],
  folder: [
    <path
      key="a"
      d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9L10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
    />,
  ],
  "help-circle": [
    <circle key="a" cx="12" cy="12" r="9" />,
    <path key="b" d="M9.6 9a2.5 2.5 0 0 1 4.85.6c0 1.6-2.45 2.1-2.45 3.4" />,
    <path key="c" d="M12 17h.01" />,
  ],
  image: [
    <rect key="a" x="3" y="5" width="18" height="14" rx="2" />,
    <circle key="b" cx="8.5" cy="10" r="1.5" />,
    <path key="c" d="m21 16-5-5-9 8" />,
  ],
  info: [
    <circle key="a" cx="12" cy="12" r="9" />,
    <path key="b" d="M12 11v5" />,
    <path key="c" d="M12 8h.01" />,
  ],
  loader: [<path key="a" d="M21 12a9 9 0 1 1-9-9" />],
  lock: [
    <rect key="a" x="4.5" y="10.5" width="15" height="10" rx="2" />,
    <path key="b" d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />,
  ],
  "log-out": [
    <path key="a" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />,
    <path key="b" d="m16 17 5-5-5-5" />,
    <path key="c" d="M21 12H9" />,
  ],
  "message-square": [
    <path key="a" d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  ],
  plus: [<path key="a" d="M12 5v14" />, <path key="b" d="M5 12h14" />],
  printer: [
    <path key="a" d="M6 9V3h12v6" />,
    <path key="b" d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />,
    <rect key="c" x="6" y="14" width="12" height="7" rx="1" />,
  ],
  shield: [
    <path key="a" d="M12 22s8-3.5 8-10V5.5L12 2.5l-8 3V12c0 6.5 8 10 8 10z" />,
  ],
  upload: [
    <path key="a" d="M12 15V3" />,
    <path key="b" d="m7 8 5-5 5 5" />,
    <path key="c" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  ],
  user: [
    <circle key="a" cx="12" cy="8" r="4" />,
    <path key="b" d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />,
  ],
  x: [<path key="a" d="M18 6 6 18" />, <path key="b" d="m6 6 12 12" />],
};

export default function Icon({ name, size = 16, className = "", strokeWidth = 1.5 }) {
  const paths = PATHS[name];
  if (!paths) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths}
    </svg>
  );
}
