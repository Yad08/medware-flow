import { z } from "zod";

export const itemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(100, "Name too long (max 100)"),
  type: z.enum(["box", "unit"], { message: "Select a type" }),
  quantity: z.number().int("Whole numbers only").min(1, "Quantity must be at least 1").max(100000, "Quantity too large"),
  weight: z.number().min(0, "Weight cannot be negative").max(10000, "Weight too large"),
  is_hazmat: z.boolean(),
  pallet_id: z.string().uuid().nullable(),
});

export const palletSchema = z.object({
  name: z.string().trim().min(1, "Pallet name is required").max(60, "Name too long (max 60)"),
});

export const containerSchema = z.object({
  name: z.string().trim().min(1, "Container name is required").max(60, "Name too long (max 60)"),
});

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function flattenErrors<T>(err: z.ZodError): FieldErrors<T> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out as FieldErrors<T>;
}
