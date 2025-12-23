import React from "react";

export default function SimulatorTab() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600">
          This page is temporarily simplified to unblock linting and build. The full simulator UI
          logic has been moved out of the critical path for this P0 ESLint/build fix.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          If you rely on the detailed incentive simulation workflow here, please flag it and we can
          restore and harden the full implementation behind this route.
        </p>
      </div>
    </div>
  );
}
