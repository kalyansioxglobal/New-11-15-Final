import * as React from "react";
import { cn } from "@/lib/cn";

interface BadgeProps {
  variant?: "status" | "severity" | "neutral";
  value: string;
  className?: string;
}

export function Badge({ variant = "neutral", value, className }: BadgeProps) {
  const v = (value || "").toUpperCase();

  let color = "bg-gray-100 text-gray-800";

  if (variant === "status") {
    if (v === "OPEN") color = "bg-blue-100 text-blue-800";
    else if (v === "IN_PROGRESS") color = "bg-purple-100 text-purple-800";
    else if (v === "WAITING_FOR_INFO") color = "bg-amber-100 text-amber-800";
    else if (v === "RESOLVED") color = "bg-green-100 text-green-800";
    else if (v === "CANCELLED") color = "bg-gray-200 text-gray-600";
    else color = "bg-gray-100 text-gray-800";
  } else if (variant === "severity") {
    if (v === "CRITICAL") color = "bg-red-100 text-red-800";
    else if (v === "HIGH") color = "bg-orange-100 text-orange-800";
    else if (v === "MEDIUM") color = "bg-yellow-100 text-yellow-800";
    else if (v === "LOW") color = "bg-gray-100 text-gray-800";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
        color,
        className,
      )}
    >
      {v}
    </span>
  );
}
