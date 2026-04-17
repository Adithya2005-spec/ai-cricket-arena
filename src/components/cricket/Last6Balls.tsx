import type { CommentaryEntry } from "@/types/cricket";
import { OutcomeBadge } from "./OutcomeBadge";

interface Props {
  commentary: CommentaryEntry[];
}

// Last 6 balls strip — Cricbuzz signature.
export function Last6Balls({ commentary }: Props) {
  // Filter out INN/END markers, take last 6 actual balls
  const balls = commentary
    .filter(c => !["INN", "END"].includes(c.outcome))
    .slice(0, 6)
    .reverse();

  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last 6 balls</span>
      </div>
      <div className="flex items-center gap-2">
        {balls.length === 0 ? (
          <span className="text-sm text-muted-foreground">No balls bowled yet.</span>
        ) : balls.map(b => <OutcomeBadge key={b.id} outcome={b.outcome} />)}
      </div>
    </div>
  );
}
