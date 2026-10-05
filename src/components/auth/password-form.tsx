"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type SignInState } from "@/server/auth/actions";

export function PasswordForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState(signIn, {} as SignInState);
  const [visible, setVisible] = useState(false);

  return (
    <form
      action={action}
      className="space-y-4"
      aria-label="Sign in"
      aria-busy={pending}
    >
      <input type="hidden" name="next" value={returnTo} />
      <div className="space-y-2.5">
        <Label htmlFor="password">Club password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            maxLength={1024}
            aria-invalid={!!state.error}
            aria-describedby={state.error ? "sign-in-error" : undefined}
            className="bg-card h-11 pr-12 text-base"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground absolute top-0.5 right-0.5"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      {state.error ? (
        <Alert variant="destructive" id="sign-in-error" role="alert">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
        {pending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : null}
      </Button>
    </form>
  );
}
