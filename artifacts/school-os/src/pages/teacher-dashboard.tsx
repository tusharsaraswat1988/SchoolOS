import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherDashboard() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Class attendance, subjects, and announcements for your assigned branch session.
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
