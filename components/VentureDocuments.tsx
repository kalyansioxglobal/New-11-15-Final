import { useMemo, useState } from "react";

type DocumentRecord = {
  id: number;
  fileName: string;
  sizeBytes: number;
  tag: string | null;
  createdAt: string;
  sourceType: string;
  sourceLabel: string;
};

export function VentureDocuments({
  ventureId,
  documents,
  currentUserId,
}: {
  ventureId: number;
  documents: DocumentRecord[];
  currentUserId: number;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [tagFilter, setTagFilter] = useState<string>("All");

  const sourceTypes = useMemo(
    () => ["All", ...Array.from(new Set(documents.map((d) => d.sourceType)))],
    [documents]
  );

  const tags = useMemo(
    () =>
      ["All", ...Array.from(new Set(documents.map((d) => d.tag || "")))
        .filter(Boolean)],
    [documents]
  );

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const matchesType =
        typeFilter === "All" || d.sourceType === typeFilter;
      const matchesTag =
        tagFilter === "All" || (d.tag && d.tag === tagFilter);
      const query = search.toLowerCase();
      const matchesSearch =
        !query ||
        d.fileName.toLowerCase().includes(query) ||
        d.sourceLabel.toLowerCase().includes(query);

      return matchesType && matchesTag && matchesSearch;
    });
  }, [documents, search, typeFilter, tagFilter]);

  const openFile = async (fileId: number) => {
    const res = await fetch(`/api/files/${fileId}/url`, {
      headers: {
        "x-user-id": String(currentUserId),
      },
    });
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-zinc-200 rounded-md text-xs px-2 py-1 bg-white"
          >
            {sourceTypes.map((t) => (
              <option key={t} value={t}>
                {t === "All" ? "All sources" : t}
              </option>
            ))}
          </select>

          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="border border-zinc-200 rounded-md text-xs px-2 py-1 bg-white"
          >
            <option value="All">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-64 max-w-full">
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/70"
          />
        </div>
      </div>

      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">File name</th>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Tag</th>
              <th className="px-3 py-2 text-left font-medium">Size</th>
              <th className="px-3 py-2 text-left font-medium">Added</th>
              <th className="px-3 py-2 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr
                key={d.id}
                className="border-b border-zinc-100 hover:bg-zinc-50"
              >
                <td className="px-3 py-2">
                  <button
                    onClick={() => openFile(d.id)}
                    className="text-blue-600 hover:underline text-left truncate max-w-xs"
                  >
                    {d.fileName}
                  </button>
                </td>
                <td className="px-3 py-2 text-zinc-600">
                  <div className="flex flex-col">
                    <span className="font-medium">{d.sourceType}</span>
                    <span className="text-[11px] text-zinc-500">
                      {d.sourceLabel}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-zinc-600">
                  {d.tag ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-zinc-200 text-[10px]">
                      {d.tag}
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-600">
                  {(d.sizeBytes / 1024).toFixed(1)} KB
                </td>
                <td className="px-3 py-2 text-zinc-600">
                  {d.createdAt.slice(0, 10)}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => openFile(d.id)}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-[11px] text-zinc-500"
                >
                  No documents match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
