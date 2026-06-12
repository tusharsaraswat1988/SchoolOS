import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  fetchEntityDocuments,
  updateEntityDocument,
  uploadEntityDocument,
  type DocumentDashboardItem,
} from "@/lib/student-master-api";
import { CheckCircle2, XCircle, AlertTriangle, Clock, Upload } from "lucide-react";

type Props = {
  branchId: number;
  sessionId: number;
  studentId: number;
};

const STATUS_ICON = {
  uploaded: CheckCircle2,
  missing: XCircle,
  expired: AlertTriangle,
  pending: Clock,
  rejected: XCircle,
};

const STATUS_COLOR = {
  uploaded: "text-emerald-600",
  missing: "text-red-500",
  expired: "text-amber-600",
  pending: "text-blue-600",
  rejected: "text-red-600",
};

function StatusBadge({ item }: { item: DocumentDashboardItem }) {
  const Icon = STATUS_ICON[item.status];
  return (
    <div className={`flex items-center gap-1.5 text-sm font-medium ${STATUS_COLOR[item.status]}`}>
      <Icon className="h-4 w-4" />
      <span className="capitalize">{item.status}</span>
      {item.isMandatory && <Badge variant="outline" className="ml-1 text-xs">Required</Badge>}
    </div>
  );
}

export function StudentDocumentsTab({ branchId, sessionId, studentId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("all");
  const [uploadTarget, setUploadTarget] = useState<number | null>(null);
  const [uploadMeta, setUploadMeta] = useState({ documentNumber: "", issueDate: "", expiryDate: "", remarks: "" });

  const queryKey = ["entity-documents", branchId, sessionId, studentId, filter];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      fetchEntityDocuments(
        branchId,
        sessionId,
        studentId,
        filter === "all" ? undefined : filter,
      ),
  });

  const dashboard = data?.dashboard ?? [];
  const items = data?.data ?? dashboard;
  const summary = data?.summary;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["entity-documents", branchId, sessionId, studentId] });

  const handleUpload = async () => {
    if (!uploadTarget || !fileRef.current?.files?.[0]) {
      toast({ title: "Select a file", variant: "destructive" });
      return;
    }
    const fd = new FormData();
    fd.append("file", fileRef.current.files[0]);
    fd.append("documentMasterId", String(uploadTarget));
    if (uploadMeta.documentNumber) fd.append("documentNumber", uploadMeta.documentNumber);
    if (uploadMeta.issueDate) fd.append("issueDate", uploadMeta.issueDate);
    if (uploadMeta.expiryDate) fd.append("expiryDate", uploadMeta.expiryDate);
    if (uploadMeta.remarks) fd.append("remarks", uploadMeta.remarks);

    try {
      await uploadEntityDocument(branchId, sessionId, studentId, fd);
      toast({ title: "Document uploaded" });
      setUploadTarget(null);
      setUploadMeta({ documentNumber: "", issueDate: "", expiryDate: "", remarks: "" });
      if (fileRef.current) fileRef.current.value = "";
      invalidate();
    } catch (e) {
      toast({ title: "Upload failed", description: String(e), variant: "destructive" });
    }
  };

  const verifyDocument = async (documentId: number, status: "verified" | "rejected") => {
    try {
      await updateEntityDocument(branchId, sessionId, studentId, documentId, { verificationStatus: status });
      toast({ title: status === "verified" ? "Document verified" : "Document rejected" });
      invalidate();
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading documents...</p>;

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{summary.completionPercent}%</p><p className="text-xs text-muted-foreground">Completion</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-500">{summary.missing}</p><p className="text-xs text-muted-foreground">Missing</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{summary.expired}</p><p className="text-xs text-muted-foreground">Expired</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{summary.pendingVerification}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{summary.rejected}</p><p className="text-xs text-muted-foreground">Rejected</p></CardContent></Card>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Label className="shrink-0">Filter:</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="pending">Pending Verification</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Document Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No document types configured. Add types in Document Master settings.
            </p>
          )}
          {items.map((item) => (
            <div key={item.documentMasterId} className="flex items-start justify-between gap-4 p-4 rounded-lg border">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  <StatusBadge item={item} />
                </div>
                {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                {item.document && (
                  <div className="text-xs text-muted-foreground space-y-0.5 mt-2">
                    {item.document.documentNumber && <p>Doc #: {item.document.documentNumber}</p>}
                    {item.document.expiryDate && <p>Expires: {item.document.expiryDate}</p>}
                    {item.document.fileName && <p>File: {item.document.fileName}</p>}
                    {item.document.previewUrl && (
                      <a href={item.document.previewUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                        View file
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {item.document?.verificationStatus === "pending" && item.document.id && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => verifyDocument(item.document!.id, "verified")}>Verify</Button>
                    <Button size="sm" variant="ghost" onClick={() => verifyDocument(item.document!.id, "rejected")}>Reject</Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => setUploadTarget(item.documentMasterId)}>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {item.document ? "Replace" : "Upload"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {uploadTarget != null && (
        <Card>
          <CardHeader><CardTitle className="text-base">Upload Document</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>File</Label>
              <Input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" />
            </div>
            <div className="space-y-1.5"><Label>Document Number</Label><Input value={uploadMeta.documentNumber} onChange={(e) => setUploadMeta({ ...uploadMeta, documentNumber: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Issue Date</Label><Input type="date" value={uploadMeta.issueDate} onChange={(e) => setUploadMeta({ ...uploadMeta, issueDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Expiry Date</Label><Input type="date" value={uploadMeta.expiryDate} onChange={(e) => setUploadMeta({ ...uploadMeta, expiryDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Remarks</Label><Input value={uploadMeta.remarks} onChange={(e) => setUploadMeta({ ...uploadMeta, remarks: e.target.value })} /></div>
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={handleUpload}>Upload</Button>
              <Button variant="outline" onClick={() => setUploadTarget(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
