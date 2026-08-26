import { useEffect } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cx } from "@/utils/format";
import { IconClose } from "@/components/common/icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  widthClass?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClass = "max-w-2xl",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop sm:max-h-[88vh] sm:rounded-2xl",
              widthClass,
            )}
            initial={{ y: 32, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                {subtitle && <p className="muted mt-0.5 text-xs">{subtitle}</p>}
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={onClose}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-raised hover:text-ink"
              >
                <IconClose />
              </button>
            </header>
            <div className="overflow-y-auto p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
