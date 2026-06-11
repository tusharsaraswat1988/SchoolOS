import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import { useListStaff, useCreateStaff, getListStaffQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, UserSquare2 } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  teacher: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  principal: "bg-purple-500/15 text-purple-600 border-purple-500/20",
  accountant: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  admin: "bg-indigo-500/15 text-indigo-600 border-indigo-500/20",
  support: "bg-zinc-500/15 text-zinc-600 border-zinc-500/20",
};

const emptyForm = {
  firstName: "", lastName: "", role: "teacher", email: "", phone: "",
  subject: "", salary: "", employeeId: "", gender: "male", dob: "",
  joiningDate: "", designation: "", staffType: "teaching", qualification: "",
  professionalQualification: "", appointmentType: "regular", salaryReference: "",
};

export default function Staff() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useListStaff(schoolId, { search: search || undefined }, {
    query: { queryKey: getListStaffQueryKey(schoolId, { search: search || undefined }) },
  });

  const [form, setForm] = useState(emptyForm);

  const createStaff = useCreateStaff({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStaffQueryKey(schoolId) });
        setOpen(false);
        setForm(emptyForm);
      },
    },
  });

  const field = (key: keyof typeof form, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStaff.mutate({
      schoolId,
      data: {
        ...form,
        role: form.role,
        salary: form.salary ? Number(form.salary) : undefined,
        gender: form.gender as "male" | "female" | "other",
        staffType: form.staffType as "teaching" | "non_teaching",
        appointmentType: form.appointmentType as "regular" | "contract" | "guest",
      },
    });
  };

  const members = data?.data ?? [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
            <p className="text-muted-foreground text-sm mt-1">{data?.total ?? 0} staff members</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Staff</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Staff Member (UDISE)</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="grid gap-4 grid-cols-2 pt-2">
                <div className="space-y-1.5"><Label>First Name</Label><Input required value={form.firstName} onChange={(e) => field("firstName", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Last Name</Label><Input required value={form.lastName} onChange={(e) => field("lastName", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Employee ID</Label><Input value={form.employeeId} onChange={(e) => field("employeeId", e.target.value)} /></div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => field("role", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["teacher", "principal", "accountant", "admin", "support"].map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Mobile</Label><Input required value={form.phone} onChange={(e) => field("phone", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => field("email", e.target.value)} /></div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => field("gender", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={form.dob} onChange={(e) => field("dob", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Joining Date</Label><Input type="date" value={form.joiningDate} onChange={(e) => field("joiningDate", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Designation</Label><Input value={form.designation} onChange={(e) => field("designation", e.target.value)} /></div>
                <div className="space-y-1.5">
                  <Label>Staff Type</Label>
                  <Select value={form.staffType} onValueChange={(v) => field("staffType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teaching">Teaching</SelectItem>
                      <SelectItem value="non_teaching">Non Teaching</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Appointment Type</Label>
                  <Select value={form.appointmentType} onValueChange={(v) => field("appointmentType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => field("qualification", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Professional Qualification</Label><Input value={form.professionalQualification} onChange={(e) => field("professionalQualification", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Subject Taught</Label><Input value={form.subject} onChange={(e) => field("subject", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Salary Reference</Label><Input value={form.salaryReference} onChange={(e) => field("salaryReference", e.target.value)} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Salary (monthly)</Label><Input type="number" value={form.salary} onChange={(e) => field("salary", e.target.value)} /></div>
                <div className="col-span-2 flex gap-3">
                  <Button type="submit" disabled={createStaff.isPending}>{createStaff.isPending ? "Saving..." : "Add Staff"}</Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search staff..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />)}</div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <UserSquare2 className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No staff found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/30">
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {m.firstName.charAt(0)}{m.lastName.charAt(0)}
                          </div>
                          <span className="font-medium">{m.firstName} {m.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs capitalize ${ROLE_COLORS[m.role] ?? ""}`}>{m.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{m.email}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{m.phone ?? "—"}</TableCell>
                      <TableCell>{m.subject ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={m.status === "active" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-xs" : "text-xs"}>{m.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
