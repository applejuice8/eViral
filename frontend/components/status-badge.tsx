import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { PostStatus } from "@/lib/api";
import { statusLabel } from "@/lib/format";

// green = posted, blue = scheduled, red = failed, grey = draft
const variant: Record<PostStatus, "success" | "info" | "danger" | "muted"> = {
  posted: "success",
  scheduled: "info",
  failed: "danger",
  draft: "muted",
};

export const statusDot: Record<PostStatus, string> = {
  posted: "bg-success-600",
  scheduled: "bg-info-600",
  failed: "bg-danger-600",
  draft: "bg-gray-400",
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return <Badge variant={variant[status]}>{statusLabel[status]}</Badge>;
}
