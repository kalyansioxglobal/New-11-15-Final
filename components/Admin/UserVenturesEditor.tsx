import React from "react";

interface VentureOption {
  id: number;
  name: string;
  slug?: string | null;
  type?: string | null;
  logisticsRole?: string | null;
}

interface OfficeOption {
  id: number;
  name: string;
  city?: string | null;
  ventureId: number;
}

interface Props {
  ventures: VentureOption[];
  offices: OfficeOption[];
  selectedVentureIds: number[];
  selectedOfficeIds: number[];
  onChangeVentures: (ids: number[]) => void;
  onChangeOffices: (ids: number[]) => void;
}

export const UserVenturesEditor: React.FC<Props> = ({
  ventures,
  offices,
  selectedVentureIds,
  selectedOfficeIds,
  onChangeVentures,
  onChangeOffices,
}) => {
  const toggleVenture = (id: number) => {
    if (selectedVentureIds.includes(id)) {
      onChangeVentures(selectedVentureIds.filter((x) => x !== id));
    } else {
      onChangeVentures([...selectedVentureIds, id]);
    }
  };

  const toggleOffice = (id: number) => {
    if (selectedOfficeIds.includes(id)) {
      onChangeOffices(selectedOfficeIds.filter((x) => x !== id));
    } else {
      onChangeOffices([...selectedOfficeIds, id]);
    }
  };

  const filteredOffices = selectedVentureIds.length > 0
    ? offices.filter((o) => selectedVentureIds.includes(o.ventureId))
    : offices;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700">Ventures</h3>
        <div className="border border-gray-300 rounded p-2 max-h-64 overflow-auto bg-white">
          {ventures.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No ventures available</p>
          ) : (
            ventures.map((v) => (
              <label
                key={v.id}
                className="flex items-center gap-2 text-sm py-1 hover:bg-gray-50 px-1 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedVentureIds.includes(v.id)}
                  onChange={() => toggleVenture(v.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-800">
                  {v.name}{" "}
                  {v.logisticsRole && (
                    <span className="text-xs text-gray-500">({v.logisticsRole})</span>
                  )}
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700">Offices</h3>
        <div className="border border-gray-300 rounded p-2 max-h-64 overflow-auto bg-white">
          {filteredOffices.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">
              {selectedVentureIds.length > 0
                ? "No offices for selected ventures"
                : "No offices available"}
            </p>
          ) : (
            filteredOffices.map((o) => (
              <label
                key={o.id}
                className="flex items-center gap-2 text-sm py-1 hover:bg-gray-50 px-1 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedOfficeIds.includes(o.id)}
                  onChange={() => toggleOffice(o.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-800">
                  {o.name}{" "}
                  {o.city && (
                    <span className="text-xs text-gray-500">({o.city})</span>
                  )}
                </span>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
