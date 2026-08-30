import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  labelledBy: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-bg/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "relative z-10 flex w-full max-w-md max-h-[min(92dvh,44rem)] flex-col rounded-t-[28px] bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-border)] sm:rounded-[28px] sm:pt-5",
          "animate-in",
        )}
      >
        <div className="mb-3 flex h-5 shrink-0 items-center justify-center sm:hidden" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <div>
            <h2
              id={labelledBy}
              className="font-display text-xl tracking-[-0.03em] text-fg text-balance"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted text-pretty">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-elevated hover:text-fg"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
