import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_ORG_HUB_LINKS } from "@/lib/platform-navigation";

export default function PlatformOrganizationsHub() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="mt-1 text-muted-foreground">
            Create net societies and schools, and manage their registration details.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PLATFORM_ORG_HUB_LINKS.map((item) => (
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
        </div>
      </div>
    </Layout>
  );
}
