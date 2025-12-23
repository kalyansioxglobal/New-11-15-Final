# Validation Policy – SIOX Command Center

This document defines cross-domain validation standards for API inputs. It complements `SECURITY_AUDIT.md` and `RBAC_POLICY.md` and is enforced via helpers in `lib/validation.ts`.

## 1. IDs

All ID-like values accepted by APIs (e.g. `id`, `ventureId`, `hotelId`, `campaignId`, `customerId`, `subscriptionId`) MUST:

- Be parsed as positive integers.
- Return `400 { error: string, detail?: string }` on invalid input.

## 2. Numeric fields

For numeric business fields (MRR, revenue, margin, cost, counts, ratings, percentages):

- Must be numeric (`number` after coercion).
- Must be `>= 0`.
- Percentages should be between `0` and `100` when clearly representing %.
- On violation, the API must return `400` with a clear `error` message.

## 3. Text fields

For free-text fields (comments, notes, review responses, dispute notes):

- Must be `string`.
- Will be `trim()`'ed before storage.
- Have a max length (e.g. 2,000 chars for comments/notes).
- On violation, the API must return `400` with `error` indicating the field and limit.

## 4. Standard Error Shape

All validation errors should use the shape:

```json
{ "error": "<short message>", "detail": "<optional detail>" }
```

## 5. Implementation

These standards are enforced via helpers in `lib/validation.ts` and applied incrementally to high-sensitivity and write-heavy endpoints across Logistics, Hotels, BPO, and SaaS.
