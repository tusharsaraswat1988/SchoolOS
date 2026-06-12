import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { useScope } from "@/lib/use-scope";
import { apiGet, apiSend } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Phone,
  UserPlus,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from "lucide-react";

type LeadRow = {
  id: number;
  childName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string | null;
  source: string;
  sourceDetail: string | null;
  interestedClassId: number | null;
  interestedClassName: string | null;
  status: string;
  initialInquiryNotes: string | null;
  lostReason: string | null;
  lostReasonNotes: string | null;
  convertedStudentId: number | null;
  convertedAt: string | null;
  nextFollowUpAt: string | null;
  assignedToName: string | null;
  followUpCount: number;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type FollowUp = {
  id: number;
  contactMethod: string;
  contactedAt: string;
  discussionSummary: string;
  theirResponse: string | null;
  nextFollowUpAt: string | null;
  createdByName: string | null;
};

type LeadDetail = LeadRow & { followUps: FollowUp[] };

type Summary = {
  totals: { total: number; converted: number; lost: number; active: number };
  conversionRate: number;
  overdueFollowUps: number;
  bySource: Array<{ source: string; count: number; converted: number; conversionRate: number }>;
};

type ClassOption = { id: number; name: string; code: string };

const SOURCE_LABELS: Record<string, string> = {
  walk_in: "Walk-in",
  phone_inquiry: "Phone",
  website: "Website",
  social_media: "Social Media",
  referral: "Referral",
  camp_event: "Camp / Event",
  newspaper: "Newspaper",
  hoarding: "Hoarding",
  agent: "Agent",
  existing_parent: "Existing Parent",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-up",
  visited: "Visited",
  converted: "Converted",
  lost: "Lost",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  contacted: "bg-violet-500/15 text-violet-600 border-violet-500/20",
  follow_up: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  visited: "bg-cyan-500/15 text-cyan-600 border-cyan-500/20",
  converted: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  lost: "bg-red-500/15 text-red-600 border-red-500/20",
};

const LOST_REASON_LABELS: Record<string, string> = {
  fee_too_high: "Fee too high",
  joined_other_school: "Joined other school",
  location: "Location",
  timing: "Timing",
  no_response: "No response",
  changed_mind: "Changed mind",
  other: "Other",
};

const CONTACT_LABELS: Record<string, string> = {
  call: "Call",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  in_person: "In person",
  other: "Other",
};

const EMPTY_LEAD = {
  childName: "",
  parentName: "",
  parentPhone: "",
  parentEmail: "",
  source: "other",
  sourceDetail: "",
  interestedClassId: "",
  initialInquiryNotes: "",
};

const EMPTY_FOLLOW_UP = {
  contactMethod: "call",
  discussionSummary: "",
  theirResponse: "",
  nextFollowUpAt: "",
  statusAfter: "follow_up",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(nextFollowUpAt: string | null, status: string) {
  if (!nextFollowUpAt || status === "converted" || status === "lost") return false;
  return new Date(nextFollowUpAt) < new Date();
}

export default function AdmissionLeads() {
  const { branchId, sessionId, isReady } = useScope();
  const { toast } = useToast();

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_LEAD);
  const [saving, setSaving] = useState(false);

  const [detailLead, setDetailLead] = useState<LeadDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState(EMPTY_FOLLOW_UP);
  const [lostForm, setLostForm] = useState({ lostReason: "other", lostReasonNotes: "" });

  const basePath =
    branchId && sessionId
      ? `/branches/${branchId}/sessions/${sessionId}/admission-leads`
      : null;

  const load = useCallback(async () => {
    if (!basePath) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (overdueOnly) params.set("overdueOnly", "true");
      const query = params.toString() ? `?${params.toString()}` : "";

      const [listRes, summaryRes, classesRes] = await Promise.all([
        apiGet<{ data: LeadRow[] }>(`${basePath}${query}`),
        apiGet<Summary>(`${basePath}/summary`),
        apiGet<ClassOption[]>(`/branches/${branchId}/sessions/${sessionId}/classes`),
      ]);
      setLeads(listRes.data ?? []);
      setSummary(summaryRes);
      setClasses(classesRes ?? []);
    } catch (e) {
      toast({ title: "Failed to load leads", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [basePath, branchId, sessionId, statusFilter, overdueOnly, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (leadId: number) => {
    if (!basePath) return;
    try {
      const detail = await apiGet<LeadDetail>(`${basePath}/${leadId}`);
      setDetailLead(detail);
      setFollowUpForm(EMPTY_FOLLOW_UP);
      setLostForm({ lostReason: "other", lostReasonNotes: "" });
      setDetailOpen(true);
    } catch (e) {
      toast({ title: "Failed to load lead", description: String(e), variant: "destructive" });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!basePath) return;
    setSaving(true);
    try {
      await apiSend(basePath, "POST", {
        childName: createForm.childName,
        parentName: createForm.parentName,
        parentPhone: createForm.parentPhone,
        parentEmail: createForm.parentEmail || null,
        source: createForm.source,
        sourceDetail: createForm.sourceDetail || null,
        interestedClassId: createForm.interestedClassId
          ? Number(createForm.interestedClassId)
          : null,
        initialInquiryNotes: createForm.initialInquiryNotes || null,
      });
      setCreateForm(EMPTY_LEAD);
      setCreateOpen(false);
      toast({ title: "Lead added" });
      await load();
    } catch (err) {
      toast({ title: "Create failed", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!basePath || !detailLead) return;
    setSaving(true);
    try {
      await apiSend(`${basePath}/${detailLead.id}/follow-ups`, "POST", {
        contactMethod: followUpForm.contactMethod,
        discussionSummary: followUpForm.discussionSummary,
        theirResponse: followUpForm.theirResponse || null,
        nextFollowUpAt: followUpForm.nextFollowUpAt
          ? new Date(followUpForm.nextFollowUpAt).toISOString()
          : null,
        statusAfter: followUpForm.statusAfter,
      });
      toast({ title: "Follow-up recorded" });
      await openDetail(detailLead.id);
      await load();
    } catch (err) {
      toast({ title: "Failed", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const markConverted = async () => {
    if (!basePath || !detailLead) return;
    try {
      await apiSend(`${basePath}/${detailLead.id}`, "PATCH", { status: "converted" });
      toast({ title: "Marked as converted" });
      setDetailOpen(false);
      await load();
    } catch (err) {
      toast({ title: "Update failed", description: String(err), variant: "destructive" });
    }
  };

  const markLost = async () => {
    if (!basePath || !detailLead) return;
    try {
      await apiSend(`${basePath}/${detailLead.id}`, "PATCH", {
        status: "lost",
        lostReason: lostForm.lostReason,
        lostReasonNotes: lostForm.lostReasonNotes || null,
      });
      toast({ title: "Marked as lost" });
      setDetailOpen(false);
      await load();
    } catch (err) {
      toast({ title: "Update failed", description: String(err), variant: "destructive" });
    }
  };

  if (!isReady || !branchId || !sessionId) {
    return (
      <Layout>
        <p className="text-muted-foreground text-sm">Select a branch and session to manage admission leads.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admission Leads</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track inquiries, follow-ups, and conversions from any source
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Admission Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => void handleCreate(e)} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Child name</Label>
                    <Input
                      required
                      value={createForm.childName}
                      onChange={(e) => setCreateForm((f) => ({ ...f, childName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Parent name</Label>
                    <Input
                      required
                      value={createForm.parentName}
                      onChange={(e) => setCreateForm((f) => ({ ...f, parentName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      required
                      value={createForm.parentPhone}
                      onChange={(e) => setCreateForm((f) => ({ ...f, parentPhone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={createForm.parentEmail}
                      onChange={(e) => setCreateForm((f) => ({ ...f, parentEmail: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Source</Label>
                    <Select
                      value={createForm.source}
                      onValueChange={(v) => setCreateForm((f) => ({ ...f, source: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Source detail</Label>
                    <Input
                      placeholder="e.g. Facebook ad, Sharma uncle"
                      value={createForm.sourceDetail}
                      onChange={(e) => setCreateForm((f) => ({ ...f, sourceDetail: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Interested class</Label>
                  <Select
                    value={createForm.interestedClassId || "none"}
                    onValueChange={(v) =>
                      setCreateForm((f) => ({ ...f, interestedClassId: v === "none" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Initial inquiry notes</Label>
                  <Textarea
                    rows={3}
                    value={createForm.initialInquiryNotes}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, initialInquiryNotes: e.target.value }))
                    }
                    className="resize-none"
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Lead"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{summary.totals.total}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Converted</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-2xl font-bold">{summary.totals.converted}</span>
                <Badge variant="outline">{summary.conversionRate}%</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active / Lost</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  {summary.totals.active}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  {summary.totals.lost}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Follow-ups</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-red-600" />
                <span className="text-2xl font-bold">{summary.overdueFollowUps}</span>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={overdueOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setOverdueOnly((v) => !v)}
          >
            Overdue only
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : leads.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No leads yet. Add your first inquiry above.</p>
            ) : (
              <div className="divide-y">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => void openDetail(lead.id)}
                    className="flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{lead.childName}</span>
                        <Badge variant="outline" className={STATUS_COLORS[lead.status] ?? ""}>
                          {STATUS_LABELS[lead.status] ?? lead.status}
                        </Badge>
                        {isOverdue(lead.nextFollowUpAt, lead.status) && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {lead.parentName} · {lead.parentPhone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {SOURCE_LABELS[lead.source] ?? lead.source}
                        {lead.sourceDetail ? ` — ${lead.sourceDetail}` : ""}
                        {lead.interestedClassName ? ` · ${lead.interestedClassName}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <MessageSquare className="h-3 w-3" />
                        {lead.followUpCount} follow-ups
                      </div>
                      {lead.nextFollowUpAt && lead.status !== "converted" && lead.status !== "lost" && (
                        <p className="mt-1">Next: {formatDate(lead.nextFollowUpAt)}</p>
                      )}
                      {lead.lastContactedAt && (
                        <p className="mt-1">Last: {formatDate(lead.lastContactedAt)}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {detailLead && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex flex-wrap items-center gap-2">
                    {detailLead.childName}
                    <Badge variant="outline" className={STATUS_COLORS[detailLead.status] ?? ""}>
                      {STATUS_LABELS[detailLead.status]}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <p>
                      <span className="text-muted-foreground">Parent:</span> {detailLead.parentName}
                    </p>
                    <p className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {detailLead.parentPhone}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Source:</span>{" "}
                      {SOURCE_LABELS[detailLead.source]}
                      {detailLead.sourceDetail ? ` (${detailLead.sourceDetail})` : ""}
                    </p>
                    {detailLead.interestedClassName && (
                      <p>
                        <span className="text-muted-foreground">Class:</span> {detailLead.interestedClassName}
                      </p>
                    )}
                    {detailLead.initialInquiryNotes && (
                      <p className="sm:col-span-2">
                        <span className="text-muted-foreground">Initial notes:</span>{" "}
                        {detailLead.initialInquiryNotes}
                      </p>
                    )}
                    {detailLead.status === "lost" && detailLead.lostReason && (
                      <p className="sm:col-span-2 text-red-600">
                        Lost: {LOST_REASON_LABELS[detailLead.lostReason]}
                        {detailLead.lostReasonNotes ? ` — ${detailLead.lostReasonNotes}` : ""}
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Follow-up timeline</h3>
                    {detailLead.followUps.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No follow-ups yet.</p>
                    ) : (
                      <div className="space-y-3 border-l-2 border-muted pl-4 ml-2">
                        {detailLead.followUps.map((fu) => (
                          <div key={fu.id} className="relative">
                            <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                            <p className="text-xs text-muted-foreground">
                              {formatDate(fu.contactedAt)} · {CONTACT_LABELS[fu.contactMethod]}
                              {fu.createdByName ? ` · ${fu.createdByName}` : ""}
                            </p>
                            <p className="text-sm mt-0.5">
                              <span className="text-muted-foreground">We said:</span> {fu.discussionSummary}
                            </p>
                            {fu.theirResponse && (
                              <p className="text-sm mt-0.5">
                                <span className="text-muted-foreground">They said:</span> {fu.theirResponse}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {detailLead.status !== "converted" && detailLead.status !== "lost" && (
                    <>
                      <form onSubmit={(e) => void handleFollowUp(e)} className="space-y-3 border-t pt-4">
                        <h3 className="font-medium">Add follow-up</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Contact method</Label>
                            <Select
                              value={followUpForm.contactMethod}
                              onValueChange={(v) => setFollowUpForm((f) => ({ ...f, contactMethod: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(CONTACT_LABELS).map(([v, l]) => (
                                  <SelectItem key={v} value={v}>
                                    {l}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Status after</Label>
                            <Select
                              value={followUpForm.statusAfter}
                              onValueChange={(v) => setFollowUpForm((f) => ({ ...f, statusAfter: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["contacted", "follow_up", "visited"].map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {STATUS_LABELS[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>What we discussed</Label>
                          <Textarea
                            required
                            rows={2}
                            value={followUpForm.discussionSummary}
                            onChange={(e) =>
                              setFollowUpForm((f) => ({ ...f, discussionSummary: e.target.value }))
                            }
                            className="resize-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>What they said</Label>
                          <Textarea
                            rows={2}
                            value={followUpForm.theirResponse}
                            onChange={(e) =>
                              setFollowUpForm((f) => ({ ...f, theirResponse: e.target.value }))
                            }
                            className="resize-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Next follow-up</Label>
                          <Input
                            type="datetime-local"
                            value={followUpForm.nextFollowUpAt}
                            onChange={(e) =>
                              setFollowUpForm((f) => ({ ...f, nextFollowUpAt: e.target.value }))
                            }
                          />
                        </div>
                        <Button type="submit" size="sm" disabled={saving}>
                          Record follow-up
                        </Button>
                      </form>

                      <div className="flex flex-wrap gap-2 border-t pt-4">
                        <Button size="sm" variant="default" onClick={() => void markConverted()}>
                          Mark converted
                        </Button>
                        <div className="flex flex-wrap items-end gap-2 flex-1">
                          <Select
                            value={lostForm.lostReason}
                            onValueChange={(v) => setLostForm((f) => ({ ...f, lostReason: v }))}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(LOST_REASON_LABELS).map(([v, l]) => (
                                <SelectItem key={v} value={v}>
                                  {l}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Reason notes"
                            value={lostForm.lostReasonNotes}
                            onChange={(e) =>
                              setLostForm((f) => ({ ...f, lostReasonNotes: e.target.value }))
                            }
                            className="max-w-xs"
                          />
                          <Button size="sm" variant="outline" onClick={() => void markLost()}>
                            Mark lost
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
