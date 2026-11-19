import { z } from "zod";

import {
  normalizeUsername,
  USERNAME_PATTERN,
} from "@/lib/auth/username";

export const createAdminUserSchema = z.object({
  username: z.preprocess(
    normalizeUsername,
    z
      .string()
      .min(3, "Use at least 3 characters.")
      .max(32, "Use at most 32 characters.")
      .regex(
        USERNAME_PATTERN,
        "Use lowercase letters, numbers, dots, underscores or dashes.",
      ),
  ),
  displayName: z
    .string()
    .trim()
    .min(1, "Enter a display name.")
    .max(80, "Display name is too long."),
  password: z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z
      .string()
      .max(72, "Password is too long.")
      .refine(
        (value) => value.length === 0 || value.length >= 8,
        "Use at least 8 characters, or leave blank to auto-generate.",
      ),
  ),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
