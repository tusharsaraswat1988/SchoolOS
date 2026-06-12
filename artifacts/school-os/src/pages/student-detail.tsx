import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout";
import { useOperationalScope } from "@/lib/use-scope";
import {
  useGetStudent,
  getGetStudentQueryKey,
  useListAttendance,
  getListAttendanceQueryKey,
  useListFeeRecords,
  getListFeeRecordsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar,
  Droplets, GraduationCap, CheckCircle2, XCircle,
  Clock, MinusCircle, IndianRupee, CreditCard,
} from "lucide-react";
import { StudentRelationsTab } from "@/components/student-master/relations-tab";
import { StudentDocumentsTab } from "@/components/student-master/documents-tab";
import { calculateAgeFromDob } from "@/lib/student-master-api";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  left: "bg-zinc-500/15 text-zinc-500 border-zinc-500/20",
  tc_issued: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  alumni: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  suspended: "bg-red-500/15 text-red-600 border-red-500/20",
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
  const scope = useOperationalScope();
  const branchId = scope?.branchId ?? 0;
  const sessionId = scope?.sessionId ?? 0;
  const schoolId = scope?.schoolId ?? 0;
  const studentId = Number(id);

  const { data: student, isLoading: loadingStudent } = useGetStudent(branchId, sessionId, studentId, {
    query: {
      enabled: !!studentId && !!branchId && !!sessionId,
      queryKey: getGetStudentQueryKey(branchId, sessionId, studentId),
    },
  });

  const { data: attendance } = useListAttendance(branchId, sessionId, { studentId }, {
    query: {
      enabled: !!studentId && !!branchId,
      queryKey: getListAttendanceQueryKey(branchId, sessionId, { studentId }),
    },
  });

  const { data: feeData } = useListFeeRecords(branchId, sessionId, { studentId, limit: 20 }, {
    query: {
      enabled: !!studentId && !!branchId,
      queryKey: getListFeeRecordsQueryKey(branchId, sessionId, { studentId, limit: 20 }),
    },
  });

  if (!scope) {
    return (
      <Layout>
        <p className="text-muted-foreground">Select a branch and session to view students.</p>
      </Layout>
    );
  }

  if (loadingStudent) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse max-w-5xl">
          <div className="h-8 bg-muted rounded w-32" />
          <div className="h-36 bg-muted rounded-xl" />
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

  const ext = student as unknown as Record<string, unknown>;
  const attendanceList = attendance ?? [];
  const presentCount = attendanceList.filter((a) => a.status === "present").length;
  const lateCount = attendanceList.filter((a) => a.status === "late").length;
  const totalMarked = attendanceList.length;
  const attRate = totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : 0;

  const fees = feeData?.data ?? [];
  const totalFees = fees.reduce((s, f) => s + Number(f.amount ?? 0), 0);
  const paidFees = fees.reduce((s, f) => s + Number(f.paidAmount ?? 0), 0);
  const feeRate = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0;

  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`;
  const age = calculateAgeFromDob(student.dateOfBirth ? String(student.dateOfBirth) : null);

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl">
        <Link href="/students">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            All Students
          </Button>
        </Link>

        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm ring-1 ring-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 ring-2 ring-primary/20">
                <span className="text-2xl font-bold text-primary">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {student.firstName} {String(ext.middleName ?? "")} {student.lastName}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {student.className ?? "No class assigned"}
                      {student.section ? ` · Section ${student.section}` : ""}
                      {age != null ? ` · Age ${age}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/students/${studentId}/edit`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <Badge variant="outline" className={`capitalize ${STATUS_COLORS[student.status ?? "active"]}`}>
                      {(student.status ?? "active").replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-4">
                  {ext.registrationNumber ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="text-xs font-mono">Reg: {String(ext.registrationNumber)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span className="font-mono text-xs">{student.admissionNumber}</span>
                  </div>
                  {student.rollNumber && <span className="text-xs text-muted-foreground">Roll #{student.rollNumber}</span>}
                </div>
              </div>
            </div>
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

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="relations">Relations</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identity</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <InfoRow icon={Calendar} label="Date of Birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null} />
                    <InfoRow icon={User} label="Gender" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : null} />
                    <InfoRow icon={Droplets} label="Blood Group" value={student.bloodGroup} />
                    <InfoRow icon={GraduationCap} label="Category" value={student.category} />
                    <InfoRow icon={MapPin} label="Address" value={String(ext.address ?? "")} />
                    <InfoRow icon={User} label="PEN" value={String(ext.penNumber ?? "")} />
                    <InfoRow icon={User} label="APAAR ID" value={String(ext.apaarId ?? "")} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Legacy Parent Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <InfoRow icon={User} label="Father's Name" value={student.fatherName} />
                    <InfoRow icon={User} label="Mother's Name" value={student.motherName} />
                    <InfoRow icon={Phone} label="Phone" value={student.parentPhone} />
                    <InfoRow icon={Mail} label="Email" value={student.parentEmail} />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Attendance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {totalMarked === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">No attendance recorded</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-center mb-5">
                        <AttendanceRing rate={attRate} />
                      </div>
                      <div className="space-y-1 max-h-52 overflow-y-auto">
                        {[...attendanceList].reverse().slice(0, 10).map((rec) => {
                          const Icon = ATT_ICONS[rec.status ?? "present"] ?? CheckCircle2;
                          return (
                            <div key={rec.id} className="flex items-center justify-between py-1.5 border-b border-border/40">
                              <span className="text-xs text-muted-foreground">{rec.date}</span>
                              <div className={`flex items-center gap-1.5 text-xs capitalize ${ATT_TEXT[rec.status ?? "present"]}`}>
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

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fee Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {fees.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">No fee records</p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {fees.slice(0, 8).map((fee) => (
                        <div key={fee.id} className="flex justify-between items-start gap-2 pb-2 border-b border-border/40">
                          <div>
                            <p className="text-sm font-medium">{fee.feeType}</p>
                            <p className="text-xs text-muted-foreground">Due {fee.dueDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">₹{Number(fee.amount).toLocaleString("en-IN")}</p>
                            <Badge variant="outline" className={`text-xs capitalize ${FEE_STATUS_COLORS[fee.status ?? "pending"]}`}>
                              {fee.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="relations" className="mt-6">
            <StudentRelationsTab branchId={branchId} sessionId={sessionId} studentId={studentId} schoolId={schoolId} />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <StudentDocumentsTab branchId={branchId} sessionId={sessionId} studentId={studentId} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
