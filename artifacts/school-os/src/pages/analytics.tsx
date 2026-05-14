import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadialBarChart, RadialBar,
} from "recharts";
import {
  Users, CheckCircle2, IndianRupee, TrendingUp,
  TrendingDown, Minus, AlertTriangle, ArrowRight,
} from "lucide-react";

interface ClassAttendance {
  present: number; absent: number; late: number;
  excused: number; totalMarked: number; rate: number | null;
}
interface ClassFees {
  expected: number; collected: number; pending: number;
  overdue: number; rate: number | null;
  studentsPaidFull: number; studentsWithFees: number;
}
interface ClassStat {
  id: number; name: string; section: string | null;
  grade: number | null; capacity: number; studentCount: number;
  fillRate: number; attendance: ClassAttendance; fees: ClassFees;
}

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function RateChip({ rate, noData = false }: { rate: number | null; noData?: boolean }) {
  if (rate === null || noData) return <span className="text-xs text-muted-foreground">No data</span>;
  const color = rate >= 85 ? "text-emerald-600 bg-emerald-500/10" : rate >= 70 ? "text-amber-600 bg-amber-500/10" : "text-red-600 bg-red-500/10";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{rate}%</span>;
}

function TrendIcon({ rate }: { rate: number | null }) {
  if (rate === null) return <Minus className="h-4 w-4 text-muted-foreground/40" />;
  if (rate >= 85) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (rate >= 70) return <Minus className="h-4 w-4 text-amber-500" />;
  return <TrendingDown className="h-4 w-4 text-red-500" />;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-xl shadow-lg p-3 text-sm min-w-32">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="text-muted-foreground text-xs">{p.name}</span>
          <span className="font-medium text-xs">{p.value !== null ? `${p.value}%` : "—"}</span>
        </div>
      ))}
    </div>
  );
};

type SortKey = "name" | "attRate" | "feeRate" | "students" | "fill" | "grade";
type SortDir = "asc" | "desc";

export default function Analytics() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;
  const [classes, setClasses] = useState<ClassStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("grade");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/schools/${schoolId}/analytics/classes`)
      .then(r => r.json())
      .then((data: ClassStat[]) => { setClasses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [schoolId]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...classes].sort((a, b) => {
    let av: number, bv: number;
    if (sortKey === "name") return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    if (sortKey === "attRate") { av = a.attendance.rate ?? -1; bv = b.attendance.rate ?? -1; }
    else if (sortKey === "feeRate") { av = a.fees.rate ?? -1; bv = b.fees.rate ?? -1; }
    else if (sortKey === "students") { av = a.studentCount; bv = b.studentCount; }
    else if (sortKey === "fill") { av = a.fillRate; bv = b.fillRate; }
    else { av = a.grade ?? 0; bv = b.grade ?? 0; }
    return sortDir === "asc" ? av - bv : bv - av;
  });

  // Summary stats
  const withAtt = classes.filter(c => c.attendance.rate !== null);
  const withFee = classes.filter(c => c.fees.rate !== null);
  const avgAtt = withAtt.length ? Math.round(withAtt.reduce((s, c) => s + (c.attendance.rate ?? 0), 0) / withAtt.length) : null;
  const avgFee = withFee.length ? Math.round(withFee.reduce((s, c) => s + (c.fees.rate ?? 0), 0) / withFee.length) : null;
  const needsAttention = classes.filter(c => (c.attendance.rate !== null && c.attendance.rate < 75) || (c.fees.rate !== null && c.fees.rate < 60));
  const totalStudents = classes.reduce((s, c) => s + c.studentCount, 0);
  const totalCapacity = classes.reduce((s, c) => s + c.capacity, 0);

  // Chart data
  const chartData = sorted.map(c => ({
    name: c.section ? `${c.name}-${c.section}` : c.name,
    "Attendance": c.attendance.rate,
    "Fee Collection": c.fees.rate,
  }));

  const attDistribution = [
    { name: "85%+", count: classes.filter(c => (c.attendance.rate ?? 0) >= 85).length, fill: "#10b981" },
    { name: "70–84%", count: classes.filter(c => { const r = c.attendance.rate; return r !== null && r >= 70 && r < 85; }).length, fill: "#f59e0b" },
    { name: "<70%", count: classes.filter(c => c.attendance.rate !== null && (c.attendance.rate ?? 100) < 70).length, fill: "#ef4444" },
    { name: "No data", count: classes.filter(c => c.attendance.rate === null).length, fill: "#d1d5db" },
  ].filter(d => d.count > 0);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-7">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Class Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Attendance rates and fee collection completion across {classes.length} classes.
          </p>
        </div>

        {/* Summary KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Attendance</p>
                  <p className={`text-3xl font-bold mt-1.5 ${avgAtt === null ? "text-muted-foreground" : avgAtt >= 85 ? "text-emerald-600" : avgAtt >= 70 ? "text-amber-600" : "text-red-600"}`}>
                    {avgAtt !== null ? `${avgAtt}%` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">School-wide average</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Fee Collection</p>
                  <p className={`text-3xl font-bold mt-1.5 ${avgFee === null ? "text-muted-foreground" : avgFee >= 80 ? "text-emerald-600" : avgFee >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {avgFee !== null ? `${avgFee}%` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">School-wide average</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
                  <IndianRupee className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Enrollment</p>
                  <p className="text-3xl font-bold mt-1.5">{totalStudents}</p>
                  <p className="text-xs text-muted-foreground mt-1">of {totalCapacity} capacity</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={needsAttention.length > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Need Attention</p>
                  <p className={`text-3xl font-bold mt-1.5 ${needsAttention.length > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {needsAttention.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Classes below threshold</p>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${needsAttention.length > 0 ? "bg-amber-500/15" : "bg-emerald-500/10"}`}>
                  <AlertTriangle className={`h-4 w-4 ${needsAttention.length > 0 ? "text-amber-600" : "text-emerald-600"}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classes needing attention */}
        {needsAttention.length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Classes Needing Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {needsAttention.map(c => (
                  <div key={c.id} className="flex items-center gap-2 bg-background rounded-lg border border-amber-500/20 px-3 py-2">
                    <span className="text-sm font-medium">{c.name}{c.section ? `-${c.section}` : ""}</span>
                    {c.attendance.rate !== null && c.attendance.rate < 75 && (
                      <Badge variant="outline" className="text-xs border-red-500/20 text-red-600 bg-red-500/8">
                        Att {c.attendance.rate}%
                      </Badge>
                    )}
                    {c.fees.rate !== null && c.fees.rate < 60 && (
                      <Badge variant="outline" className="text-xs border-amber-500/20 text-amber-600 bg-amber-500/8">
                        Fee {c.fees.rate}%
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Attendance vs Fee Collection — All Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barCategoryGap="25%" barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Attendance" radius={[4, 4, 0, 0]} name="Attendance">
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry["Attendance"] === null ? "#e5e7eb" :
                          (entry["Attendance"] ?? 0) >= 85 ? "#10b981" :
                          (entry["Attendance"] ?? 0) >= 70 ? "#f59e0b" : "#ef4444"
                        }
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="Fee Collection" radius={[4, 4, 0, 0]} name="Fee Collection">
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry["Fee Collection"] === null ? "#e5e7eb" :
                          (entry["Fee Collection"] ?? 0) >= 80 ? "#6366f1" :
                          (entry["Fee Collection"] ?? 0) >= 60 ? "#a78bfa" : "#c4b5fd"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex items-center gap-6 mt-2 justify-center">
              {[
                { color: "bg-emerald-500", label: "Attendance 85%+" },
                { color: "bg-amber-500", label: "Attendance 70–84%" },
                { color: "bg-red-500", label: "Attendance <70%" },
                { color: "bg-indigo-500", label: "Fee Collection 80%+" },
                { color: "bg-violet-400", label: "Fee Collection 60–79%" },
                { color: "bg-violet-200", label: "Fee Collection <60%" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${l.color}`} />
                  <span className="text-xs text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detail table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Per-Class Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-6 py-2 border-b border-border/50 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <button className="col-span-2 text-left hover:text-foreground transition-colors" onClick={() => toggleSort("name")}>
                Class {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </button>
              <button className="col-span-2 text-right hover:text-foreground transition-colors" onClick={() => toggleSort("students")}>
                Students {sortKey === "students" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </button>
              <button className="col-span-3 text-left hover:text-foreground transition-colors pl-2" onClick={() => toggleSort("attRate")}>
                Attendance {sortKey === "attRate" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </button>
              <button className="col-span-3 text-left hover:text-foreground transition-colors pl-2" onClick={() => toggleSort("feeRate")}>
                Fee Collection {sortKey === "feeRate" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </button>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {sorted.map((cls) => {
              const attRate = cls.attendance.rate;
              const feeRate = cls.fees.rate;
              const attColor = attRate === null ? "bg-muted" : attRate >= 85 ? "bg-emerald-500" : attRate >= 70 ? "bg-amber-500" : "bg-red-500";
              const feeColor = feeRate === null ? "bg-muted" : feeRate >= 80 ? "bg-indigo-500" : feeRate >= 60 ? "bg-violet-400" : "bg-violet-200";

              return (
                <div key={cls.id} className="grid grid-cols-12 gap-2 px-6 py-4 border-b border-border/30 last:border-0 items-center hover:bg-muted/30 transition-colors">
                  {/* Class name */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <TrendIcon rate={attRate} />
                      <div>
                        <p className="text-sm font-semibold leading-tight">
                          {cls.name}{cls.section ? ` ${cls.section}` : ""}
                        </p>
                        {cls.grade && <p className="text-xs text-muted-foreground">Grade {cls.grade}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Students */}
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-medium">{cls.studentCount}</p>
                    <p className="text-xs text-muted-foreground">of {cls.capacity} seats</p>
                    <div className="mt-1">
                      <MiniBar value={cls.studentCount} max={cls.capacity} color="bg-primary/50" />
                    </div>
                  </div>

                  {/* Attendance */}
                  <div className="col-span-3 pl-2">
                    <div className="flex items-center justify-between mb-1">
                      <RateChip rate={attRate} noData={cls.attendance.totalMarked === 0} />
                      {cls.attendance.totalMarked > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {cls.attendance.present}P · {cls.attendance.absent}A · {cls.attendance.late}L
                        </span>
                      )}
                    </div>
                    <MiniBar value={attRate ?? 0} max={100} color={attColor} />
                    {cls.attendance.totalMarked === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">No attendance marked</p>
                    )}
                  </div>

                  {/* Fee collection */}
                  <div className="col-span-3 pl-2">
                    <div className="flex items-center justify-between mb-1">
                      <RateChip rate={feeRate} noData={cls.fees.expected === 0} />
                      {cls.fees.expected > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatINR(cls.fees.collected)} / {formatINR(cls.fees.expected)}
                        </span>
                      )}
                    </div>
                    <MiniBar value={feeRate ?? 0} max={100} color={feeColor} />
                    {cls.fees.overdue > 0 && (
                      <p className="text-xs text-red-600 mt-0.5">{formatINR(cls.fees.overdue)} overdue</p>
                    )}
                    {cls.fees.expected === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">No fee records</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex justify-end">
                    <Link href={`/students?classId=${cls.id}`}>
                      <button className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                        View students <ArrowRight className="h-3 w-3" />
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
