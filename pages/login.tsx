import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import type { PageWithLayout } from "@/types/page";

const LoginPage: PageWithLayout = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [idleLogoutMessage, setIdleLogoutMessage] = useState(false);
  
  useEffect(() => {
    if (router.query.reason === "idle") {
      setIdleLogoutMessage(true);
    }
  }, [router.query]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send code");
        setLoading(false);
        return;
      }

      setCodeSent(true);
      setStep("code");
    } catch (err) {
      setError("Failed to send code. Please try again.");
    }
    
    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("otp", {
      email,
      code,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid or expired code. Please try again.");
    } else {
      router.push("/overview");
    }
  }

  function handleBackToEmail() {
    setStep("email");
    setCode("");
    setError("");
    setCodeSent(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Siox Command Center
          </h1>
          <div className="mt-2 h-0.5 w-12 mx-auto bg-amber-500 rounded-full"></div>
        </div>
        <p className="text-sm text-gray-500 text-center mb-6">
          {step === "email" 
            ? "Enter your email to receive a login code" 
            : "Enter the verification code sent to your email"}
        </p>
        
        {idleLogoutMessage && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            You were logged out due to inactivity. Please sign in again.
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4" data-testid="login-form">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
                placeholder="you@company.com"
                required
                autoFocus
                data-testid="login-email"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              data-testid="login-submit"
            >
              {loading ? "Sending..." : "Send Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  disabled
                  className="flex-1 px-3 py-2 border rounded-md text-sm text-gray-500 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Change
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white text-center tracking-widest text-lg"
                placeholder="123456"
                maxLength={6}
                required
                autoFocus
              />
            </div>

            {codeSent && !error && (
              <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
                Code sent! Check your email inbox.
              </p>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-2 px-4 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <button
              type="button"
              onClick={handleSendCode}
              disabled={loading}
              className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Resend Code
            </button>
          </form>
        )}
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400 tracking-wide">
          <span className="text-amber-600">Architected</span>
          <span className="mx-2 text-gray-300">•</span>
          <span className="text-amber-600">Designed</span>
          <span className="mx-2 text-gray-300">•</span>
          <span className="text-amber-600">Engineered</span>
        </p>
        <p className="mt-1 text-sm font-medium text-gray-700 tracking-wide">
          by Herry Chokshi
        </p>
      </div>
    </div>
  );
};

LoginPage.getLayout = (page) => page;

export default LoginPage;
