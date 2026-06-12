import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useScope } from "@/lib/use-scope";
import {
  createDocumentMaster,
  fetchDocumentMaster,
  updateDocumentMaster,
  type DocumentMaster,
} from "@/lib/student-master-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus } from "lucide-react";

const MODULE_OPTIONS = ["student", "staff", "teacher", "driver", "vehicle", "vendor"] as const;

const DEFAULT_TYPES = [
  { name: "Aadhaar Card", isMandatory: true, allowDocumentNumber: true },
  { name: "Birth Certificate", isMandatory: true },
  { name: "Transfer Certificate", isMandatory: false, allowExpiryDate: true },
  { name: "Previous School TC", isMandatory: false },
  { name: "Caste Certificate", isMandatory: false, allowExpiryDate: true },
  { name: "Income Certificate", isMandatory: false, allowExpiryDate: true },
  { name: "RTE Proof", isMandatory: false },
  { name: "Passport", isMandatory: false, allowExpiryDate: true, allowDocumentNumber: true },
  { name: "Medical Certificate", isMandatory: false, allowExpiryDate: true },
];

type FormState = {
  name: string;
  description: string;
  applicableModules: string[];
  isMandatory: boolean;
  allowExpiryDate: boolean;
  allowDocumentNumber: boolean;
  allowedFileTypes: string;
};

const emptyForm = (): FormState => ({
  name: "",
  description: "",
  applicableModules: ["student"],
  isMandatory: false,
  allowExpiryDate: false,
  allowDocumentNumber: false,
  allowedFileTypes: "pdf,jpg,jpeg,png",
});

export default function DocumentMasterPage() {
  const { schoolId } = useScope();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const queryKey = ["document-master", schoolId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchDocumentMaster(schoolId!),
    enabled: !!schoolId,
  });

  const items = data?.data ?? [];

  const resetForm = () => {
    setForm(emptyForm());
    setEditId(null);
  };

  const openEdit = (item: DocumentMaster) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      applicableModules: item.applicableModules,
      isMandatory: item.isMandatory,
      allowExpiryDate: item.allowExpiryDate,
      allowDocumentNumber: item.allowDocumentNumber,
      allowedFileTypes: item.allowedFileTypes.join(","),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!schoolId || !form.name) return;
    const body = {
      name: form.name,
      description: form.description || null,
      applicableModules: form.applicableModules,
      isMandatory: form.isMandatory,
      allowExpiryDate: form.allowExpiryDate,
      allowDocumentNumber: form.allowDocumentNumber,
      allowedFileTypes: form.allowedFileTypes.split(",").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editId) {
        await updateDocumentMaster(schoolId, editId, body);
        toast({ title: "Document type updated" });
      } else {
        await createDocumentMaster(schoolId, body);
        toast({ title: "Document type created" });
      }
      setOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey });
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
  };

  const seedDefaults = async () => {
    if (!schoolId) return;
    try {
      for (const t of DEFAULT_TYPES) {
        const exists = items.some((i) => i.name === t.name);
        if (exists) continue;
        await createDocumentMaster(schoolId, {
          name: t.name,
          description: null,
          applicableModules: ["student"],
          isMandatory: t.isMandatory ?? false,
          allowExpiryDate: t.allowExpiryDate ?? false,
          allowDocumentNumber: t.allowDocumentNumber ?? false,
          allowedFileTypes: ["pdf", "jpg", "jpeg", "png"],
        });
      }
      toast({ title: "Default document types added" });
      qc.invalidateQueries({ queryKey });
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
  };

  const toggleActive = async (item: DocumentMaster) => {
    if (!schoolId) return;
    await updateDocumentMaster(schoolId, item.id, { isActive: !item.isActive });
    qc.invalidateQueries({ queryKey });
  };

  if (!schoolId) {
    return (
      <Layout>
        <p className="text-muted-foreground">School context required.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Master</h1>
            <p className="text-muted-foreground text-sm">Configure document types for students, staff, and other entities</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={seedDefaults}>Seed Defaults</Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Add Type</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editId ? "Edit Document Type" : "New Document Type"}</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Applicable Modules</Label>
                    <div className="flex flex-wrap gap-3">
                      {MODULE_OPTIONS.map((m) => (
                        <label key={m} className="flex items-center gap-2 text-sm capitalize">
                          <Checkbox
                            checked={form.applicableModules.includes(m)}
                            onCheckedChange={(c) => {
                              setForm({
                                ...form,
                                applicableModules: c
                                  ? [...form.applicableModules, m]
                                  : form.applicableModules.filter((x) => x !== m),
                              });
                            }}
                          />
                          {m}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.isMandatory} onCheckedChange={(c) => setForm({ ...form, isMandatory: !!c })} /> Mandatory</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.allowExpiryDate} onCheckedChange={(c) => setForm({ ...form, allowExpiryDate: !!c })} /> Allow Expiry</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.allowDocumentNumber} onCheckedChange={(c) => setForm({ ...form, allowDocumentNumber: !!c })} /> Allow Doc Number</label>
                  </div>
                  <div className="space-y-1.5"><Label>Allowed File Types (comma-separated)</Label><Input value={form.allowedFileTypes} onChange={(e) => setForm({ ...form, allowedFileTypes: e.target.value })} /></div>
                  <Button onClick={save}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Document Types</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!isLoading && items.length === 0 && (
              <p className="text-sm text-muted-foreground">No document types yet. Add manually or seed defaults.</p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    {item.isMandatory && <Badge variant="outline">Mandatory</Badge>}
                    {!item.isActive && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.applicableModules.map((m) => (
                      <Badge key={m} variant="secondary" className="text-xs capitalize">{m}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(item)}>
                    {item.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
