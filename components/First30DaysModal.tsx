import React, { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/appMeta";

type First30DaysModalProps = {
  userCreatedAt?: string | Date | null;
};

const DISMISS_KEY = "cc_first30day_modal_dismissed";

export const First30DaysModal: React.FC<First30DaysModalProps> = ({
  userCreatedAt,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (dismissed === "true") return;

    if (!userCreatedAt) {
      return;
    }

    const created =
      typeof userCreatedAt === "string"
        ? new Date(userCreatedAt)
        : userCreatedAt;

    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    if (diffMs <= thirtyDaysMs) {
      setIsOpen(true);
    }
  }, [userCreatedAt]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleDontShowAgain = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "true");
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 rounded-2xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-700">
        <div className="px-6 pt-5 pb-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              Before you dive into {APP_NAME}…
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-100 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-3 text-sm leading-relaxed">
          <p>
            I&apos;m <span className="font-semibold">not a developer</span>.
          </p>

          <p>
            We built this Command Center by learning, experimenting, failing,
            fixing, and trying again. And the truth is — there&apos;s never a perfect
            time to start something meaningful.
          </p>

          <p>
            This app may not be perfect. Some things may break. Some things may
            surprise us. But the moral of the story is simple:
          </p>

          <p className="font-semibold text-slate-50">
            We can&apos;t wait for perfect.  
            We have to start.  
            We have to try.  
            We have to move forward.
          </p>

          <p>
            I don&apos;t know if everything here will work exactly as planned… but we
            will keep improving, and we won&apos;t look back.
          </p>

          <p className="font-semibold">
            Thank you for being part of the very first group to test this.  
            Let&apos;s build something great — together.
          </p>
        </div>

        <div className="px-6 pb-4 pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
          <button
            onClick={handleClose}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition"
          >
            Continue
          </button>
          <button
            onClick={handleDontShowAgain}
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
          >
            Don&apos;t show this again
          </button>
        </div>
      </div>
    </div>
  );
};
