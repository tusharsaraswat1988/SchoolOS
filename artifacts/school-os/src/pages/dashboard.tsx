import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserSquare2, CheckCircle2, IndianRupee,
  TrendingUp, AlertCircle, CreditCard, Clock,
  GraduationCap, CalendarDays, Activity,
} from "lucide-react";
import {
  useGetSchoolDashboard, getGetSchoolDashboardQueryKey,
  useGetRecentActivity, getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  online: "Online",
  card: "Card",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  payment: IndianRupee,
  admission: GraduationCap,
  attendance: CheckCircle2,
  announcement: Activity,
  staff: UserSquare2,
  fee: CreditCard,
};

const ACTIVITY_COLORS: Record<string, string> = {
  payment: "bg-emerald-500/15 text-emerald-600",
  admission: "bg-blue-500/15 text-blue-600",
  attendance: "bg-violet-500/15 text-violet-600",
  announcement: "bg-amber-500/15 text-amber-600",
  staff: "bg-rose-500/15 text-rose-600",
  fee: "bg-sky-500/15 text-sky-600",
};

function KpiCard({
  label, value, sub, icon: Icon, highlight,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; highlight?: "green" | "amber" | "red";
}) {
  const color = highlight === "green" ? "text-emerald-600" : highlight === "amber" ? "text-amber-600" : highlight === "red" ? "text-red-600" : "";
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold mt-1.5 tracking-tight ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 ml-3">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(str: string) {
  try {
    return new Date(str).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return str; }
}

function formatTime(str: string) {
  try {
    return new Date(str).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return ""; }
}

function nextBirthday(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  const diff = thisYear.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) {
    const nextYear = new Date(now.getFullYear() + 1, d.getMonth(), d.getDate());
    const d2 = Math.ceil((nextYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `In ${d2} days`;
  }
  return `In ${days} days`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-medium">₹{Number(p.value).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;

  const { data: dashboard, isLoading } = useGetSchoolDashboard(schoolId, {
    query: {
      enabled: !!schoolId,
      queryKey: getGetSchoolDashboardQueryKey(schoolId),
    },
  });

  const { data: activity } = useGetRecentActivity(schoolId, { limit: 8 }, {
    query: {
      enabled: !!schoolId,
      queryKey: getGetRecentActivityQueryKey(schoolId, { limit: 8 }),
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-28 bg-muted rounded-xl" />)}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-72 bg-muted rounded-xl col-span-2" />
            <div className="h-72 bg-muted rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  const d = dashboard!;
  const attRate = d?.attendanceRate ?? 0;
  const feeRate = d?.feeCollectionRate ?? 0;
  const chartData = d?.monthlyFeeChart ?? [];
  const payments = d?.recentPayments ?? [];
  const birthdays = d?.upcomingBirthdays ?? [];
  const activities = activity ?? [];

  return (
    <Layout>
      <div className="space-y-7">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {d?.todayAttendance?.presentToday ?? 0} present today out of {d?.studentCount ?? 0} students.
          </p>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            label="Total Students"
            value={(d?.studentCount ?? 0).toLocaleString()}
            sub="Enrolled and active"
            icon={Users}
          />
          <KpiCard
            label="Staff Members"
            value={(d?.staffCount ?? 0).toString()}
            sub="Teaching & non-teaching"
            icon={UserSquare2}
          />
          <KpiCard
            label="Attendance Today"
            value={`${attRate}%`}
            sub={`${d?.todayAttendance?.presentToday ?? 0} present · ${d?.todayAttendance?.absentToday ?? 0} absent`}
            icon={CheckCircle2}
            highlight={attRate >= 85 ? "green" : attRate >= 70 ? "amber" : "red"}
          />
          <KpiCard
            label="Fee Collection Rate"
            value={`${feeRate}%`}
            sub="Of total expected fees"
            icon={TrendingUp}
            highlight={feeRate >= 80 ? "green" : feeRate >= 60 ? "amber" : "red"}
          />
          <KpiCard
            label="Total Collected"
            value={formatINR(d?.totalFeeCollected ?? 0)}
            sub={`of ${formatINR(d?.totalFeeExpected ?? 0)} expected`}
            icon={IndianRupee}
          />
          <KpiCard
            label="Pending Fees"
            value={formatINR(d?.pendingFees ?? 0)}
            sub="Outstanding balance"
            icon={AlertCircle}
            highlight={d?.pendingFees ? "amber" : "green"}
          />
        </div>

        {/* Chart + Activity row */}
        <div className="grid grid-cols-3 gap-5">
          {/* Monthly fee chart */}
          <Card className="col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Monthly Fee Collection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => formatINR(v)}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                      formatter={(v) => <span style={{ color: "hsl(var(--muted-foreground))", textTransform: "capitalize" }}>{v}</span>}
                    />
                    <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} name="collected" />
                    <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="pending" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Upcoming birthdays */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Upcoming Birthdays
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {birthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">None upcoming</p>
              ) : (
                <div className="space-y-0">
                  {birthdays.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0">
                          <CalendarDays className="h-3.5 w-3.5 text-pink-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{b.name}</p>
                          <p className="text-xs text-muted-foreground">{b.className}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-pink-600 shrink-0 ml-2">
                        {nextBirthday(b.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity + Recent payments row */}
        <div className="grid grid-cols-2 gap-5">
          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
              ) : (
                <div className="space-y-0">
                  {activities.map((act) => {
                    const Icon = ACTIVITY_ICONS[act.type ?? ""] ?? Activity;
                    const color = ACTIVITY_COLORS[act.type ?? ""] ?? "bg-muted text-muted-foreground";
                    return (
                      <div key={act.id} className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{act.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {act.actorName && <span>{act.actorName}</span>}
                            {act.targetName && <span className="text-foreground/70"> → {act.targetName}</span>}
                            {act.amount && <span className="text-emerald-600 font-medium"> · ₹{Number(act.amount).toLocaleString("en-IN")}</span>}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">{formatDate(act.createdAt!)}</p>
                          <p className="text-xs text-muted-foreground/60">{formatTime(act.createdAt!)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent payments */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Recent Fee Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No recent payments</p>
              ) : (
                <div className="space-y-0">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{p.studentName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.feeType}
                          {p.className && <span className="text-foreground/60"> · {p.className}</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {p.paymentMethod && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 border-border/60 text-muted-foreground">
                              {METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                            </Badge>
                          )}
                          {p.receiptNumber && (
                            <span className="text-xs font-mono text-muted-foreground/60">{p.receiptNumber}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-emerald-600">
                          ₹{Number(p.paidAmount).toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.paidDate ? formatDate(p.paidDate) : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's attendance breakdown */}
        {(d?.todayAttendance?.presentToday || d?.todayAttendance?.absentToday || d?.todayAttendance?.lateToday) ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Today's Attendance Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Present", count: d.todayAttendance.presentToday, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
                  { label: "Absent", count: d.todayAttendance.absentToday, color: "bg-red-500/10 text-red-600 border-red-500/20" },
                  { label: "Late", count: d.todayAttendance.lateToday, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                  { label: "Not Marked", count: Math.max(0, d.studentCount - d.todayAttendance.presentToday - d.todayAttendance.absentToday - d.todayAttendance.lateToday), color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
                    <p className="text-3xl font-bold">{s.count}</p>
                    <p className="text-sm font-medium opacity-80 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Layout>
  );
}
