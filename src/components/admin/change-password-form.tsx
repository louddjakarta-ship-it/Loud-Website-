"use client";

import { useActionState, useEffect, useRef } from "react";

import { changePasswordAction } from "@/app/admin/actions/account";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/field";
import {
  initialChangePasswordState,
  type ChangePasswordState,
} from "@/lib/admin/account-action-state";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<
    ChangePasswordState,
    FormData
  >(changePasswordAction, initialChangePasswordState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-5">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          {state.message}
        </div>
      ) : null}

      {state.status === "success" && state.message ? (
        <div
          role="status"
          className="border border-accent/50 bg-accent/5 p-4 text-sm leading-relaxed text-accent"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          aria-invalid={state.fields?.currentPassword ? true : undefined}
          aria-describedby={
            state.fields?.currentPassword
              ? "current-password-error"
              : undefined
          }
        />
        <FieldError id="current-password-error">
          {state.fields?.currentPassword}
        </FieldError>
      </div>

      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          required
          disabled={pending}
          aria-invalid={state.fields?.newPassword ? true : undefined}
          aria-describedby={
            state.fields?.newPassword ? "new-password-error" : undefined
          }
        />
        <FieldHint>At least 10 characters. Longer is better.</FieldHint>
        <FieldError id="new-password-error">
          {state.fields?.newPassword}
        </FieldError>
      </div>

      <div>
        <Label htmlFor="confirm-password">Repeat new password</Label>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          required
          disabled={pending}
          aria-invalid={state.fields?.confirmPassword ? true : undefined}
          aria-describedby={
            state.fields?.confirmPassword
              ? "confirm-password-error"
              : undefined
          }
        />
        <FieldError id="confirm-password-error">
          {state.fields?.confirmPassword}
        </FieldError>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
