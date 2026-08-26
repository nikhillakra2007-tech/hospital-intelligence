import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { cx } from "@/utils/format";

export type KpiTone = "accent" | "emerald" | "amber" | "red" | "sky" | "violet";

const TONE_CLASS: Record<KpiTone, string> = {
  accent: "bg-[rgb(var(--accent))]/10 text-accent",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  red: "bg-red-500/10 text-red-600 dark:text-red-300",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
};

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  badge?: { label: string; className: string };
  icon?: React.ReactNode;
  tone?: KpiTone;
  delay?: number;
  /** Optional route — renders a chevron link in the card corner. */
  to?: string;
}

export default function KpiCard({
  label,
  value,
  hint,
  badge,
  icon,
  tone = "accent",
  delay = 0,
  to,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      whileHover={{ y: -2 }}
      className="card card-pad flex items-start justify-between gap-3"
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span
            className={cx(
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
              TONE_CLASS[tone],
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="muted truncate text-[11px] font-semibold uppercase tracking-wider">
            {label}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="tabular-nums break-words text-xl font-semibold tracking-tight sm:text-2xl">
              {value}
            </span>
            {badge && <span className={badge.className}>{badge.label}</span>}
          </div>
          {hint && <p className="muted mt-0.5 break-words text-[11px] leading-snug">{hint}</p>}
        </div>
      </div>
      {to && (
        <Link
          to={to}
          aria-label={`Open ${label}`}
          className="muted grid h-6 w-6 shrink-0 place-items-center rounded-md text-sm transition-colors hover:bg-raised hover:text-ink"
        >
          ›
        </Link>
      )}
    </motion.div>
  );
}

export function KpiSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card card-pad space-y-3">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-7 w-16" />
          <div className="skeleton h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
