import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

type FeedbackType = "BUG" | "FEEDBACK" | "FEATURE_REQUEST" | "OTHER";
type Priority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

const FEEDBACK_TYPES: { value: FeedbackType; label: string; description: string }[] = [
  { value: "BUG", label: "Bug / Glitch", description: "Something isn\u0027t working as expected" },
  { value: "FEEDBACK", label: "Feedback", description: "General feedback about the platform" },
  { value: "FEATURE_REQUEST", label: "Feature Request", description: "Suggest a new feature" },
  { value: "OTHER", label: "Other", description: "Other inquiries" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "LOW", label: "Low", color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" },
  { value: "NORMAL", label: "Normal", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  { value: "HIGH", label: "High", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
  { value: "CRITICAL", label: "Critical", color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
];

export default function FeedbackPage() {
  const { data: session } = useSession();
  const [type, setType] = useState<FeedbackType>("FEEDBACK");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const maxSize = 10 * 1024 * 1024;
      const validFiles = newFiles.filter(f => f.size <= maxSize);
      if (validFiles.length < newFiles.length) {
        toast.error("Some files were too large (max 10MB each)");
      }
      setAttachments(prev => [...prev, ...validFiles].slice(0, 5));
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("priority", priority);
      formData.append("subject", subject);
      formData.append("description", description);
      formData.append("email", email || session?.user?.email || "");
      formData.append("pageUrl", window.location.href);
      formData.append("browserInfo", navigator.userAgent);
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit feedback");
      }

      toast.success("Thank you! Your feedback has been submitted.");
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit feedback";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">Thank You!</h1>
          <p className="text-green-700 dark:text-green-400 mb-6">
            Your feedback has been submitted successfully. Our team will review it shortly.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setSubject("");
              setDescription("");
              setAttachments([]);
            }}
            className="btn"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Submit Feedback or Report a Glitch</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Help us improve! Report bugs, share feedback, or request new features.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">How to Submit Effective Feedback</h2>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>For bugs:</strong> Include steps to reproduce, what you expected, and what happened instead</li>
          <li>• <strong>For features:</strong> Describe the problem you&apos;re trying to solve</li>
          <li>• <strong>Screenshots:</strong> Attach screenshots to help us understand the issue</li>
          <li>• <strong>Be specific:</strong> The more details you provide, the faster we can help</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type of Feedback *</label>
          <div className="grid grid-cols-2 gap-3">
            {FEEDBACK_TYPES.map((ft) => (
              <button
                key={ft.value}
                type="button"
                onClick={() => setType(ft.value)}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${type === ft.value
                    ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700"
                  }`}
              >
                <div className="font-medium text-gray-900 dark:text-white">{ft.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{ft.description}</div>
              </button>
            ))}
          </div>
        </div>

        {type === "BUG" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${priority === p.value
                      ? `${p.color} ring-2 ring-offset-1 ring-blue-500 dark:ring-blue-400`
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject *
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your feedback"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              type === "BUG"
                ? "1. What were you trying to do?\n2. What did you expect to happen?\n3. What actually happened?\n4. Steps to reproduce the issue..."
                : "Please provide as much detail as possible..."
            }
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y"
            required
          />
        </div>

        {!session && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email (optional)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Provide your email if you&apos;d like us to follow up</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Attachments (optional)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700/50 transition-colors"
          >
            <div className="text-gray-400 dark:text-gray-500 text-3xl mb-2">📎</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload files</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max 5 files, 10MB each. Images, PDFs, videos accepted.</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              className="hidden"
            />
          </div>

          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 dark:text-gray-500">📄</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">{file.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              setSubject("");
              setDescription("");
              setAttachments([]);
            }}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </form>
    </div>
  );
}

FeedbackPage.title = "Submit Feedback";
