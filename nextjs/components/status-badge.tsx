import {
  BanIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleDotDashedIcon,
  Clock3Icon,
  MinusCircleIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status =
  | "success"
  | "degraded"
  | "failure"
  | "skipped"
  | "queued"
  | "running"
  | "completed"
  | "aborted"
  | "ready"
  | "needs review";

const statusConfig = {
  success: { icon: CheckCircle2Icon, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  degraded: { icon: TriangleAlertIcon, className: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
  failure: { icon: XCircleIcon, className: "border-red-500/30 bg-red-500/10 text-red-300" },
  skipped: { icon: MinusCircleIcon, className: "border-slate-500/30 bg-slate-500/10 text-slate-300" },
  queued: { icon: CircleDashedIcon, className: "border-slate-500/30 bg-slate-500/10 text-slate-300" },
  running: { icon: CircleDotDashedIcon, className: "border-blue-500/30 bg-blue-500/10 text-blue-300" },
  completed: { icon: CheckCircle2Icon, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  aborted: { icon: BanIcon, className: "border-red-500/30 bg-red-500/10 text-red-300" },
  ready: { icon: CheckCircle2Icon, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  "needs review": { icon: Clock3Icon, className: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
} satisfies Record<Status, { icon: React.ComponentType<{ className?: string }>; className: string }>;

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1.5 whitespace-nowrap capitalize", config.className, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {status}
    </Badge>
  );
}
