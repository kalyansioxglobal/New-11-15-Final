// Simple request ID generator for correlation-only logging.
// Not cryptographically secure; safe for internal tracing.
export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
