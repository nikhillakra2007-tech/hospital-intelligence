import { motion } from "motion/react";
import { IconAlert, IconRefresh } from "@/components/common/icons";

export function LoadingState({
  label = "Loading data…",
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
      aria-live="polite"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-10 w-full" />
      ))}
      <p className="muted pt-1 text-center text-xs">{label}</p>
    </motion.div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 px-6 py-8 text-center dark:border-red-500/20 dark:bg-red-500/5"
      role="alert"
    >
      <span className="text-red-500">
        <IconAlert width={28} height={28} />
      </span>
      <div>
        <p className="text-sm font-semibold text-red-700 dark:text-red-300">
          Something went wrong
        </p>
        <p className="muted mx-auto mt-1 max-w-md text-xs leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary mt-1">
          <IconRefresh width={15} height={15} />
          Retry
        </button>
      )}
    </motion.div>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-2 px-6 py-10 text-center"
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-raised text-ink-faint">
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
        </svg>
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {message && <p className="muted max-w-sm text-xs leading-relaxed">{message}</p>}
    </motion.div>
  );
}
