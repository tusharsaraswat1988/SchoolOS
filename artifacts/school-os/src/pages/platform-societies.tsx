import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { apiGet } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2 } from "lucide-react";

type SocietyRow = {
  id: number;
  name: string;
  code: string;
  status?: string;
};

export default function PlatformSocieties() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "societies"],
    queryFn: () => apiGet<{ data: SocietyRow[]; total: number }>("/societies"),
  });

  const societies = data?.data ?? [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Societies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.total ?? 0} net societies registered on the platform
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded bg-muted/50" />
                ))}
              </div>
            ) : societies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Building2 className="mb-3 size-12 opacity-30" />
                <p className="font-medium">No societies found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/30">
                    <TableHead className="pl-6">Society</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {societies.map((society) => (
                    <TableRow key={society.id} className="hover:bg-muted/20">
                      <TableCell className="pl-6 font-medium">{society.name}</TableCell>
                      <TableCell>{society.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{society.status ?? "active"}</Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Link
                          href={`/societies/${society.id}`}
                          className="text-sm text-primary underline-offset-4 hover:underline"
                        >
                          Open →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
