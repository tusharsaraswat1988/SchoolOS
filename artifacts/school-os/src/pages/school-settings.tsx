import { useEffect, useState } from "react";

import { Layout } from "@/components/layout";

import { useAuthStore } from "@/lib/auth";
import { useScope } from "@/lib/use-scope";

import { apiGet, apiSend } from "@/lib/api";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Checkbox } from "@/components/ui/checkbox";

import { useToast } from "@/hooks/use-toast";



type Streams = { science?: boolean; commerce?: boolean; arts?: boolean; vocational?: boolean };

type SchoolProfile = Record<string, unknown> & {

  streamsAvailable?: Streams;

  languageGroups?: string[];

};



export default function SchoolSettings() {

  const { user } = useAuthStore();
  const scope = useScope();
  const schoolId = scope.schoolId ?? user?.schoolId;

  const { toast } = useToast();

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<SchoolProfile>({});

  const [sessions, setSessions] = useState<Array<{ code: string; startsOn: string; endsOn: string; isCurrent: boolean }>>([]);
  const [financialSessions, setFinancialSessions] = useState<typeof sessions>([]);



  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    apiGet<{ profile: SchoolProfile | null; academicSessions: typeof sessions; financialSessions?: typeof sessions }>(`/schools/${schoolId}/profile`)

      .then((data) => {

        setProfile(data.profile ?? {});

        setSessions(data.academicSessions ?? []);
        setFinancialSessions(data.financialSessions ?? []);

      })

      .catch((e) => toast({ title: "Failed to load profile", description: String(e), variant: "destructive" }))

      .finally(() => setLoading(false));

  }, [schoolId, toast]);



  const set = (key: string, value: unknown) => setProfile((p) => ({ ...p, [key]: value }));

  const streams = (profile.streamsAvailable ?? {}) as Streams;

  const setStream = (key: keyof Streams, checked: boolean) =>

    set("streamsAvailable", { ...streams, [key]: checked });



  const handleSave = async (e: React.FormEvent) => {

    e.preventDefault();

    setSaving(true);

    try {

      const payload = {

        ...profile,

        languageGroups: String(profile.languageGroupsText ?? "")

          .split(",")

          .map((s) => s.trim())

          .filter(Boolean),

      };

      delete (payload as Record<string, unknown>).languageGroupsText;

      await apiSend(`/schools/${schoolId}/profile`, "PATCH", payload);

      toast({ title: "School profile saved" });

    } catch (err) {

      toast({ title: "Save failed", description: String(err), variant: "destructive" });

    } finally {

      setSaving(false);

    }

  };



  if (loading) return <Layout><p className="text-muted-foreground">Loading...</p></Layout>;



  const currentSession = sessions.find((s) => s.isCurrent) ?? sessions[0];
  const currentFinancialSession = financialSessions.find((s) => s.isCurrent) ?? financialSessions[0];



  return (

    <Layout>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">

        <div>

          <h1 className="text-2xl font-bold">School Settings (UDISE Profile)</h1>

          <p className="text-muted-foreground text-sm">Phase-1 school identification and affiliation data</p>

        </div>



        {(currentSession || currentFinancialSession) && (

          <Card>

            <CardHeader><CardTitle className="text-base">Active Sessions</CardTitle></CardHeader>

            <CardContent className="text-sm text-muted-foreground space-y-2">

              {currentSession && (
                <p>
                  <span className="font-medium text-foreground">Academic:</span>{" "}
                  {currentSession.code}: {currentSession.startsOn} → {currentSession.endsOn}
                  {currentSession.isCurrent ? " (current)" : ""}
                </p>
              )}
              {currentFinancialSession && (
                <p>
                  <span className="font-medium text-foreground">Financial:</span>{" "}
                  {currentFinancialSession.code}: {currentFinancialSession.startsOn} → {currentFinancialSession.endsOn}
                  {currentFinancialSession.isCurrent ? " (current)" : ""}
                </p>
              )}
              <p className="text-xs">Manage sessions in <a href="/sessions" className="text-primary underline-offset-4 hover:underline">Sessions</a>.</p>

            </CardContent>

          </Card>

        )}



        <Card>

          <CardHeader><CardTitle className="text-base">Identification</CardTitle></CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">

            <div className="space-y-1.5"><Label>UDISE Code</Label><Input value={String(profile.udiseCode ?? "")} onChange={(e) => set("udiseCode", e.target.value)} /></div>

            <div className="space-y-1.5">

              <Label>School Category</Label>

              <Select value={String(profile.schoolCategory ?? "")} onValueChange={(v) => set("schoolCategory", v)}>

                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>

                <SelectContent>

                  {["primary", "upper_primary", "secondary", "higher_secondary", "composite"].map((v) => (

                    <SelectItem key={v} value={v}>{v.replace("_", " ")}</SelectItem>

                  ))}

                </SelectContent>

              </Select>

            </div>

            <div className="space-y-1.5">

              <Label>School Type</Label>

              <Select value={String(profile.schoolType ?? "")} onValueChange={(v) => set("schoolType", v)}>

                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>

                <SelectContent>

                  {["boys", "girls", "co_educational"].map((v) => (

                    <SelectItem key={v} value={v}>{v.replace("_", " ")}</SelectItem>

                  ))}

                </SelectContent>

              </Select>

            </div>

            <div className="space-y-1.5">

              <Label>Management Type</Label>

              <Select value={String(profile.managementType ?? "")} onValueChange={(v) => set("managementType", v)}>

                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>

                <SelectContent>

                  {["government", "local_body", "private_aided", "private_unaided", "central_govt", "state_govt", "other"].map((v) => (

                    <SelectItem key={v} value={v}>{v.replace("_", " ")}</SelectItem>

                  ))}

                </SelectContent>

              </Select>

            </div>

            <div className="space-y-1.5"><Label>Management Code</Label><Input value={String(profile.managementCode ?? "")} onChange={(e) => set("managementCode", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Year of Establishment</Label><Input type="number" value={String(profile.yearOfEstablishment ?? "")} onChange={(e) => set("yearOfEstablishment", Number(e.target.value) || undefined)} /></div>

            <div className="space-y-1.5">

              <Label>Recognition Status</Label>

              <Select value={String(profile.recognitionStatus ?? "")} onValueChange={(v) => set("recognitionStatus", v)}>

                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>

                <SelectContent>

                  {["recognized", "unrecognized", "provisional"].map((v) => (

                    <SelectItem key={v} value={v}>{v}</SelectItem>

                  ))}

                </SelectContent>

              </Select>

            </div>

            <div className="space-y-1.5"><Label>Medium of Instruction</Label><Input value={String(profile.mediumOfInstruction ?? "")} onChange={(e) => set("mediumOfInstruction", e.target.value)} /></div>

            <div className="space-y-1.5 md:col-span-2">

              <Label>Language Groups (comma-separated)</Label>

              <Input

                value={String(profile.languageGroupsText ?? (profile.languageGroups as string[] | undefined)?.join(", ") ?? "")}

                onChange={(e) => set("languageGroupsText", e.target.value)}

                placeholder="Hindi, English"

              />

            </div>

          </CardContent>

        </Card>



        <Card>

          <CardHeader><CardTitle className="text-base">Location & Contact</CardTitle></CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">

            <div className="md:col-span-2 space-y-1.5"><Label>Address</Label><Input value={String(profile.address ?? "")} onChange={(e) => set("address", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>District</Label><Input value={String(profile.district ?? "")} onChange={(e) => set("district", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Block</Label><Input value={String(profile.block ?? "")} onChange={(e) => set("block", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Village</Label><Input value={String(profile.village ?? "")} onChange={(e) => set("village", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Pincode</Label><Input value={String(profile.pincode ?? "")} onChange={(e) => set("pincode", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Latitude</Label><Input value={String(profile.latitude ?? "")} onChange={(e) => set("latitude", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Longitude</Label><Input value={String(profile.longitude ?? "")} onChange={(e) => set("longitude", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Mobile</Label><Input value={String(profile.mobile ?? "")} onChange={(e) => set("mobile", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={String(profile.email ?? "")} onChange={(e) => set("email", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Website</Label><Input value={String(profile.website ?? "")} onChange={(e) => set("website", e.target.value)} /></div>

          </CardContent>

        </Card>



        <Card>

          <CardHeader><CardTitle className="text-base">Principal & Affiliation</CardTitle></CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">

            <div className="space-y-1.5"><Label>Principal Name</Label><Input value={String(profile.principalName ?? "")} onChange={(e) => set("principalName", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Principal Mobile</Label><Input value={String(profile.principalMobile ?? "")} onChange={(e) => set("principalMobile", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Principal Email</Label><Input type="email" value={String(profile.principalEmail ?? "")} onChange={(e) => set("principalEmail", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Affiliation Board</Label><Input value={String(profile.affiliationBoard ?? "")} onChange={(e) => set("affiliationBoard", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Affiliation Board Name</Label><Input value={String(profile.affiliationBoardName ?? "")} onChange={(e) => set("affiliationBoardName", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Affiliation Number</Label><Input value={String(profile.affiliationNumber ?? "")} onChange={(e) => set("affiliationNumber", e.target.value)} /></div>

            <div className="space-y-1.5"><Label>Lowest Class</Label><Input value={String(profile.lowestClass ?? "")} onChange={(e) => set("lowestClass", e.target.value)} placeholder="Nursery" /></div>

            <div className="space-y-1.5"><Label>Highest Class</Label><Input value={String(profile.highestClass ?? "")} onChange={(e) => set("highestClass", e.target.value)} placeholder="Class 12" /></div>

            <div className="flex items-center gap-2"><Checkbox checked={Boolean(profile.prePrimaryAvailable)} onCheckedChange={(v) => set("prePrimaryAvailable", Boolean(v))} /><Label>Pre-primary available</Label></div>

            <div className="flex items-center gap-2"><Checkbox checked={Boolean(profile.minoritySchoolFlag)} onCheckedChange={(v) => set("minoritySchoolFlag", Boolean(v))} /><Label>Minority school</Label></div>

            <div className="flex items-center gap-2"><Checkbox checked={Boolean(profile.residentialSchoolFlag)} onCheckedChange={(v) => set("residentialSchoolFlag", Boolean(v))} /><Label>Residential school</Label></div>

          </CardContent>

        </Card>



        <Card>

          <CardHeader><CardTitle className="text-base">Streams Available (Higher Secondary)</CardTitle></CardHeader>

          <CardContent className="flex flex-wrap gap-6">

            {(["science", "commerce", "arts", "vocational"] as const).map((s) => (

              <div key={s} className="flex items-center gap-2">

                <Checkbox checked={Boolean(streams[s])} onCheckedChange={(v) => setStream(s, Boolean(v))} />

                <Label className="capitalize">{s}</Label>

              </div>

            ))}

          </CardContent>

        </Card>



        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>

      </form>

    </Layout>

  );

}


