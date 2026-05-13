import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { UserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, LogIn } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const login = useAuthStore((state) => state.login);
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);

  const handleLogin = (role: UserRole) => {
    setLoadingRole(role);
    setTimeout(() => {
      login(role);
      setLocation("/dashboard");
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-md border-0 shadow-2xl bg-card/80 backdrop-blur-xl">
        <CardHeader className="space-y-3 text-center pb-8 pt-10">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">School OS</CardTitle>
          <CardDescription className="text-base">
            Select a role to access the command center
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pb-10 px-8">
          {(["super_admin", "school_admin", "principal", "teacher"] as UserRole[]).map((role) => (
            <Button
              key={role}
              variant="outline"
              size="lg"
              className="w-full justify-between h-14 font-medium"
              onClick={() => handleLogin(role)}
              disabled={loadingRole !== null}
            >
              <span className="capitalize">{role.replace("_", " ")}</span>
              {loadingRole === role ? (
                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
