import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { apiGet, apiSend } from "@/lib/api";
import { useScope } from "@/lib/use-scope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FieldCatalog = {
  header: string[];
  middleColumns: string[];
  middleSummary: string[];
  footer: string[];
};

type TemplateRow = {
  id: number;
  name: string;
  title: string;
  isDefault: boolean;
  layoutConfig: {
    header: { fields: string[]; showLogo?: boolean; customLines?: string[] };
    middle: { columns: string[]; summaryRows: string[]; showAmountInWords?: boolean };
    footer: { fields: string[]; showSignatureBlocks?: boolean };
  };
};

type BillingSettingsResponse = {
  session: { defaultFeeDueDay: number; prorateMidMonthAdmission: boolean };
  settings: {
    invoiceTemplateId: number | null;
    invoicePrefix: string | null;
    paymentInstructions: string | null;
    bankName: string | null;
    bankAccount: string | null;
    bankIfsc: string | null;
    upiId: string | null;
    footerNotes: string | null;
    termsAndConditions: string | null;
    authorizedSignatory: string | null;
  } | null;
  templates: TemplateRow[];
  fieldCatalog: FieldCatalog;
  invoiceSequence: { prefix: string; nextValue: number } | null;
};

function FieldPicker({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((field) => {
          const checked = selected.includes(field);
          return (
            <label key={field} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => {
                  if (value) onChange([...selected, field]);
                  else onChange(selected.filter((f) => f !== field));
                }}
              />
              <span className="font-mono text-xs">{field}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function BillingInvoiceSettingsPage() {
  const { branchId, sessionId } = useScope();
  const [data, setData] = useState<BillingSettingsResponse | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [draft, setDraft] = useState<TemplateRow["layoutConfig"] | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    invoicePrefix: "",
    paymentInstructions: "",
    bankName: "",
    bankAccount: "",
    bankIfsc: "",
    upiId: "",
    footerNotes: "",
    termsAndConditions: "",
    authorizedSignatory: "",
    defaultFeeDueDay: "10",
    prorateMidMonthAdmission: true,
  });
  const [status, setStatus] = useState("");

  const load = async () => {
    const res = await apiGet<BillingSettingsResponse>(
      `/branches/${branchId}/sessions/${sessionId}/billing-settings`,
    );
    setData(res);
    const activeId = res.settings?.invoiceTemplateId ?? res.templates.find((t) => t.isDefault)?.id ?? null;
    setSelectedTemplateId(activeId);
    const template = res.templates.find((t) => t.id === activeId) ?? res.templates[0];
    setDraft(template?.layoutConfig ?? null);
    setSettingsForm({
      invoicePrefix: res.settings?.invoicePrefix ?? res.invoiceSequence?.prefix ?? "",
      paymentInstructions: res.settings?.paymentInstructions ?? "",
      bankName: res.settings?.bankName ?? "",
      bankAccount: res.settings?.bankAccount ?? "",
      bankIfsc: res.settings?.bankIfsc ?? "",
      upiId: res.settings?.upiId ?? "",
      footerNotes: res.settings?.footerNotes ?? "",
      termsAndConditions: res.settings?.termsAndConditions ?? "",
      authorizedSignatory: res.settings?.authorizedSignatory ?? "",
      defaultFeeDueDay: String(res.session.defaultFeeDueDay),
      prorateMidMonthAdmission: res.session.prorateMidMonthAdmission,
    });
  };

  useEffect(() => {
    load().catch(console.error);
  }, [branchId, sessionId]);

  const selectedTemplate = useMemo(
    () => data?.templates.find((t) => t.id === selectedTemplateId),
    [data, selectedTemplateId],
  );

  const saveSettings = async () => {
    await apiSend(`/branches/${branchId}/sessions/${sessionId}/billing-settings`, "PATCH", {
      invoiceTemplateId: selectedTemplateId,
      invoicePrefix: settingsForm.invoicePrefix || null,
      paymentInstructions: settingsForm.paymentInstructions || null,
      bankName: settingsForm.bankName || null,
      bankAccount: settingsForm.bankAccount || null,
      bankIfsc: settingsForm.bankIfsc || null,
      upiId: settingsForm.upiId || null,
      footerNotes: settingsForm.footerNotes || null,
      termsAndConditions: settingsForm.termsAndConditions || null,
      authorizedSignatory: settingsForm.authorizedSignatory || null,
      defaultFeeDueDay: Number(settingsForm.defaultFeeDueDay),
      prorateMidMonthAdmission: settingsForm.prorateMidMonthAdmission,
    });
    setStatus("Settings saved");
    await load();
  };

  const saveTemplate = async () => {
    if (!selectedTemplateId || !draft) return;
    await apiSend(`/branches/${branchId}/invoice-templates/${selectedTemplateId}`, "PATCH", {
      layoutConfig: draft,
    });
    setStatus("Template layout saved");
    await load();
  };

  if (!data || !draft) {
    return (
      <Layout>
        <p className="text-muted-foreground">Loading invoicing settings…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Invoicing & Billbook Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure billbook header, fee details (middle), and footer — prefix, bank details, and print fields.
          </p>
        </div>

        {status ? <p className="text-sm text-green-700">{status}</p> : null}

        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="settings">Session Settings</TabsTrigger>
            <TabsTrigger value="template">Billbook Template</TabsTrigger>
            <TabsTrigger value="preview">Layout Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoicing settings</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Active template</Label>
                  <Select
                    value={selectedTemplateId ? String(selectedTemplateId) : undefined}
                    onValueChange={(v) => {
                      const id = Number(v);
                      setSelectedTemplateId(id);
                      const t = data.templates.find((row) => row.id === id);
                      if (t) setDraft(t.layoutConfig);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.templates.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name} {t.isDefault ? "(default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Invoice number prefix</Label>
                  <Input
                    value={settingsForm.invoicePrefix}
                    onChange={(e) => setSettingsForm({ ...settingsForm, invoicePrefix: e.target.value })}
                    placeholder="INV-2526-"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default fee due day</Label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={settingsForm.defaultFeeDueDay}
                    onChange={(e) => setSettingsForm({ ...settingsForm, defaultFeeDueDay: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Authorized signatory</Label>
                  <Input
                    value={settingsForm.authorizedSignatory}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, authorizedSignatory: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Payment instructions</Label>
                  <Textarea
                    value={settingsForm.paymentInstructions}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, paymentInstructions: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank name</Label>
                  <Input
                    value={settingsForm.bankName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank account</Label>
                  <Input
                    value={settingsForm.bankAccount}
                    onChange={(e) => setSettingsForm({ ...settingsForm, bankAccount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IFSC</Label>
                  <Input
                    value={settingsForm.bankIfsc}
                    onChange={(e) => setSettingsForm({ ...settingsForm, bankIfsc: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>UPI ID</Label>
                  <Input
                    value={settingsForm.upiId}
                    onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Footer notes</Label>
                  <Textarea
                    value={settingsForm.footerNotes}
                    onChange={(e) => setSettingsForm({ ...settingsForm, footerNotes: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Terms & conditions</Label>
                  <Textarea
                    value={settingsForm.termsAndConditions}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, termsAndConditions: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Button onClick={() => saveSettings().catch(console.error)}>Save settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Template: {selectedTemplate?.name ?? "—"} — {selectedTemplate?.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FieldPicker
                  label="Header — school / student / invoice fields"
                  options={data.fieldCatalog.header}
                  selected={draft.header.fields}
                  onChange={(fields) => setDraft({ ...draft, header: { ...draft.header, fields } })}
                />
                <FieldPicker
                  label="Middle — fee line columns"
                  options={data.fieldCatalog.middleColumns}
                  selected={draft.middle.columns}
                  onChange={(columns) => setDraft({ ...draft, middle: { ...draft.middle, columns } })}
                />
                <FieldPicker
                  label="Middle — totals & calculations"
                  options={data.fieldCatalog.middleSummary}
                  selected={draft.middle.summaryRows}
                  onChange={(summaryRows) =>
                    setDraft({ ...draft, middle: { ...draft.middle, summaryRows } })
                  }
                />
                <FieldPicker
                  label="Footer — payment / bank / signature fields"
                  options={data.fieldCatalog.footer}
                  selected={draft.footer.fields}
                  onChange={(fields) => setDraft({ ...draft, footer: { ...draft.footer, fields } })}
                />
                <Button onClick={() => saveTemplate().catch(console.error)}>Save template layout</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Billbook layout preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 font-mono text-xs">
                <section className="rounded border p-4">
                  <p className="mb-2 font-sans text-sm font-semibold">Header</p>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {draft.header.fields.map((field) => (
                      <div key={field}>
                        {field}: <span className="text-muted-foreground">…</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="rounded border p-4">
                  <p className="mb-2 font-sans text-sm font-semibold">Middle — fee details</p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr>
                          {draft.middle.columns.map((col) => (
                            <th key={col} className="border px-2 py-1">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {draft.middle.columns.map((col) => (
                            <td key={col} className="border px-2 py-1 text-muted-foreground">
                              sample
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 space-y-1">
                    {draft.middle.summaryRows.map((row) => (
                      <div key={row}>
                        {row}: <span className="text-muted-foreground">₹ …</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="rounded border p-4">
                  <p className="mb-2 font-sans text-sm font-semibold">Footer</p>
                  <div className="grid gap-1">
                    {draft.footer.fields.map((field) => (
                      <div key={field}>
                        {field}: <span className="text-muted-foreground">…</span>
                      </div>
                    ))}
                  </div>
                </section>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
