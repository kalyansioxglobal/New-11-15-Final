import { useState } from "react";
import toast from "react-hot-toast";

type FileRecord = {
  id: number;
  fileName: string;
  sizeBytes: number;
  tag?: string | null;
};

const MAX_FILES = 5;

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

    if (files.length >= MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed. Please remove a file before uploading a new one.`);
      e.target.value = "";
      return;
    }

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
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Upload failed");
      } else {
        toast.success("File uploaded successfully");
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const openFile = async (fileId: number) => {
    try {
      const res = await fetch(`/api/files/${fileId}/url`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        toast.error("Failed to open file");
      }
    } catch (error) {
      toast.error("Failed to open file");
    }
  };

  const canUploadMore = files.length < MAX_FILES;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Attachments
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {files.length} of {MAX_FILES} files
          </p>
        </div>
        {canUploadMore && (
          <label className="text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors font-medium">
            {uploading ? "Uploading..." : "+ Upload"}
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading || !canUploadMore}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
            />
          </label>
        )}
      </div>

      {/* Warning Message */}
      <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Important:</span> Files cannot be deleted after uploading. Please verify files before uploading. Maximum {MAX_FILES} files allowed (PDF, Word, Excel, Images).
          </p>
        </div>
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
          No files attached yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => {
            const fileSize = f.sizeBytes < 1024 
              ? `${f.sizeBytes} B` 
              : f.sizeBytes < 1024 * 1024
              ? `${(f.sizeBytes / 1024).toFixed(1)} KB`
              : `${(f.sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
            
            const ext = f.fileName.split('.').pop()?.toLowerCase() || '';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
            const isPdf = ext === 'pdf';
            const isWord = ['doc', 'docx'].includes(ext);
            const isExcel = ['xls', 'xlsx'].includes(ext);

            return (
              <li
                key={f.id}
                className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <button
                  onClick={() => openFile(f.id)}
                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                >
                  <div className="flex-shrink-0">
                    {isImage && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    {isPdf && (
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {(isWord || isExcel) && (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {!isImage && !isPdf && !isWord && !isExcel && (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-900 dark:text-white truncate flex-1">
                    {f.fileName}
                  </span>
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                  {fileSize}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}