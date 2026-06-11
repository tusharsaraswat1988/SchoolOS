import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentDashboard() {
  return (
    <Layout variant="portal">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Student Portal</h1>
        <Card>
          <CardHeader>
            <CardTitle>My Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Student-scoped attendance, homework, and results will appear here.
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
