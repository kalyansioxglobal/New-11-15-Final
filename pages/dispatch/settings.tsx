import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

type EmailConnection = {
  id: number;
  ventureId: number;
  provider: string;
  emailAddress: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  status: string;
  createdAt: string;
};

function DispatchSettingsPage() {
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [ventureId, setVentureId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success") === "gmail_connected") {
      const email = urlParams.get("email");
      setMessage({ type: "success", text: `Gmail account ${email} connected successfully!` });
      window.history.replaceState({}, "", "/dispatch/settings");
    } else if (urlParams.get("error")) {
      const errorMessages: Record<string, string> = {
        oauth_denied: "Gmail authorization was denied",
        oauth_failed: "Failed to connect Gmail account",
        invalid_callback: "Invalid OAuth callback",
        no_token: "No access token received",
        no_email: "Could not retrieve email address",
      };
      setMessage({ type: "error", text: errorMessages[urlParams.get("error")!] || "An error occurred" });
      window.history.replaceState({}, "", "/dispatch/settings");
    }
    
    fetchUserVenture();
    fetchConnections();
  }, []);

  async function fetchUserVenture() {
    try {
      const res = await fetch("/api/user/venture-types");
      const data = await res.json();
      if (data.ventureIds && data.ventureIds.length > 0) {
        setVentureId(data.ventureIds[0]);
      }
    } catch (error) {
      console.error("Failed to fetch venture:", error);
    }
  }

  async function fetchConnections() {
    setLoading(true);
    try {
      const res = await fetch("/api/dispatch/email-connections");
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  }

  async function disconnectGmail(connectionId: number) {
    if (!confirm("Are you sure you want to disconnect this Gmail account?")) return;
    
    try {
      const res = await fetch("/api/dispatch/email-connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: connectionId }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Gmail account disconnected" });
        fetchConnections();
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
      setMessage({ type: "error", text: "Failed to disconnect account" });
    }
  }

  function connectGmail() {
    if (!ventureId) {
      setMessage({ type: "error", text: "No venture selected" });
      return;
    }
    window.location.href = `/api/dispatch/email-connections/gmail/auth?ventureId=${ventureId}`;
  }

  async function syncGmail(connectionId: number) {
    setSyncing(connectionId);
    setMessage(null);
    try {
      const res = await fetch("/api/dispatch/email-connections/gmail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: `Synced ${data.syncedCount} new messages (${data.newConversations} new conversations)`,
        });
        fetchConnections();
      } else {
        if (res.status === 401) {
          setMessage({ type: "error", text: data.error || "Gmail connection expired. Please reconnect." });
        } else {
          setMessage({ type: "error", text: data.error || "Failed to sync" });
        }
      }
    } catch (error) {
      console.error("Sync error:", error);
      setMessage({ type: "error", text: "Failed to sync Gmail" });
    } finally {
      setSyncing(null);
    }
  }

  return (
    <>
      <Head>
        <title>Dispatch Settings | Email Connections</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dispatch Settings</h1>
              <p className="text-sm text-gray-500">Manage email connections and sync settings</p>
            </div>
            <Link
              href="/dispatch/inbox"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Inbox
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-6">
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message.text}
              <button onClick={() => setMessage(null)} className="float-right text-lg font-bold">&times;</button>
            </div>
          )}

          <section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Accounts</h2>
            <p className="text-sm text-gray-500 mb-6">
              Connect your Gmail or Outlook account to sync dispatch-related emails directly into your inbox.
            </p>

            <div className="flex gap-3 mb-6">
              <button
                onClick={connectGmail}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
                Connect Gmail
              </button>
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1.13q-.46 0-.8-.32-.32-.33-.32-.8V7.13q0-.46.32-.8.34-.32.8-.32h7.84l3.29-2.8q.33-.27.77-.27h9.84q.46 0 .8.33.32.33.32.8v3.06l.02.02L24 12zm-8.3-3.36V4.13h-9.22l-3.3 2.8v10.61h5.79V9.44q0-.46.33-.8.32-.32.8-.32zm6.17 0V8.5l-.02-.02-5.76-4.98h-9.16v4.17h9.35q.46 0 .8.32.32.34.32.8v7.35h4.47V8.64zm0 4.68l-3.32-2.86v5.72l3.32-2.86z"/>
                </svg>
                Connect Outlook (Coming Soon)
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading connections...</div>
            ) : connections.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                No email accounts connected. Connect an account to sync emails.
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        conn.provider === "GMAIL" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                      }`}>
                        {conn.provider === "GMAIL" ? "G" : "O"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{conn.emailAddress}</p>
                        <p className="text-sm text-gray-500">
                          {conn.provider} • {conn.status === "ACTIVE" ? (
                            <span className="text-green-600">Active</span>
                          ) : (
                            <span className="text-red-600">{conn.status}</span>
                          )}
                          {conn.lastSyncAt && ` • Last sync: ${new Date(conn.lastSyncAt).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {conn.status === "ACTIVE" && conn.provider === "GMAIL" && (
                        <button
                          onClick={() => syncGmail(conn.id)}
                          disabled={syncing === conn.id}
                          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                        >
                          {syncing === conn.id ? "Syncing..." : "Sync Now"}
                        </button>
                      )}
                      <button
                        onClick={() => disconnectGmail(conn.id)}
                        className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h2>
            <p className="text-sm text-gray-500 mb-4">
              Real-time notifications are enabled automatically when you&apos;re viewing the inbox.
            </p>
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700">Real-time notifications are active</span>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export default DispatchSettingsPage;
