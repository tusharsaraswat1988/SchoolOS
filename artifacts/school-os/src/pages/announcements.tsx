import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import { useListAnnouncements, useCreateAnnouncement, useDeleteAnnouncement, getListAnnouncementsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Megaphone, Trash2, Bell } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-500/15 text-zinc-500 border-zinc-500/20",
  normal: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  high: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  urgent: "bg-red-500/15 text-red-600 border-red-500/20",
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Everyone",
  teachers: "Teachers",
  students: "Students",
  parents: "Parents",
};

export default function Announcements() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: announcements, isLoading } = useListAnnouncements(schoolId, {}, {
    query: { queryKey: getListAnnouncementsQueryKey(schoolId, {}) },
  });

  const createAnn = useCreateAnnouncement({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAnnouncementsQueryKey(schoolId) });
        setOpen(false);
        setForm({ title: "", content: "", audience: "all", priority: "normal" });
      },
    },
  });

  const deleteAnn = useDeleteAnnouncement({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListAnnouncementsQueryKey(schoolId) }),
    },
  });

  const [form, setForm] = useState({ title: "", content: "", audience: "all", priority: "normal" });
  const field = (key: keyof typeof form, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAnn.mutate({
      schoolId,
      data: {
        title: form.title,
        content: form.content,
        audience: form.audience as any,
        priority: form.priority as any,
        authorId: user?.id,
      },
    });
  };

  const items = announcements ?? [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
            <p className="text-muted-foreground text-sm mt-1">{items.length} announcements</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />New Announcement</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input required value={form.title} onChange={(e) => field("title", e.target.value)} placeholder="Annual Sports Day 2026" />
                </div>
                <div className="space-y-1.5">
                  <Label>Content</Label>
                  <Textarea required value={form.content} onChange={(e) => field("content", e.target.value)} rows={4} placeholder="Write announcement content..." className="resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Audience</Label>
                    <Select value={form.audience} onValueChange={(v) => field("audience", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(AUDIENCE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => field("priority", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["low", "normal", "high", "urgent"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={createAnn.isPending}>{createAnn.isPending ? "Posting..." : "Post Announcement"}</Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Megaphone className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((ann) => (
              <Card key={ann.id} className="hover:border-border/80 transition-colors">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        ann.priority === "urgent" ? "bg-red-500/10" :
                        ann.priority === "high" ? "bg-amber-500/10" : "bg-primary/10"
                      }`}>
                        <Bell className={`h-4 w-4 ${
                          ann.priority === "urgent" ? "text-red-600" :
                          ann.priority === "high" ? "text-amber-600" : "text-primary"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-sm">{ann.title}</h3>
                          <Badge variant="outline" className={`text-xs capitalize ${PRIORITY_COLORS[ann.priority ?? "normal"]}`}>
                            {ann.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {AUDIENCE_LABELS[ann.audience ?? "all"]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{ann.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {ann.authorName && <span className="text-xs text-muted-foreground">By {ann.authorName}</span>}
                          <span className="text-xs text-muted-foreground">
                            {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => deleteAnn.mutate({ schoolId, announcementId: ann.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
