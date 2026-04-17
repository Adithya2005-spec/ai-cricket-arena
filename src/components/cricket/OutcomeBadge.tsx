import { cn } from "@/lib/utils";

interface Props {
  outcome: string;
  className?: string;
}

// Cricbuzz-style colored chip for ball outcome.
export function OutcomeBadge({ outcome, className }: Props) {
  const styles =
    outcome === "W" ? "bg-outcome-wicket text-foreground"
      : outcome === "6" ? "bg-outcome-six text-accent-foreground"
      : outcome === "4" ? "bg-outcome-four text-foreground"
      : outcome === "0" ? "bg-outcome-dot text-muted-foreground"
      : "bg-outcome-run text-foreground";
  const label = outcome === "W" ? "W" : outcome;
  return (
    <span className={cn(
      "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold tabular-nums shadow-sm",
      styles, className,
    )}>
      {label}
    </span>
  );
}
