"use client";

import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useRole } from "@/components/RoleProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserRole } from "@/lib/types";

const availableRoles: Array<{ value: UserRole; label: string; description: string }> = [
  { value: "analyst", label: "Analyst", description: "Link analysis and entity work." },
  { value: "operator", label: "Operator", description: "Field reporting and mission view." },
  { value: "supervisor", label: "Supervisor", description: "Protected access and briefing view." },
];

export function AuthPanel() {
  const { login, signup, requestPasswordReset, resetPassword } = useRole();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resetTokenHint, setResetTokenHint] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("command@demo.local");
  const [loginPassword, setLoginPassword] = useState("Password123!");

  const [displayName, setDisplayName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRoles, setSignupRoles] = useState<UserRole[]>(["analyst"]);

  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function updateSignupRole(role: UserRole, checked: boolean) {
    setSignupRoles((current) => {
      if (checked) {
        return current.includes(role) ? current : [...current, role];
      }
      return current.filter((item) => item !== role);
    });
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      await login({ email: loginEmail, password: loginPassword });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      await signup({
        displayName,
        email: signupEmail,
        password: signupPassword,
        assignedRoles: signupRoles,
      });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await requestPasswordReset(forgotEmail);
      setInfo(response.message);
      setResetTokenHint(response.token ? `Demo reset token: ${response.token}` : null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await resetPassword({ token: resetToken, password: newPassword });
      setInfo("Password updated. Sign in with the new password.");
      setMode("login");
      setLoginPassword(newPassword);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-5">
        <Badge className="w-fit">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          Prototype Access Control
        </Badge>
        <div className="space-y-3">
          <h1 className="font-hud text-4xl font-semibold tracking-[0.08em] text-cyan-100">Mission Access Portal</h1>
          <p className="max-w-2xl text-base text-slate-300">
            Create accounts with Analyst, Operator, Supervisor, or combined role assignments. Sessions can switch only between the roles granted to that account.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {availableRoles.map((role) => (
            <Card key={role.value} className="border-border/60 bg-secondary/15">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{role.label}</CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-sm text-slate-300">
          Demo accounts use password <code>Password123!</code>: <code>analyst@demo.local</code>, <code>operator@demo.local</code>, <code>supervisor@demo.local</code>, and <code>command@demo.local</code>.
        </div>
      </section>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>Sign in, register a new account, or run the prototype password reset flow.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="reset">Reset</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form className="grid gap-3" onSubmit={onLogin}>
                <label className="grid gap-1 text-sm">
                  <span>Email</span>
                  <Input type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>Password</span>
                  <Input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required />
                </label>
                <Button type="submit" disabled={isSubmitting}>Access Workspace</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="grid gap-3" onSubmit={onSignup}>
                <label className="grid gap-1 text-sm">
                  <span>Display Name</span>
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>Email</span>
                  <Input type="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} required />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>Password</span>
                  <Input type="password" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} minLength={8} required />
                </label>
                <div className="grid gap-2">
                  <span className="text-sm">Assigned Roles</span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {availableRoles.map((role) => (
                      <label key={role.value} className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/15 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={signupRoles.includes(role.value)}
                          onChange={(event) => updateSignupRole(role.value, event.target.checked)}
                        />
                        <span>{role.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting}>Create Account</Button>
              </form>
            </TabsContent>

            <TabsContent value="reset" className="space-y-5">
              <form className="grid gap-3" onSubmit={onRequestReset}>
                <label className="grid gap-1 text-sm">
                  <span>Account Email</span>
                  <Input type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} required />
                </label>
                <Button type="submit" variant="secondary" disabled={isSubmitting}>Generate Reset Token</Button>
              </form>

              <form className="grid gap-3 border-t border-border/60 pt-4" onSubmit={onResetPassword}>
                <label className="grid gap-1 text-sm">
                  <span>Reset Token</span>
                  <Input value={resetToken} onChange={(event) => setResetToken(event.target.value)} required />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>New Password</span>
                  <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
                </label>
                <Button type="submit" disabled={isSubmitting}>Apply New Password</Button>
              </form>
            </TabsContent>
          </Tabs>

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
          {info ? <p className="mt-4 text-sm text-cyan-200">{info}</p> : null}
          {resetTokenHint ? <p className="mt-2 rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">{resetTokenHint}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
