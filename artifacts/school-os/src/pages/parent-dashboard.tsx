import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, CreditCard, FileText, Megaphone, BookOpen } from "lucide-react";

const sections = [
  { href: "/parent/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/parent/fees", label: "Fees", icon: CreditCard },
  { href: "/parent/homework", label: "Homework", icon: BookOpen },
  { href: "/parent/results", label: "Results", icon: FileText },
  { href: "/parent/circulars", label: "Circulars", icon: Megaphone },
];

export default function ParentDashboard() {
  return (
    <Layout variant="portal">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Parent Portal</h1>
          <p className="text-muted-foreground text-sm">View your child&apos;s school information</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {sections.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <s.icon className="w-5 h-5 text-primary mb-2" />
                  <CardTitle className="text-base">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Student-scoped view only</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
