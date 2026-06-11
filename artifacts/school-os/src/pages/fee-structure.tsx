import { useEffect, useState } from "react";

import { Layout } from "@/components/layout";

import { apiGet, apiSend } from "@/lib/api";

import { useScope } from "@/lib/use-scope";

import { useListClasses } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";



export default function FeeStructurePage() {

  const { branchId, sessionId, schoolId } = useScope();

  const { data: classes } = useListClasses(schoolId);

  const [heads, setHeads] = useState<Array<{ id: number; code: string; name: string }>>([]);

  const [structures, setStructures] = useState<Array<{ id: number; classId: number; amount: number; feeHeadId: number }>>([]);

  const [headForm, setHeadForm] = useState({ code: "", name: "" });

  const [structForm, setStructForm] = useState({ classId: "", feeHeadId: "", amount: "" });



  const load = async () => {

    const [h, s] = await Promise.all([

      apiGet<{ data: typeof heads }>(`/branches/${branchId}/fee-heads`),

      apiGet<{ data: typeof structures }>(`/branches/${branchId}/sessions/${sessionId}/fee-structures`),

    ]);

    setHeads(h.data);

    setStructures(s.data);

  };



  useEffect(() => {

    load().catch(console.error);

  }, [branchId, sessionId]);



  return (

    <Layout>

      <div className="space-y-6">

        <h1 className="text-2xl font-bold">Fee Structure</h1>

        <Card>

          <CardHeader><CardTitle className="text-base">Fee Heads</CardTitle></CardHeader>

          <CardContent className="space-y-3">

            <form

              className="flex gap-3 flex-wrap items-end"

              onSubmit={async (e) => {

                e.preventDefault();

                await apiSend(`/branches/${branchId}/fee-heads`, "POST", headForm);

                setHeadForm({ code: "", name: "" });

                await load();

              }}

            >

              <div><Label>Code</Label><Input value={headForm.code} onChange={(e) => setHeadForm({ ...headForm, code: e.target.value })} required /></div>

              <div><Label>Name</Label><Input value={headForm.name} onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })} required /></div>

              <Button type="submit">Add Head</Button>

            </form>

            {heads.map((h) => <div key={h.id} className="text-sm">{h.name} ({h.code})</div>)}

          </CardContent>

        </Card>

        <Card>

          <CardHeader><CardTitle className="text-base">Class Fee Structure</CardTitle></CardHeader>

          <CardContent className="space-y-3">

            <form

              className="flex gap-3 flex-wrap items-end"

              onSubmit={async (e) => {

                e.preventDefault();

                await apiSend(`/branches/${branchId}/sessions/${sessionId}/fee-structures`, "POST", {

                  classId: Number(structForm.classId),

                  feeHeadId: Number(structForm.feeHeadId),

                  amount: Number(structForm.amount),

                });

                setStructForm({ classId: "", feeHeadId: "", amount: "" });

                await load();

              }}

            >

              <div>

                <Label>Class</Label>

                <Select value={structForm.classId} onValueChange={(v) => setStructForm({ ...structForm, classId: v })}>

                  <SelectTrigger className="w-36"><SelectValue placeholder="Select" /></SelectTrigger>

                  <SelectContent>{(classes ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>

                </Select>

              </div>

              <div>

                <Label>Fee Head</Label>

                <Select value={structForm.feeHeadId} onValueChange={(v) => setStructForm({ ...structForm, feeHeadId: v })}>

                  <SelectTrigger className="w-36"><SelectValue placeholder="Select" /></SelectTrigger>

                  <SelectContent>{heads.map((h) => <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>)}</SelectContent>

                </Select>

              </div>

              <div><Label>Amount (₹)</Label><Input value={structForm.amount} onChange={(e) => setStructForm({ ...structForm, amount: e.target.value })} required /></div>

              <Button type="submit">Add Structure</Button>

            </form>

            {structures.map((s) => {

              const cls = (classes ?? []).find((c) => c.id === s.classId);

              const head = heads.find((h) => h.id === s.feeHeadId);

              return (

                <div key={s.id} className="text-sm">

                  {cls?.name ?? `Class ${s.classId}`} — {head?.name ?? "Fee"}: ₹{s.amount}

                </div>

              );

            })}

          </CardContent>

        </Card>

      </div>

    </Layout>

  );

}


