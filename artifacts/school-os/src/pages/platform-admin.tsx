import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_ADMIN_HUB_LINKS } from "@/lib/platform-navigation";
import { KeyRound, Shield } from "lucide-react";

export default function PlatformAdminHub() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Admin</h1>
          <p className="mt-1 text-muted-foreground">
            Platform settings, credentials, and role-wise sub-admins who run day-to-day operations.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PLATFORM_ADMIN_HUB_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}

          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <KeyRound className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Credentials & Integrations</CardTitle>
                  <CardDescription>
                    SMTP, payment gateways, and API keys — coming in a later release.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use Access Control today to assign platform operators with scoped roles.
              </p>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Shield className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Sub-admin Users</CardTitle>
                  <CardDescription>
                    Create delegated platform admins with role-based access.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/platform/access-control" className="text-sm text-primary underline-offset-4 hover:underline">
                Open Access Control →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
