import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  createStudentRelation,
  deleteStudentRelation,
  fetchSiblings,
  fetchStudentRelations,
  linkSibling,
  PRIMARY_CONTACT_OPTIONS,
  RELATION_TYPE_OPTIONS,
  setCommunicationPreference,
  unlinkSibling,
  updateStudentRelation,
  type PersonRelation,
  type PrimaryContactType,
  type RelationType,
} from "@/lib/student-master-api";
import { apiGet } from "@/lib/api";
import { Plus, Trash2, Users, Phone, Mail } from "lucide-react";

type Props = {
  branchId: number;
  sessionId: number;
  studentId: number;
  schoolId: number;
};

const emptyRelation = (): Partial<PersonRelation> & { fullName: string; relationType: RelationType } => ({
  fullName: "",
  relationType: "father",
  mobile: "",
  alternateMobile: "",
  email: "",
  aadhaar: "",
  pan: "",
  occupation: "",
  permanentSameAsCurrent: false,
  currentAddress: {},
  permanentAddress: {},
});

export function StudentRelationsTab({ branchId, sessionId, studentId, schoolId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<(Partial<PersonRelation> & { fullName: string; relationType: RelationType }) | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [siblingSearch, setSiblingSearch] = useState("");
  const [siblingResults, setSiblingResults] = useState<Array<{ id: number; firstName: string; lastName: string; admissionNumber: string }>>([]);

  const relationsKey = ["student-relations", branchId, sessionId, studentId];
  const siblingsKey = ["student-siblings", branchId, sessionId, studentId];

  const { data: relationsData, isLoading } = useQuery({
    queryKey: relationsKey,
    queryFn: () => fetchStudentRelations(branchId, sessionId, studentId),
  });

  const { data: siblingsData, refetch: refetchSiblings } = useQuery({
    queryKey: siblingsKey,
    queryFn: () => fetchSiblings(branchId, sessionId, studentId),
  });

  const relations = relationsData?.data ?? [];
  const primaryContact = relationsData?.primaryCommunicationContact;
  const siblings = siblingsData?.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: relationsKey });
    refetchSiblings();
  };

  const saveRelation = async () => {
    if (!editing?.fullName) return;
    try {
      if (editId) {
        await updateStudentRelation(branchId, sessionId, studentId, editId, editing);
        toast({ title: "Relation updated" });
      } else {
        await createStudentRelation(branchId, sessionId, studentId, editing);
        toast({ title: "Relation added" });
      }
      setEditing(null);
      setEditId(null);
      invalidate();
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
  };

  const removeRelation = async (relationId: number) => {
    try {
      await deleteStudentRelation(branchId, sessionId, studentId, relationId);
      toast({ title: "Relation removed" });
      invalidate();
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
  };

  const setPrimary = async (relationId: number, relationType: PrimaryContactType) => {
    try {
      await setCommunicationPreference(branchId, sessionId, studentId, {
        primaryRelationId: relationId,
        primaryRelationType: relationType,
      });
      toast({ title: "Primary communication contact updated" });
      invalidate();
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
  };

  const searchSiblings = useCallback(async () => {
    if (!siblingSearch.trim()) return;
    try {
      const res = await apiGet<{ data: Array<{ id: number; firstName: string; lastName: string; admissionNumber: string }> }>(
        `/branches/${branchId}/sessions/${sessionId}/students?search=${encodeURIComponent(siblingSearch)}&limit=10`,
      );
      setSiblingResults(res.data.filter((s) => s.id !== studentId));
    } catch {
      setSiblingResults([]);
    }
  }, [branchId, sessionId, siblingSearch, studentId]);

  useEffect(() => {
    const t = setTimeout(searchSiblings, 300);
    return () => clearTimeout(t);
  }, [searchSiblings]);

  const addSibling = async (siblingStudentId: number) => {
    try {
      await linkSibling(branchId, sessionId, studentId, siblingStudentId);
      toast({ title: "Sibling linked" });
      setSiblingSearch("");
      setSiblingResults([]);
      invalidate();
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading relations...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Family / Guardian Relations</CardTitle>
          <Button size="sm" onClick={() => { setEditing(emptyRelation()); setEditId(null); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Relation
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {relations.length === 0 && (
            <p className="text-sm text-muted-foreground">No relations added yet. Add father, mother, guardian, or other contacts.</p>
          )}
          {relations.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.fullName}</span>
                  <Badge variant="outline" className="capitalize">{r.relationType.replace("_", " ")}</Badge>
                  {primaryContact?.relationId === r.id && (
                    <Badge className="bg-primary/15 text-primary border-primary/20">Primary Contact</Badge>
                  )}
                </div>
                {r.mobile && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {r.mobile}
                  </p>
                )}
                {r.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {r.email}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {PRIMARY_CONTACT_OPTIONS.some((o) => o.value === r.relationType) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPrimary(r.id, r.relationType as PrimaryContactType)}
                    disabled={primaryContact?.relationId === r.id}
                  >
                    Set Primary
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setEditing({ ...r }); setEditId(r.id); }}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeRelation(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editId ? "Edit Relation" : "New Relation"}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Relation Type</Label>
              <Select
                value={editing.relationType}
                onValueChange={(v) => setEditing({ ...editing, relationType: v as RelationType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATION_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Mobile</Label><Input value={editing.mobile ?? ""} onChange={(e) => setEditing({ ...editing, mobile: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Alternate Mobile</Label><Input value={editing.alternateMobile ?? ""} onChange={(e) => setEditing({ ...editing, alternateMobile: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Occupation</Label><Input value={editing.occupation ?? ""} onChange={(e) => setEditing({ ...editing, occupation: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Aadhaar</Label><Input value={editing.aadhaar ?? ""} onChange={(e) => setEditing({ ...editing, aadhaar: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>PAN</Label><Input value={editing.pan ?? ""} onChange={(e) => setEditing({ ...editing, pan: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Current Address Line 1</Label><Input value={editing.currentAddress?.addressLine1 ?? ""} onChange={(e) => setEditing({ ...editing, currentAddress: { ...editing.currentAddress, addressLine1: e.target.value } })} /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={editing.currentAddress?.city ?? ""} onChange={(e) => setEditing({ ...editing, currentAddress: { ...editing.currentAddress, city: e.target.value } })} /></div>
            <div className="space-y-1.5"><Label>Pin Code</Label><Input value={editing.currentAddress?.pinCode ?? ""} onChange={(e) => setEditing({ ...editing, currentAddress: { ...editing.currentAddress, pinCode: e.target.value } })} /></div>
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={saveRelation}>Save Relation</Button>
              <Button variant="outline" onClick={() => { setEditing(null); setEditId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Sibling Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Search student to link as sibling</Label>
            <Input
              value={siblingSearch}
              onChange={(e) => setSiblingSearch(e.target.value)}
              placeholder="Search by name or admission number"
            />
          </div>
          {siblingResults.length > 0 && (
            <div className="space-y-2">
              {siblingResults.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">{s.firstName} {s.lastName} · {s.admissionNumber}</span>
                  <Button size="sm" variant="outline" onClick={() => addSibling(s.id)}>Link</Button>
                </div>
              ))}
            </div>
          )}
          {siblings.length > 0 ? (
            <div className="space-y-2">
              {siblings.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">{s.fullName}</span>
                    <span className="text-sm text-muted-foreground ml-2">{s.admissionNumber}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => unlinkSibling(branchId, sessionId, studentId, s.id).then(invalidate)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No siblings linked.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
