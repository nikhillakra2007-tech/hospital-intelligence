import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import { cx } from "@/utils/format";
import {
  IconDashboard,
  IconDrop,
  IconHospital,
  IconPulse,
  IconUsers,
} from "@/components/common/icons";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true, icon: <IconDashboard /> },
  { to: "/hospitals", label: "Hospitals", icon: <IconHospital /> },
  { to: "/patients", label: "Patients", icon: <IconUsers /> },
  { to: "/risk", label: "Risk Intelligence", icon: <IconPulse /> },
  { to: "/environment", label: "Environment", icon: <IconDrop /> },
];

export default function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <aside
      className={
        className ??
        "fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex"
      }
    >
      <div className="flex items-center gap-3 px-5 py-5">
        <motion.span
          whileHover={{ rotate: -6, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-white shadow-pop"
          style={{ backgroundColor: "rgb(var(--accent))" }}
        >
          <svg
            viewBox="0 0 24 24"
            width={19}
            height={19}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 13 7 13 10 6 14 19 17 11 21 11" />
          </svg>
        </motion.span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight tracking-tight">
            Hospital Intelligence
          </p>
          <p className="muted mt-0.5 text-[11px] leading-tight">Clinical command center</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx("nav-link", isActive && "nav-link-active")
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line px-5 py-4">
        <p className="muted text-[11px] leading-relaxed">
          Synthetic demonstration data.
          <br />
          Not for clinical use.
        </p>
      </div>
    </aside>
  );
}
