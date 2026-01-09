import * as React from "react";
import { cn } from "@/lib/cn";

interface BadgeProps {
  variant?: "status" | "severity" | "neutral";
  value: string;
  className?: string;
}

export function Badge({ variant = "neutral", value, className }: BadgeProps) {
  const v = (value || "").toUpperCase();

  let color = "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";

  if (variant === "status") {
    if (v === "OPEN") color = "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
    else if (v === "IN_PROGRESS") color = "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300";
    else if (v === "WAITING_FOR_INFO") color = "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300";
    else if (v === "RESOLVED") color = "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
    else if (v === "CANCELLED") color = "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
    else color = "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
  } else if (variant === "severity") {
    if (v === "CRITICAL") color = "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800";
    else if (v === "HIGH") color = "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800";
    else if (v === "MEDIUM") color = "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
    else if (v === "LOW") color = "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600";
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
