import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import {
  useGetStudent, getGetStudentQueryKey,
  useListAttendance, getListAttendanceQueryKey,
  useListFeeRecords, getListFeeRecordsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar,
  Droplets, GraduationCap, CheckCircle2, XCircle,
  Clock, MinusCircle, IndianRupee, CreditCard,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  inactive: "bg-zinc-500/15 text-zinc-500 border-zinc-500/20",
  graduated: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  transferred: "bg-amber-500/15 text-amber-600 border-amber-500/20",
};

const ATT_COLORS: Record<string, string> = {
  present: "bg-emerald-500",
  absent: "bg-red-500",
  late: "bg-amber-500",
  excused: "bg-blue-400",
};

const ATT_ICONS: Record<string, React.ElementType> = {
  present: CheckCircle2,
  absent: XCircle,
  late: Clock,
  excused: MinusCircle,
};

const ATT_TEXT: Record<string, string> = {
  present: "text-emerald-600",
  absent: "text-red-600",
  late: "text-amber-600",
  excused: "text-blue-600",
};

const FEE_STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  overdue: "bg-red-500/15 text-red-600 border-red-500/20",
  partial: "bg-blue-500/15 text-blue-600 border-blue-500/20",
};

function AttendanceRing({ rate }: { rate: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (rate / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={rate >= 85 ? "#10b981" : rate >= 70 ? "#f59e0b" : "#ef4444"}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold">{rate}%</span>
        <span className="text-xs text-muted-foreground">rate</span>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;
  const studentId = Number(id);

  const { data: student, isLoading: loadingStudent } = useGetStudent(schoolId, studentId, {
    query: {
      enabled: !!studentId,
      queryKey: getGetStudentQueryKey(schoolId, studentId),
    },
  });

  const { data: attendance } = useListAttendance(schoolId, { studentId }, {
    query: {
      enabled: !!studentId,
      queryKey: getListAttendanceQueryKey(schoolId, { studentId }),
    },
  });

  const { data: feeData } = useListFeeRecords(schoolId, { studentId, limit: 20 }, {
    query: {
      enabled: !!studentId,
      queryKey: getListFeeRecordsQueryKey(schoolId, { studentId, limit: 20 }),
    },
  });

  if (loadingStudent) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse max-w-5xl">
          <div className="h-8 bg-muted rounded w-32" />
          <div className="h-36 bg-muted rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <User className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Student not found</p>
          <Link href="/students">
            <Button variant="outline" className="mt-4">Back to Students</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const attendanceList = attendance ?? [];
  const presentCount = attendanceList.filter(a => a.status === "present").length;
  const absentCount = attendanceList.filter(a => a.status === "absent").length;
  const lateCount = attendanceList.filter(a => a.status === "late").length;
  const excusedCount = attendanceList.filter(a => a.status === "excused").length;
  const totalMarked = attendanceList.length;
  const attRate = totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : 0;

  const fees = feeData?.data ?? [];
  const totalFees = fees.reduce((s, f) => s + Number(f.amount ?? 0), 0);
  const paidFees = fees.reduce((s, f) => s + Number(f.paidAmount ?? 0), 0);
  const feeRate = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0;

  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`;

  const age = student.dateOfBirth
    ? Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl">
        {/* Back */}
        <Link href="/students">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            All Students
          </Button>
        </Link>

        {/* Hero header */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm ring-1 ring-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 ring-2 ring-primary/20">
                <span className="text-2xl font-bold text-primary">{initials}</span>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {student.firstName} {student.middleName ? `${student.middleName} ` : ""}{student.lastName}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {student.className ?? "No class assigned"}
                      {student.section ? ` · Section ${student.section}` : ""}
                      {age ? ` · Age ${age}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={`capitalize ${STATUS_COLORS[student.status ?? "active"]}`}>
                    {student.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span className="font-mono text-xs">{student.admissionNumber}</span>
                  </div>
                  {student.rollNumber && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="text-xs">Roll #{student.rollNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground capitalize">
                    <User className="h-3.5 w-3.5" />
                    {student.gender}
                  </div>
                  {student.bloodGroup && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Droplets className="h-3.5 w-3.5 text-red-400" />
                      {student.bloodGroup}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-border/50">
              <div className="text-center">
                <p className="text-xs text-muted-foreground font-medium">Attendance Rate</p>
                <p className={`text-2xl font-bold mt-0.5 ${attRate >= 85 ? "text-emerald-600" : attRate >= 70 ? "text-amber-600" : "text-red-600"}`}>
                  {totalMarked > 0 ? `${attRate}%` : "—"}
                </p>
              </div>
              <div className="text-center border-x border-border/50">
                <p className="text-xs text-muted-foreground font-medium">Fees Paid</p>
                <p className="text-2xl font-bold mt-0.5">₹{paidFees.toLocaleString("en-IN")}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground font-medium">Fee Completion</p>
                <p className={`text-2xl font-bold mt-0.5 ${feeRate >= 80 ? "text-emerald-600" : feeRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {fees.length > 0 ? `${feeRate}%` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-5">
          {/* Left: personal info */}
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={Calendar} label="Date of Birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null} />
                <InfoRow icon={User} label="Gender" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : null} />
                <InfoRow icon={Droplets} label="Blood Group" value={student.bloodGroup} />
                <InfoRow icon={GraduationCap} label="Category" value={student.category} />
                <InfoRow icon={MapPin} label="Address" value={student.address} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Parent / Guardian</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={User} label="Father's Name" value={student.fatherName} />
                <InfoRow icon={User} label="Mother's Name" value={student.motherName} />
                <InfoRow icon={Phone} label="Phone" value={student.parentPhone} />
                <InfoRow icon={Mail} label="Email" value={student.parentEmail} />
              </CardContent>
            </Card>
          </div>

          {/* Middle: attendance */}
          <Card className="col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              {totalMarked === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Calendar className="h-10 w-10 mb-2 opacity-25" />
                  <p className="text-sm">No attendance recorded</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center mb-5">
                    <AttendanceRing rate={attRate} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {[
                      { label: "Present", count: presentCount, color: "text-emerald-600 bg-emerald-500/10" },
                      { label: "Absent", count: absentCount, color: "text-red-600 bg-red-500/10" },
                      { label: "Late", count: lateCount, color: "text-amber-600 bg-amber-500/10" },
                      { label: "Excused", count: excusedCount, color: "text-blue-600 bg-blue-500/10" },
                    ].map(s => (
                      <div key={s.label} className={`rounded-lg p-2.5 ${s.color}`}>
                        <p className="text-xl font-bold">{s.count}</p>
                        <p className="text-xs font-medium opacity-80">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                    {[...attendanceList].reverse().slice(0, 20).map((rec) => {
                      const Icon = ATT_ICONS[rec.status ?? "present"] ?? CheckCircle2;
                      return (
                        <div key={rec.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                          <span className="text-xs text-muted-foreground">{rec.date}</span>
                          <div className={`flex items-center gap-1.5 text-xs font-medium capitalize ${ATT_TEXT[rec.status ?? "present"]}`}>
                            <Icon className="h-3 w-3" />
                            {rec.status}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Right: fee timeline */}
          <Card className="col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fee Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {fees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <IndianRupee className="h-10 w-10 mb-2 opacity-25" />
                  <p className="text-sm">No fee records</p>
                </div>
              ) : (
                <>
                  {/* Progress bar */}
                  <div className="mb-5">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>₹{paidFees.toLocaleString("en-IN")} paid</span>
                      <span>₹{totalFees.toLocaleString("en-IN")} total</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${feeRate >= 80 ? "bg-emerald-500" : feeRate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(feeRate, 100)}%` }}
                      />
                    </div>
                    <p className="text-right text-xs text-muted-foreground mt-1">{feeRate}% collected</p>
                  </div>

                  {/* Timeline */}
                  <div className="relative space-y-0 max-h-80 overflow-y-auto pr-1">
                    {fees.map((fee, idx) => (
                      <div key={fee.id} className="flex gap-3 group">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            fee.status === "paid" ? "bg-emerald-500/15" :
                            fee.status === "overdue" ? "bg-red-500/15" :
                            fee.status === "partial" ? "bg-blue-500/15" : "bg-amber-500/15"
                          }`}>
                            <CreditCard className={`h-3 w-3 ${
                              fee.status === "paid" ? "text-emerald-600" :
                              fee.status === "overdue" ? "text-red-600" :
                              fee.status === "partial" ? "text-blue-600" : "text-amber-600"
                            }`} />
                          </div>
                          {idx < fees.length - 1 && (
                            <div className="w-px flex-1 bg-border/50 my-0.5 min-h-[1rem]" />
                          )}
                        </div>
                        <div className="pb-3 flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-tight">{fee.feeType}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Due {fee.dueDate}
                                {fee.paidDate ? ` · Paid ${fee.paidDate}` : ""}
                              </p>
                              {fee.receiptNumber && (
                                <p className="text-xs font-mono text-muted-foreground/70 mt-0.5">{fee.receiptNumber}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold">₹{Number(fee.amount).toLocaleString("en-IN")}</p>
                              <Badge variant="outline" className={`text-xs capitalize mt-1 ${FEE_STATUS_COLORS[fee.status ?? "pending"]}`}>
                                {fee.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
