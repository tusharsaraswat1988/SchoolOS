import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import { useGetRecentActivity, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivitySquare, CreditCard, UserPlus, CalendarCheck, Megaphone, UserSquare2 } from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  payment: { icon: CreditCard, label: "Payment", color: "bg-emerald-500/10 text-emerald-600" },
  admission: { icon: UserPlus, label: "Admission", color: "bg-blue-500/10 text-blue-600" },
  attendance: { icon: CalendarCheck, label: "Attendance", color: "bg-amber-500/10 text-amber-600" },
  announcement: { icon: Megaphone, label: "Announcement", color: "bg-violet-500/10 text-violet-600" },
  staff_added: { icon: UserSquare2, label: "Staff", color: "bg-indigo-500/10 text-indigo-600" },
};

export default function Activity() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;

  const { data: activities, isLoading } = useGetRecentActivity(schoolId, { limit: 50 }, {
    query: { queryKey: getGetRecentActivityQueryKey(schoolId, { limit: 50 }) },
  });

  const items = activities ?? [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Feed</h1>
          <p className="text-muted-foreground text-sm mt-1">Recent actions across the school system</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ActivitySquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No recent activity</p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {items.map((act, idx) => {
              const cfg = TYPE_CONFIG[act.type ?? ""] ?? { icon: ActivitySquare, label: act.type, color: "bg-muted text-muted-foreground" };
              const Icon = cfg.icon;
              return (
                <div key={act.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {idx < items.length - 1 && (
                      <div className="w-px flex-1 bg-border/60 my-1 min-h-[1.5rem]" />
                    )}
                  </div>
                  <Card className="mb-3 flex-1 hover:border-border/80 transition-colors">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${cfg.color} border-transparent`}>
                              {cfg.label}
                            </Badge>
                            <span className="text-sm font-medium">{act.description}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {act.actorName && (
                              <span className="text-xs text-muted-foreground">By {act.actorName}</span>
                            )}
                            {act.targetName && (
                              <span className="text-xs text-muted-foreground">— {act.targetName}</span>
                            )}
                            {act.amount && (
                              <span className="text-xs font-medium text-emerald-600">
                                ₹{Number(act.amount).toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {act.createdAt ? new Date(act.createdAt).toLocaleString("en-IN", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                          }) : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
