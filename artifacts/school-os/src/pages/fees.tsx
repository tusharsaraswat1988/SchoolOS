import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import {
  useListFeeRecords, useGetFeeSummary, useRecordFeePayment,
  getListFeeRecordsQueryKey, getGetFeeSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, TrendingUp, Clock, AlertCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  overdue: "bg-red-500/15 text-red-600 border-red-500/20",
  partial: "bg-blue-500/15 text-blue-600 border-blue-500/20",
};

export default function Fees() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [payDialogId, setPayDialogId] = useState<number | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "cash" });
  const qc = useQueryClient();

  const activeStatus = statusFilter === "all" ? undefined : statusFilter;
  const { data, isLoading } = useListFeeRecords(schoolId, { status: activeStatus }, {
    query: { queryKey: getListFeeRecordsQueryKey(schoolId, { status: activeStatus }) },
  });
  const { data: summary } = useGetFeeSummary(schoolId, {}, {
    query: { queryKey: getGetFeeSummaryQueryKey(schoolId, {}) },
  });

  const recordPayment = useRecordFeePayment({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFeeRecordsQueryKey(schoolId) });
        qc.invalidateQueries({ queryKey: getGetFeeSummaryQueryKey(schoolId) });
        setPayDialogId(null);
        setPayForm({ amount: "", paymentMethod: "cash" });
      },
    },
  });

  const records = data?.data ?? [];

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const statCards = [
    { label: "Total Expected", value: fmt(summary?.totalExpected ?? 0), icon: IndianRupee, color: "text-primary" },
    { label: "Collected", value: fmt(summary?.totalCollected ?? 0), icon: TrendingUp, color: "text-emerald-600" },
    { label: "Pending", value: fmt(summary?.totalPending ?? 0), icon: Clock, color: "text-amber-600" },
    { label: "Overdue", value: fmt(summary?.totalOverdue ?? 0), icon: AlertCircle, color: "text-red-600" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fee Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Collection rate: <span className="font-semibold text-primary">{summary?.collectionRate ?? 0}%</span>
          </p>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Fee Records</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />)}</div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <IndianRupee className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No fee records</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/30">
                    <TableHead className="pl-6">Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="pl-6">
                        <div className="font-medium text-sm">{r.studentName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.admissionNumber}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.className ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.feeType}</TableCell>
                      <TableCell className="font-medium text-sm">₹{Number(r.amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-sm">₹{Number(r.paidAmount ?? 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[r.status ?? "pending"]}`}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="pr-6">
                        {r.status !== "paid" && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPayDialogId(r.id)}>
                            Record Payment
                          </Button>
                        )}
                        {r.status === "paid" && r.receiptNumber && (
                          <span className="text-xs text-muted-foreground font-mono">{r.receiptNumber}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={payDialogId !== null} onOpenChange={(o) => !o && setPayDialogId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (payDialogId === null) return;
                recordPayment.mutate({
                  schoolId,
                  feeId: payDialogId,
                  data: { amount: Number(payForm.amount), paymentMethod: payForm.paymentMethod as any },
                });
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <Input type="number" required value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Enter amount" />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={payForm.paymentMethod} onValueChange={(v) => setPayForm((f) => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["cash", "online", "upi", "card", "cheque"].map((m) => (
                      <SelectItem key={m} value={m} className="capitalize">{m.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={recordPayment.isPending}>{recordPayment.isPending ? "Processing..." : "Confirm"}</Button>
                <Button type="button" variant="outline" onClick={() => setPayDialogId(null)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
