import React, { useEffect, useState } from "react";

type StaffRole =
  | "SALES_AGENT"
  | "CSR"
  | "DISPATCHER"
  | "HOTEL_MANAGER"
  | "REVENUE_MANAGER"
  | "HOUSEKEEPER"
  | "BPO_AGENT"
  | "TEAM_LEAD";

export interface AliasOption {
  id: number;
  alias: string;
  role: StaffRole;
  userId: number | null;
  fullName: string | null;
  email: string | null;
  extension: string | null;
  phoneUs: string | null;
  phoneIn: string | null;
}

interface AliasAutocompleteProps {
  label: string;
  role?: StaffRole;
  value: AliasOption | null;
  onChange: (option: AliasOption | null) => void;
  placeholder?: string;
}

export const AliasAutocomplete: React.FC<AliasAutocompleteProps> = ({
  label,
  role,
  value,
  onChange,
  placeholder = "Type a name...",
}) => {
  const [query, setQuery] = useState(value?.alias ?? "");
  const [results, setResults] = useState<AliasOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(value?.alias ?? "");
  }, [value?.alias]);

  const fetchResults = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (role) params.append("role", role);
      const res = await fetch(`/api/staff/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.results || []);
      setOpen(true);
    } catch (err) {
      console.error("Alias search error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);

    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      fetchResults(q);
    }, 200);
    setDebounceTimer(timer);
  };

  const handleSelect = (option: AliasOption) => {
    onChange(option);
    setQuery(option.alias);
    setOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 150);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="relative w-full">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="relative">
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>
      {loading && (
        <div className="absolute right-3 top-9 text-xs text-gray-400">
          Loading...
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-64 overflow-auto text-sm">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(r);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              <div className="font-medium">
                {r.alias}
                {r.extension ? ` (Ext ${r.extension})` : ""}
              </div>
              <div className="text-xs text-gray-500">
                {r.fullName ? `${r.fullName} · ` : ""}
                {r.email}
              </div>
              <div className="text-xs text-gray-400">
                {r.phoneUs ? `US: ${r.phoneUs}` : ""}
                {r.phoneUs && r.phoneIn ? " · " : ""}
                {r.phoneIn ? `IN: ${r.phoneIn}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && !loading && results.length === 0 && query.trim() && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg text-sm text-gray-500 px-3 py-2">
          No results found
        </div>
      )}
    </div>
  );
};

export default AliasAutocomplete;
