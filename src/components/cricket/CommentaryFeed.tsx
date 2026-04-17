import type { CommentaryEntry } from "@/types/cricket";
import { OutcomeBadge } from "./OutcomeBadge";
import { cn } from "@/lib/utils";

interface Props {
  commentary: CommentaryEntry[];
}

// Scrollable commentary feed — newest first.
export function CommentaryFeed({ commentary }: Props) {
  if (commentary.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
        Commentary will appear here once the match begins.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface divide-y divide-border max-h-[60vh] overflow-y-auto scrollbar-thin">
      {commentary.map((c) => {
        const isSeparator = ["INN", "END"].includes(c.outcome);
        if (isSeparator) {
          return (
            <div key={c.id} className="px-4 py-3 bg-surface-elevated text-center text-xs font-semibold uppercase tracking-wider text-primary animate-slide-in">
              {c.text}
            </div>
          );
        }
        const big = c.outcome === "W" || c.outcome === "6" || c.outcome === "4";
        return (
          <div key={c.id} className="flex gap-3 items-start px-4 py-3 animate-slide-in">
            <div className="shrink-0">
              <OutcomeBadge outcome={c.outcome} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground tabular-nums mb-0.5">Over {c.over_ball_label}</div>
              <div className={cn("text-sm leading-snug", big && "font-semibold")}>{c.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
