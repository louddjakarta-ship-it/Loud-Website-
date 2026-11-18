"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { signInAction } from "@/app/admin/login/actions";
import {
  initialLoginState,
  type LoginState,
} from "@/lib/auth/login-state";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signInAction,
    initialLoginState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          aria-invalid={state.fields?.email ? true : undefined}
          aria-describedby={
            state.fields?.email ? "admin-email-error" : undefined
          }
          placeholder="you@loudjakarta.com"
        />
        <FieldError id="admin-email-error">{state.fields?.email}</FieldError>
      </div>

      <div>
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          aria-invalid={state.fields?.password ? true : undefined}
          aria-describedby={
            state.fields?.password ? "admin-password-error" : undefined
          }
          placeholder="Your password"
        />
        <FieldError id="admin-password-error">
          {state.fields?.password}
        </FieldError>
      </div>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-sm leading-relaxed text-muted">
        Admin accounts are created manually by the owner. There is no public
        sign-up.
      </p>
    </form>
  );
}
