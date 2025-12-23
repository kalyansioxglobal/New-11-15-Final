export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: unknown;
}

function log(level: LogLevel, message: string, meta?: unknown) {
  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== "production" && meta !== undefined) {
    payload.meta = meta;
  }

  console.log(JSON.stringify(payload));
}

export const logger = {
  debug: (msg: string, meta?: unknown) => log("debug", msg, meta),
  info: (msg: string, meta?: unknown) => log("info", msg, meta),
  warn: (msg: string, meta?: unknown) => log("warn", msg, meta),
  error: (msg: string, meta?: unknown) => log("error", msg, meta),
};
