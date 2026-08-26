import type { ReactNode } from "react";
import { cx } from "@/utils/format";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export default function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <section className={cx("card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            {title && <h2 className="panel-title">{title}</h2>}
            {subtitle && <p className="muted mt-0.5 text-xs">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
