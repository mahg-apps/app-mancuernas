// Íconos originales de trazo simple.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const base = (p: P) => ({
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const IconBody = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="4.5" r="2.2" />
    <path d="M6 9.5c2 .8 4 1.2 6 1.2s4-.4 6-1.2M12 10.7V15M9 21l1.4-6h3.2L15 21" />
  </svg>
);

export const IconList = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="7" height="7" rx="2" />
    <rect x="3" y="13" width="7" height="7" rx="2" />
    <path d="M13 6h8M13 9h5M13 15h8M13 18h5" />
  </svg>
);

export const IconRoutine = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h3M17 7h3M7 4.5v5M17 4.5v5M7 7h10" />
    <path d="M5 14h14M5 18h9" />
  </svg>
);

export const IconSettings = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

export const IconPlay = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
  </svg>
);

export const IconPause = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 5v14M16 5v14" strokeWidth={3} />
  </svg>
);

export const IconBack = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IconFlip = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9" />
    <path d="M20 4v5h-5" />
    <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15" />
    <path d="M4 20v-5h5" />
  </svg>
);

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconDumbbell = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 12h10" />
    <rect x="3" y="8" width="4" height="8" rx="1.5" />
    <rect x="17" y="8" width="4" height="8" rx="1.5" />
  </svg>
);
