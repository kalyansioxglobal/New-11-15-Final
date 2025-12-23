import { NextApiResponse } from "next";

export function parsePositiveInt(value: unknown, field: string): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function validateIdOr400(
  value: unknown,
  field: string,
  res: NextApiResponse
): number | null {
  const parsed = parsePositiveInt(value, field);
  if (parsed === null) {
    res.status(400).json({
      error: "Invalid ID",
      detail: `${field} must be a positive integer`,
    });
  }
  return parsed;
}

export function normalizeNonNegativeNumber(
  value: unknown,
  field: string,
  res?: NextApiResponse
): number | null {
  if (typeof value === "number") {
    if (value < 0) {
      if (res) {
        res.status(400).json({
          error: "Invalid numeric value",
          detail: `${field} must be >= 0`,
        });
      }
      return null;
    }
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      if (res) {
        res.status(400).json({
          error: "Invalid numeric value",
          detail: `${field} must be a number >= 0`,
        });
      }
      return null;
    }
    return parsed;
  }

  return 0; // treat empty/undefined as 0 by default
}

export function validateTextField(
  value: unknown,
  field: string,
  maxLength: number,
  res: NextApiResponse
): string | null {
  if (value == null) return "";
  if (typeof value !== "string") {
    res.status(400).json({
      error: "Invalid text field",
      detail: `${field} must be a string`,
    });
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    res.status(400).json({
      error: "Text too long",
      detail: `${field} must be at most ${maxLength} characters`,
    });
    return null;
  }
  return trimmed;
}
