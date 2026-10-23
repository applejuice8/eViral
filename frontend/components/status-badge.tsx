import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { DraftStatus, ValidatorFlag } from "@/lib/data";

// One visual language everywhere: green = approved/published,
// amber = pending/warning, red = blocked/failed, blue = informational/scheduled.
export function StatusBadge({ status }: { status: DraftStatus }) {
  switch (status) {
    case "published":
      return <Badge variant="success">Published</Badge>;
    case "approved":
      return <Badge variant="success">Approved</Badge>;
    case "scheduled":
      return <Badge variant="info">Scheduled</Badge>;
    case "pending_approval":
      return <Badge variant="warning">Needs approval</Badge>;
    case "blocked":
      return <Badge variant="danger">Blocked</Badge>;
    case "failed":
      return <Badge variant="danger">Failed</Badge>;
    case "rejected":
      return <Badge variant="danger">Rejected</Badge>;
    case "paused":
      return <Badge variant="muted">Paused</Badge>;
    case "building":
      return <Badge variant="info">Building…</Badge>;
  }
}

export function FlagsBadges({ flags }: { flags: ValidatorFlag[] }) {
  if (flags.length === 0) {
    return <Badge variant="success">✓ Facts check passed</Badge>;
  }
  return (
    <>
      {flags.map((f, i) => (
        <Badge
          key={`${f.code}-${i}`}
          variant={f.severity === "block" ? "danger" : "warning"}
          title={f.detail}
        >
          {f.severity === "block" ? "⛔" : "⚠"} {f.code.replaceAll("_", " ").toLowerCase()}
        </Badge>
      ))}
    </>
  );
}
