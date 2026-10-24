import { Avatar } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

// AI shows as "eV", people get initials
export function ActivityAvatar({ actor, size = "md" }: { actor: string; size?: "sm" | "md" }) {
  const isAi = actor.toLowerCase().startsWith("eviral");
  return <Avatar initials={isAi ? "eV" : initials(actor)} size={size} />;
}
