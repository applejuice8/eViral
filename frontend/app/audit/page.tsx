"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { auditEvents, kpis, type AuditEvent } from "@/lib/data";

// 7shifts-style activity feed. Chip colors match the global semantics:
// blocked=red, approved=green, published=blue, edited=amber.
const actionChip: Record<
  AuditEvent["action"],
  { label: string; variant: "success" | "danger" | "info" | "warning" | "muted" }
> = {
  built: { label: "Built", variant: "info" },
  generated: { label: "Generated", variant: "info" },
  blocked: { label: "Blocked", variant: "danger" },
  edited: { label: "Edited", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  published: { label: "Published", variant: "info" },
  paused: { label: "Paused", variant: "muted" },
  resumed: { label: "Resumed", variant: "muted" },
  confirmed: { label: "Confirmed", variant: "success" },
};

const FILTERS = [
  { id: "all", label: "All activity" },
  { id: "blocked", label: "⛔ Errors blocked" },
  { id: "approved", label: "Approved" },
  { id: "published", label: "Published" },
  { id: "edited", label: "Edited" },
] as const;

export default function AuditPage() {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["id"]>("all");
  const [expanded, setExpanded] = React.useState<number | null>(null);

  const events = auditEvents
    .filter((e) => filter === "all" || e.action === filter)
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Activity log</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Every action is recorded — nothing happens silently.
        </p>
      </div>

      {/* Filter chips — "Errors blocked" doubles as the demo counter */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "h-8 cursor-pointer items-center rounded-lg border px-3 text-xs font-medium transition-colors",
              filter === f.id
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            )}
          >
            {f.label}
            {f.id === "blocked" && (
              <span className="ml-1.5 rounded bg-danger-100 px-1.5 py-0.5 text-[10px] font-semibold text-danger-700">
                {kpis.errorsBlocked}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {events.map((e) => {
            const chip = actionChip[e.action];
            const open = expanded === e.id;
            const hasDetail = Boolean(e.before || e.after || e.detail);
            return (
              <li key={e.id}>
                <button
                  onClick={() => hasDetail && setExpanded(open ? null : e.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    hasDetail ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
                  )}
                >
                  <Avatar initials={e.actorInitials} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13px]">
                      <span className="font-semibold text-gray-900">{e.actor}</span>
                      <Badge variant={chip.variant}>{chip.label}</Badge>
                      <span className="truncate text-gray-600">{e.entityName}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {format(parseISO(e.at), "EEE d MMM yyyy, h:mm a")}
                      {e.detail && !open ? ` · ${e.detail}` : ""}
                    </p>
                  </div>
                  {hasDetail && (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-gray-400 transition-transform",
                        open && "rotate-180"
                      )}
                    />
                  )}
                </button>
                {open && (
                  <div className="ev-fade-up space-y-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
                    {e.detail && (
                      <p className="text-xs text-gray-600">{e.detail}</p>
                    )}
                    {e.before && (
                      <div>
                        <p className="mb-0.5 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                          Before
                        </p>
                        <p className="rounded-md border border-danger-100 bg-danger-50 px-2.5 py-1.5 text-xs text-danger-700 line-through">
                          {e.before}
                        </p>
                      </div>
                    )}
                    {e.after && (
                      <div>
                        <p className="mb-0.5 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                          After
                        </p>
                        <p className="rounded-md border border-success-100 bg-success-50 px-2.5 py-1.5 text-xs text-success-700">
                          {e.after}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {events.length === 0 && (
            <li className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <ShieldAlert className="h-6 w-6 text-gray-300" />
              <p className="text-[13px] text-gray-500">No events match this filter.</p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
