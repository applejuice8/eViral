import Link from "next/link";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import {
  Clock,
  ShieldAlert,
  CalendarCheck,
  Inbox,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/platform-icon";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/avatar";
import {
  auditEvents,
  demoCampaign,
  kpis,
  needsApproval,
  owner,
  platformLabel,
  stageLabel,
} from "@/lib/data";

const kpiCards = [
  {
    label: "Drafts awaiting approval",
    value: String(kpis.draftsAwaitingApproval),
    hint: "Review the launch campaign",
    icon: Inbox,
    iconClass: "bg-warning-50 text-warning-600",
  },
  {
    label: "Posts this week",
    value: String(kpis.postsThisWeek),
    hint: "Across 3 platforms",
    icon: CalendarCheck,
    iconClass: "bg-info-50 text-info-600",
  },
  {
    label: "Minutes to approve",
    value: kpis.minutesToApprove.toFixed(1),
    hint: "From inputs to approved campaign",
    icon: Clock,
    iconClass: "bg-brand-50 text-brand-600",
  },
  {
    label: "Errors blocked",
    value: String(kpis.errorsBlocked),
    hint: "Wrong prices & claims stopped",
    icon: ShieldAlert,
    iconClass: "bg-danger-50 text-danger-600",
  },
];

export default function DashboardPage() {
  const pending = needsApproval;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good afternoon, {owner.name.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Here&apos;s what&apos;s happening with {owner.business}&apos;s
            marketing.
          </p>
        </div>
        <Link href="/products/new">
          <Button>
            <Sparkles className="h-4 w-4" />
            Launch a product
          </Button>
        </Link>
      </div>

      {/* KPI cards — Later overview style */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="ev-fade-up">
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.iconClass}`}
                >
                  <kpi.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="text-[28px] font-semibold leading-none text-gray-900">
                {kpi.value}
              </p>
              <p className="text-[11px] text-gray-400">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Needs your approval */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Needs your approval</CardTitle>
              <p className="mt-0.5 text-xs text-gray-500">
                {demoCampaign.productName} — launch campaign
              </p>
            </div>
            <Link href={`/review/${demoCampaign.id}`}>
              <Button size="sm" variant="outline">
                Review campaign
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {pending.length === 0 ? (
              <EmptyApprovalState />
            ) : (
              <ul className="divide-y divide-gray-100">
                {pending.slice(0, 4).map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/review/${d.campaignId}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50"
                    >
                      <PlatformIcon platform={d.platform} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-gray-900">
                          {d.caption}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          {platformLabel[d.platform]} · {stageLabel[d.stage]} ·{" "}
                          {format(parseISO(d.scheduledAt), "EEE d MMM, h:mm a")}
                        </p>
                      </div>
                      <StatusBadge status={d.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Right column: campaign snapshot + activity preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200">
                  <Image
                    src={demoCampaign.productImageImproved}
                    alt={demoCampaign.productName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-gray-900">
                    {demoCampaign.productName}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {demoCampaign.drafts.length} posts · launch sequence
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <StatusBadge status="pending_approval" />
                <Link
                  href={`/review/${demoCampaign.id}`}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Open review →
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent activity</CardTitle>
              <Link
                href="/audit"
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-gray-100">
                {auditEvents.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex items-start gap-2.5 px-5 py-2.5">
                    <Avatar initials={e.actorInitials} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs text-gray-700">
                        <span className="font-medium">{e.actor}</span>{" "}
                        {e.action} {e.entityName}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {format(parseISO(e.at), "d MMM, h:mm a")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyApprovalState() {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <Inbox className="h-6 w-6 text-gray-400" />
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">All caught up!</p>
        <p className="mx-auto mt-1 max-w-70 text-[13px] text-gray-500">
          Nothing is waiting for approval. Add your first product and eViral
          will prepare a campaign for you.
        </p>
      </div>
      <Link href="/products/new">
        <Button size="sm">
          <Sparkles className="h-3.5 w-3.5" />
          Add your first product
        </Button>
      </Link>
    </div>
  );
}
