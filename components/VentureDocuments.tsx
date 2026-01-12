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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
          >
            {sourceTypes.map((t) => (
              <option key={t} value={t} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {t === "All" ? "All sources" : t}
              </option>
            ))}
          </select>

          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
          >
            <option value="All" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
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
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">File name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Tag</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Added</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openFile(d.id)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-left truncate max-w-xs transition-colors"
                    >
                      {d.fileName}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-white">{d.sourceType}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {d.sourceLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {d.tag ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {d.tag}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {(d.sizeBytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openFile(d.id)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
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
                    className="px-6 py-12 text-center"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <svg
                        className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No documents found</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No documents match the current filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
