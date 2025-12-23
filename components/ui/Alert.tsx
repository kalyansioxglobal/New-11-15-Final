import * as React from "react";
import { cn } from "@/lib/cn";

interface AlertProps {
  variant?: "error" | "info" | "success" | "warning";
  title?: string;
  message: string;
  className?: string;
}

export function Alert({ variant = "info", title, message, className }: AlertProps) {
  let baseColor = "border-blue-100 bg-blue-50 text-blue-800";

  if (variant === "error") baseColor = "border-red-200 bg-red-50 text-red-800";
  else if (variant === "success") baseColor = "border-emerald-200 bg-emerald-50 text-emerald-800";
  else if (variant === "warning") baseColor = "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div
      className={cn(
        "w-full rounded-md border px-3 py-2 text-xs flex flex-col gap-0.5",
        baseColor,
        className,
      )}
    >
      {title && <div className="font-semibold text-[11px]">{title}</div>}
      <div>{message}</div>
    </div>
  );
}
