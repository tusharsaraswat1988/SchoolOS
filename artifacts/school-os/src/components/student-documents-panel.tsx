import { useCallback, useEffect, useRef, useState } from "react";
import { apiDelete, apiGet, apiUpload } from "@/lib/api";
import { useScope } from "@/lib/use-scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, RefreshCw, Trash2, Upload } from "lucide-react";

export const DOCUMENT_TYPES = [
  { value: "student_photo", label: "Student Photo" },
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "aadhaar", label: "Aadhaar" },
  { value: "transfer_certificate", label: "Transfer Certificate" },
  { value: "other", label: "Other" },
] as const;

type DocType = (typeof DOCUMENT_TYPES)[number]["value"];

type StudentDocument = {
  id: number;
  documentType: DocType;
  label?: string | null;
  fileName?: string | null;
  previewUrl?: string | null;
};

export function StudentDocumentsPanel({ studentId }: { studentId: number }) {
  const { branchId, sessionId } = useScope();
  const { toast } = useToast();
  const base = `/branches/${branchId}/sessions/${sessionId}/students/${studentId}/documents`;
  const [docs, setDocs] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherLabel, setOtherLabel] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ data: StudentDocument[] }>(base);
      setDocs(res.data);
    } catch (e) {
      toast({ title: "Failed to load documents", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [base, toast]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const docsForType = (type: DocType) =>
    type === "other" ? docs.filter((d) => d.documentType === "other") : docs.filter((d) => d.documentType === type);

  const uploadFile = async (type: DocType, file: File, existingId?: number) => {
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", type);
    if (type === "other" && otherLabel.trim()) form.append("label", otherLabel.trim());

    try {
      if (existingId) {
        await apiUpload(`${base}/${existingId}`, form, "PUT");
      } else {
        await apiUpload(base, form, "POST");
      }
      toast({ title: existingId ? "Document replaced" : "Document uploaded" });
      await load();
    } catch (e) {
      toast({ title: "Upload failed", description: String(e), variant: "destructive" });
    }
  };

  const deleteDoc = async (docId: number) => {
    try {
      await apiDelete(`${base}/${docId}`);
      toast({ title: "Document deleted" });
      await load();
    } catch (e) {
      toast({ title: "Delete failed", description: String(e), variant: "destructive" });
    }
  };

  const previewDoc = async (doc: StudentDocument) => {
    try {
      const res = await apiGet<{ previewUrl: string }>(`${base}/${doc.id}/preview`);
      window.open(res.previewUrl, "_blank", "noopener,noreferrer");
    } catch {
      if (doc.previewUrl) window.open(doc.previewUrl, "_blank", "noopener,noreferrer");
      else toast({ title: "Preview unavailable", variant: "destructive" });
    }
  };

  const pickFile = (type: DocType, existingId?: number) => {
    const input = fileRefs.current[existingId ? `replace-${existingId}` : type];
    input?.click();
    if (input) {
      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) await uploadFile(type, file, existingId);
        input.value = "";
      };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Student Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        ) : (
          DOCUMENT_TYPES.filter((t) => t.value !== "other").map((type) => {
            const existing = docsForType(type.value)[0];
            return (
              <div key={type.value} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div>
                  <p className="font-medium text-sm">{type.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {existing?.fileName ?? "Not uploaded"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    className="hidden"
                    ref={(el) => { fileRefs.current[type.value] = el; }}
                    accept="image/*,.pdf"
                  />
                  {existing ? (
                    <>
                      <Button type="button" size="sm" variant="outline" onClick={() => previewDoc(existing)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />Preview
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => pickFile(type.value, existing.id)}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />Replace
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => deleteDoc(existing.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                      </Button>
                      <input
                        type="file"
                        className="hidden"
                        ref={(el) => { fileRefs.current[`replace-${existing.id}`] = el; }}
                        accept="image/*,.pdf"
                      />
                    </>
                  ) : (
                    <Button type="button" size="sm" onClick={() => pickFile(type.value)}>
                      <Upload className="h-3.5 w-3.5 mr-1" />Upload
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}

        <div className="space-y-3 pt-2">
          <p className="font-medium text-sm">Other Documents</p>
          <div className="flex gap-2 flex-wrap items-end">
            <div className="space-y-1">
              <Label>Label (optional)</Label>
              <Input value={otherLabel} onChange={(e) => setOtherLabel(e.target.value)} placeholder="e.g. Medical report" className="w-48" />
            </div>
            <input
              type="file"
              className="hidden"
              ref={(el) => { fileRefs.current.other = el; }}
              accept="image/*,.pdf"
            />
            <Button type="button" size="sm" onClick={() => pickFile("other")}>
              <Upload className="h-3.5 w-3.5 mr-1" />Upload Other
            </Button>
          </div>
          {docsForType("other").map((doc) => (
            <div key={doc.id} className="flex items-center justify-between text-sm border-b py-2">
              <span>{doc.label ?? doc.fileName ?? "Other document"}</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => previewDoc(doc)}>Preview</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => pickFile("other", doc.id)}>Replace</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => deleteDoc(doc.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
