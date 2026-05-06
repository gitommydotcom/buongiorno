import { cn } from "@/lib/utils";

export function Section({
  title,
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("animate-slide-up", className)}>
      {title && (
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
