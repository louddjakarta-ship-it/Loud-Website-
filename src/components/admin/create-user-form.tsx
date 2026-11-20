"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { createAdminUserAction } from "@/app/admin/actions/users";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/field";
import {
  initialCreateUserState,
  type CreateUserState,
} from "@/lib/admin/user-action-state";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState<
    CreateUserState,
    FormData
  >(createAdminUserAction, initialCreateUserState);
  const formRef = useRef<HTMLFormElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  async function copyCredentials() {
    if (!state.created) {
      return;
    }

    const text = `Username: ${state.created.username}\nPassword: ${state.created.password}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => setCopied(false)}
      className="grid gap-5"
    >
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          {state.message}
        </div>
      ) : null}

      {state.status === "success" && state.created ? (
        <div
          role="status"
          className="border border-accent/50 bg-accent/5 p-4 text-sm leading-relaxed text-accent"
        >
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.08em]">
            User created
          </p>
          <p className="mt-2 text-paper">
            Share these credentials securely. The password is shown once and
            cannot be recovered later. Ask the user to change it from the
            Account page after signing in.
          </p>

          <dl className="mt-4 grid gap-2 font-mono text-[0.7rem] uppercase tracking-[0.08em]">
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted">Username</dt>
              <dd className="text-paper">{state.created.username}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted">Password</dt>
              <dd className="break-all text-paper">
                {state.created.password}
              </dd>
            </div>
          </dl>

          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={copyCredentials}
          >
            {copied ? "Copied" : "Copy credentials"}
          </Button>
        </div>
      ) : null}

      <div>
        <Label htmlFor="user-display-name">Display name</Label>
        <Input
          id="user-display-name"
          name="displayName"
          type="text"
          autoComplete="off"
          maxLength={80}
          required
          disabled={pending}
          aria-invalid={state.fields?.displayName ? true : undefined}
          aria-describedby={
            state.fields?.displayName ? "user-display-name-error" : undefined
          }
          placeholder="Nama admin"
        />
        <FieldError id="user-display-name-error">
          {state.fields?.displayName}
        </FieldError>
      </div>

      <fieldset>
        <legend className="mb-2 block font-mono text-micro uppercase tracking-[0.12em] text-muted">
          Roles
        </legend>
        <div className="grid gap-2 border border-line bg-ink p-4">
          <label className="flex items-start gap-3 text-sm leading-relaxed text-muted">
            <input
              type="checkbox"
              name="roles"
              value="admin"
              defaultChecked
              disabled={pending}
              className="mt-1 h-4 w-4 accent-accent"
            />
            <span>
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-paper">
                Admin
              </span>
              <span className="mt-0.5 block">
                Dashboard, events, guestlist, gallery.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm leading-relaxed text-muted">
            <input
              type="checkbox"
              name="roles"
              value="dj"
              disabled={pending}
              className="mt-1 h-4 w-4 accent-accent"
            />
            <span>
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-paper">
                DJ
              </span>
              <span className="mt-0.5 block">
                Edit their own presskit on the public DJ page.
              </span>
            </span>
          </label>
        </div>
        <FieldError id="user-roles-error">{state.fields?.roles}</FieldError>
      </fieldset>

      <div>
        <Label htmlFor="user-username">Username</Label>
        <Input
          id="user-username"
          name="username"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={32}
          required
          disabled={pending}
          aria-invalid={state.fields?.username ? true : undefined}
          aria-describedby={
            state.fields?.username ? "user-username-error" : undefined
          }
          placeholder="namaadmin"
        />
        <FieldHint>
          Used to sign in. Lowercase letters, numbers, dots, underscores or
          dashes — 3 to 32 characters.
        </FieldHint>
        <FieldError id="user-username-error">
          {state.fields?.username}
        </FieldError>
      </div>

      <div>
        <Label htmlFor="user-password">Password (optional)</Label>
        <Input
          id="user-password"
          name="password"
          type="password"
          autoComplete="new-password"
          maxLength={72}
          disabled={pending}
          aria-invalid={state.fields?.password ? true : undefined}
          aria-describedby={
            state.fields?.password ? "user-password-error" : undefined
          }
          placeholder="Leave blank to auto-generate"
        />
        <FieldHint>
          Leave blank and the system generates a 16-character temporary
          password.
        </FieldHint>
        <FieldError id="user-password-error">
          {state.fields?.password}
        </FieldError>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create user"}
        </Button>
      </div>
    </form>
  );
}
