import { z } from "zod";

/** A checkbox's value is only present in FormData when checked, so an
 * absent field must default to `false` — mirrors the convention already
 * used by parse-feed-form.server.ts (`formData.get(x) === "true"`), just
 * expressed as a reusable Zod field instead of manual parsing per field. */
export function booleanField(defaultValue: boolean) {
  return z
    .string()
    .optional()
    .transform((v) => (v === undefined ? defaultValue : v === "true"));
}

export const optionalNumberField = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || !Number.isNaN(Number(v)), "Invalid number")
  .transform((v) => (v === undefined ? null : Number(v)));

export const optionalIntField = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || Number.isInteger(Number(v)),
    "Must be a whole number",
  )
  .transform((v) => (v === undefined ? null : Number(v)));

export const optionalDateField = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || !Number.isNaN(Date.parse(v)),
    "Invalid date",
  )
  .transform((v) => (v === undefined ? null : new Date(v)));

export const requiredTextField = (label: string, max = 200) =>
  z.string().trim().max(max, `${label} is too long`).default("");

export const optionalEmailField = z
  .string()
  .trim()
  .optional()
  .transform((v) => v ?? "")
  .refine(
    (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Enter a valid email address",
  );
