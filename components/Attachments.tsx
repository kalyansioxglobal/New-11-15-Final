import { useState } from "react";

type FileRecord = {
  id: number;
  fileName: string;
  sizeBytes: number;
  tag?: string | null;
};

export function Attachments({
  taskId,
  ventureId,
  files,
  currentUserId,
}: {
  taskId?: number;
  ventureId?: number;
  files: FileRecord[];
  currentUserId: number;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (taskId) formData.append("taskId", String(taskId));
      if (ventureId) formData.append("ventureId", String(ventureId));

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
        headers: {
          "x-user-id": String(currentUserId),
        },
      });

      if (!res.ok) {
        console.error("Upload failed", await res.json());
      } else {
        window.location.reload();
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const openFile = async (fileId: number) => {
    const res = await fetch(`/api/files/${fileId}/url`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  };

  return (
    <div className="border border-zinc-200 rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-zinc-800">
          Attachments
        </h3>
        <label className="text-xs px-2 py-1 rounded-md border border-zinc-300 bg-zinc-50 cursor-pointer hover:bg-zinc-100">
          {uploading ? "Uploading..." : "Upload"}
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-zinc-500">
          No files yet. Attach invoices, PODs, SOPs or other docs
          related to this task.
        </p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between text-xs"
            >
              <button
                onClick={() => openFile(f.id)}
                className="text-blue-600 hover:underline text-left truncate max-w-xs"
              >
                {f.fileName}
              </button>
              <span className="text-[10px] text-zinc-400">
                {(f.sizeBytes / 1024).toFixed(1)} KB
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
