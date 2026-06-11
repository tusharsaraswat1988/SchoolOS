import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";

export default function AccountsDashboard() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Accounts Dashboard</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Fee collection, pending dues, and payment summaries for your branch.
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
