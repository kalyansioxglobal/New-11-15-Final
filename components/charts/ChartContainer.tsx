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
      className="rounded-2xl shadow-lg border border-slate-800 bg-slate-950/70 p-4 flex flex-col"
      style={{
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs text-slate-400 max-w-md">
              {description}
            </p>
          )}
        </div>
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
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
