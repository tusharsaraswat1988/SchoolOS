import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { fetchCaptcha } from "@/lib/auth-api";
import { defaultHomeForRole } from "@/lib/route-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AiCore } from "@/components/ai-core";
import { CheckCircle2, GraduationCap, LogIn, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, user, isHydrated, hydrate } = useAuthStore();
  const [introStage, setIntroStage] = useState<"intro" | "expanding" | "form">("intro");
  const [orbHovered, setOrbHovered] = useState(false);
  const [schoolCode, setSchoolCode] = useState("");
  const [userId, setUserId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const introTimerRef = useRef<number | null>(null);

  const loadCaptcha = async () => {
    try {
      const c = await fetchCaptcha();
      setCaptchaQuestion(c.question);
      setCaptchaToken(c.token);
      setCaptchaAnswer("");
    } catch {
      setError("Could not load captcha. Make sure the API server is running (pnpm dev).");
    }
  };

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    void loadCaptcha();
  }, []);

  useEffect(() => {
    const forceLogin = new URLSearchParams(window.location.search).get("force") === "1";
    if (isHydrated && user && !forceLogin) {
      setLocation(defaultHomeForRole(user.role));
    }
  }, [isHydrated, user, setLocation]);

  useEffect(() => {
    return () => {
      if (introTimerRef.current) {
        window.clearTimeout(introTimerRef.current);
      }
    };
  }, []);

  const startExperience = () => {
    if (introStage !== "intro") return;
    setIntroStage("expanding");
    introTimerRef.current = window.setTimeout(() => {
      setIntroStage("form");
      introTimerRef.current = null;
    }, 680);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const redirectPath = await login({
        schoolCode: schoolCode.trim() || undefined,
        userId: userId.trim(),
        accessCode,
        captchaAnswer,
        captchaToken,
      });
      setLocation(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      void loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.18),_transparent_55%),linear-gradient(135deg,_hsl(var(--background)),_hsl(var(--background)))] p-4 md:p-8">
      <div className="login-mesh login-mesh-a" />
      <div className="login-mesh login-mesh-b" />
      <div className="login-mesh login-mesh-c" />

      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl transition-all duration-[900ms] ease-out ${
          introStage === "form"
            ? "scale-[16] opacity-0"
            : introStage === "expanding"
              ? "scale-150 opacity-90"
              : "scale-100 opacity-70"
        }`}
      />

      <div
        className={`absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          introStage === "form"
            ? "pointer-events-none scale-[1.6] opacity-0"
            : introStage === "expanding"
              ? "scale-110 opacity-0"
              : "scale-100 opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={startExperience}
          onMouseEnter={() => setOrbHovered(true)}
          onMouseLeave={() => setOrbHovered(false)}
          aria-label="Open School OS login"
          className="group relative flex h-56 w-56 cursor-pointer items-center justify-center rounded-full transition-transform duration-500 ease-out hover:scale-[1.05] active:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <span className="pointer-events-none absolute inset-[-18px] rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
          <AiCore size={208} charged={introStage !== "intro"} active={orbHovered} />
        </button>

        <div className="mt-6 flex flex-col items-center text-center">
          <span className="text-xl font-semibold tracking-tight text-foreground">School OS</span>
          <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.3em] text-primary/80">
            AI Powered ERP
          </span>
          <span className="mt-3 inline-flex animate-pulse items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            Tap the core to sign in
          </span>
        </div>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center justify-center">
        <div
          className={`grid w-full origin-center overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-2xl backdrop-blur-sm transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:grid-cols-[1.15fr_1fr] ${
            introStage === "form"
              ? "login-panel-reveal scale-100 opacity-100 blur-0"
              : "pointer-events-none scale-50 opacity-0 blur-md"
          }`}
        >
          <section className="hidden border-r border-border/60 bg-[linear-gradient(160deg,_hsl(var(--primary)/0.92),_hsl(var(--primary)/0.76))] p-10 text-primary-foreground md:flex md:flex-col md:justify-between">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide">
                <Sparkles className="h-3.5 w-3.5" />
                Global Education ERP
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold leading-tight">School OS</h1>
                <p className="text-sm/6 text-primary-foreground/90">AI POWERED ERP SOLUTION</p>
                <p className="max-w-md text-sm/6 text-primary-foreground/85">
                  Unified operations for multi-society, multi-school, and branch-level education governance.
                </p>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.15em]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Neural intelligence enabled
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "Role-aware access and secure auth scopes",
                "Centralized academic, fee, and attendance workflows",
                "Enterprise-grade visibility across institutions",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-primary-foreground/90">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <Card className="w-full border-0 bg-transparent shadow-none">
            <CardHeader className="space-y-4 pb-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 shadow-inner">
                <div className="relative">
                  <GraduationCap className="h-7 w-7 text-primary" />
                  <ShieldCheck className="absolute -right-3 -top-2 h-4 w-4 text-primary/80" />
                </div>
              </div>
              <div className="space-y-1.5">
                <CardTitle className="text-2xl font-semibold tracking-tight">School OS</CardTitle>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary/80">
                  AI POWERED ERP SOLUTION
                </p>
              </div>
              <CardDescription>Sign in with your User ID and Access Code</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8 md:px-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="schoolCode">School Code (optional for platform users)</Label>
                  <Input
                    id="schoolCode"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    placeholder="e.g. IS"
                    autoComplete="organization"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. SUPER0001"
                    required
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accessCode">Access Code</Label>
                  <Input
                    id="accessCode"
                    type="password"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="captcha">Captcha</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void loadCaptcha()}>
                      <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
                    </Button>
                  </div>
                  <p className="rounded-md bg-muted px-3 py-2 font-mono text-sm">{captchaQuestion || "…"}</p>
                  <Input
                    id="captcha"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="Answer"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading ? "Signing in…" : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" /> Login
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
