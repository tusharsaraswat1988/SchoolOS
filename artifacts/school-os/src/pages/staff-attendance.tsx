import { useEffect, useState } from "react";

import { Layout } from "@/components/layout";

import { apiGet, apiSend } from "@/lib/api";

import { useScope } from "@/lib/use-scope";

import { useListStaff } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";



type AttendanceRow = { userId: number; status: string; note?: string };



export default function StaffAttendancePage() {

  const { branchId, schoolId } = useScope();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [records, setRecords] = useState<Record<number, AttendanceRow>>({});



  const { data: staffData } = useListStaff(schoolId);

  const staff = staffData?.data ?? [];



  useEffect(() => {

    apiGet<{ data: Array<{ userId: number; status: string; note?: string }> }>(

      `/branches/${branchId}/staff-attendance?date=${date}`,

    )

      .then((res) => {

        const map: Record<number, AttendanceRow> = {};

        for (const r of res.data) map[r.userId] = r;

        setRecords(map);

      })

      .catch(() => setRecords({}));

  }, [branchId, date]);



  const setStatus = (userId: number, status: string) =>

    setRecords((prev) => ({ ...prev, [userId]: { userId, status, note: prev[userId]?.note } }));



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    await apiSend(`/branches/${branchId}/staff-attendance`, "POST", {

      date,

      records: Object.values(records).length

        ? Object.values(records)

        : staff.map((s) => ({ userId: s.id, status: "present" })),

    });

  };



  return (

    <Layout>

      <div className="space-y-6 max-w-3xl">

        <div>

          <h1 className="text-2xl font-bold">Staff Attendance</h1>

          <p className="text-muted-foreground text-sm">Daily teacher/staff attendance (UDISE Phase-1)</p>

        </div>

        <Card>

          <CardHeader><CardTitle className="text-base">Mark Attendance</CardTitle></CardHeader>

          <CardContent>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="max-w-xs space-y-1.5">

                <Label>Date</Label>

                <Input type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />

              </div>

              <div className="space-y-2">

                {staff.map((s) => (

                  <div key={s.id} className="flex items-center justify-between border-b py-2 text-sm">

                    <span className="font-medium">{s.firstName} {s.lastName}</span>

                    <div className="flex gap-1">

                      {(["present", "absent", "late", "excused"] as const).map((st) => (

                        <Button

                          key={st}

                          type="button"

                          size="sm"

                          variant={(records[s.id]?.status ?? "present") === st ? "default" : "outline"}

                          className="capitalize text-xs"

                          onClick={() => setStatus(s.id, st)}

                        >

                          {st}

                        </Button>

                      ))}

                    </div>

                  </div>

                ))}

              </div>

              <Button type="submit">Save Staff Attendance</Button>

            </form>

          </CardContent>

        </Card>

      </div>

    </Layout>

  );

}


