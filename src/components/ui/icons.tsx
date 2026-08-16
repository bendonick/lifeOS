// Minimal stroke icons (no emoji in chrome — docs/02-design-system.md).

function Svg({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 ${className}`}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function GraduationCapIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M22 9.5 12 4.5 2 9.5l10 5 10-5z" />
      <path d="M6 12v4.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V12" />
      <path d="M22 9.5V15" />
    </Svg>
  );
}

export function HeartIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M20.8 5.6a5 5 0 0 0-7.1 0l-1.7 1.7-1.7-1.7a5 5 0 0 0-7.1 7.1l1.7 1.7 7.1 7 7.1-7 1.7-1.7a5 5 0 0 0 0-7.1z" />
    </Svg>
  );
}

export function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="2.5" y="7" width="19" height="13.5" rx="2" />
      <path d="M8.5 7V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V7" />
    </Svg>
  );
}
