import React from "react";

type ChartContainerProps = {
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  height?: number;
};

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  rightSlot,
  children,
  height = 320,
}) => {
  return (
    <div
      className="rounded-2xl shadow-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-5 flex flex-col"
      style={{
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 tracking-wide">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 max-w-md">
              {description}
            </p>
          )}
        </div>
        {rightSlot && <div className="flex items-center gap-2 flex-shrink-0">{rightSlot}</div>}
      </div>
      <div
        className="flex-1 w-full"
        style={{
          height: height,
          minHeight: height,
        }}
      >
        {children}
      </div>
    </div>
  );
};
