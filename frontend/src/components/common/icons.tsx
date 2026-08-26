import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function svgProps(props: IconProps): IconProps {
  return {
    viewBox: "0 0 24 24",
    width: 18,
    height: 18,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props,
  };
}

export function IconDashboard(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconHospital(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 21V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15" />
      <path d="M16 9h3a1 1 0 0 1 1 1v11" />
      <path d="M12 7v4M10 9h4" />
      <path d="M2 21h20" />
      <path d="M8 12h2M8 16h2" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 15.2c2.3.3 3.7 1.9 4.2 4.3" />
    </svg>
  );
}

export function IconPulse(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <polyline points="3 13 7 13 10 6 14 19 17 11 21 11" />
    </svg>
  );
}

export function IconDrop(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 3.5c3.3 3.8 5.8 6.4 5.8 9.5a5.8 5.8 0 1 1-11.6 0c0-3.1 2.5-5.7 5.8-9.5z" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="21.5" y2="12" />
      <line x1="5.3" y1="5.3" x2="7" y2="7" />
      <line x1="17" y1="17" x2="18.7" y2="18.7" />
      <line x1="5.3" y1="18.7" x2="7" y2="17" />
      <line x1="17" y1="7" x2="18.7" y2="5.3" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 4 21 19H3z" />
      <line x1="12" y1="10" x2="12" y2="14.5" />
      <line x1="12" y1="16.8" x2="12" y2="16.9" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M21 12a9 9 0 1 1-3.2-6.9" />
      <polyline points="21 3 21 9 15 9" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <polyline points="15 6 9 12 15 18" />
    </svg>
  );
}

export function IconBed(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 6v12" />
      <path d="M3 13h12a4 4 0 0 1 4 4v1" />
      <circle cx="7.5" cy="10" r="1.6" />
      <path d="M11 13v-2.5h6A4 4 0 0 1 21 14.5V15" />
    </svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 20.2C6.6 16 3.5 13 3.5 9.4 3.5 6.7 5.6 5 7.9 5c1.6 0 3.1.8 4.1 2.3C13 5.8 14.5 5 16.1 5c2.3 0 4.4 1.7 4.4 4.4 0 3.6-3.1 6.6-8.5 10.8z" />
    </svg>
  );
}

export function IconPin(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 21s-6.5-5.4-6.5-11a6.5 6.5 0 1 1 13 0c0 5.6-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export function IconWind(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 8h8.5a2.5 2.5 0 1 0-2.4-3.2" />
      <path d="M3 12h13a3 3 0 1 1-2.8 4" />
      <path d="M3 16h6" />
    </svg>
  );
}

export function IconThermometer(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M10 4.5a2 2 0 1 1 4 0V14a4.5 4.5 0 1 1-4 0z" />
      <line x1="12" y1="9" x2="12" y2="15" />
    </svg>
  );
}
