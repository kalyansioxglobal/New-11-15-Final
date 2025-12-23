import React, { useState, useEffect } from "react";
import Head from "next/head";

interface AvailableLoad {
  id: number;
  refNumber: string;
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  equipmentType: string;
  weight: number | null;
  pickupDate: string | null;
  dropDate: string | null;
  sellRate: number | null;
  notes: string | null;
}

const ACCESS_CODE = process.env.NEXT_PUBLIC_CARRIER_ACCESS_CODE || "SIOX2025";
const STORAGE_KEY = "carrier_access_verified";

export default function CarrierLoadsPage() {
  const [accessCode, setAccessCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");
  const [loads, setLoads] = useState<AvailableLoad[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsVerified(true);
    }
  }, []);

  useEffect(() => {
    if (isVerified) {
      fetchLoads();
    }
  }, [isVerified]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.toUpperCase() === ACCESS_CODE.toUpperCase()) {
      localStorage.setItem(STORAGE_KEY, "true");
      setIsVerified(true);
      setError("");
    } else {
      setError("Invalid access code. Please contact your dispatcher.");
    }
  };

  const fetchLoads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/carrier-portal/available-loads");
      if (res.ok) {
        const data = await res.json();
        setLoads(data.loads || []);
      }
    } catch (err) {
      console.error("Failed to fetch loads", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsVerified(false);
    setLoads([]);
  };

  if (!isVerified) {
    return (
      <>
        <Head>
          <title>Carrier Portal | SIOX Logistics</title>
        </Head>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-500 text-2xl font-bold text-slate-950 mb-4">
                SX
              </div>
              <h1 className="text-2xl font-bold text-white">SIOX Logistics</h1>
              <p className="text-gray-400 mt-2">Carrier Portal</p>
            </div>

            <form onSubmit={handleVerify} className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-white mb-4">Enter Access Code</h2>
              <p className="text-sm text-gray-400 mb-4">
                Enter the carrier access code provided by your dispatcher to view available loads.
              </p>
              
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Access Code"
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autoFocus
              />

              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}

              <button
                type="submit"
                className="w-full mt-4 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition"
              >
                View Available Loads
              </button>
            </form>

            <p className="text-center text-gray-500 text-xs mt-6">
              Need access? Contact dispatch@sioxlogistics.com
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Available Loads | SIOX Logistics</title>
      </Head>
      <div className="min-h-screen bg-gray-900">
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-sm font-bold text-slate-950">
                SX
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">SIOX Logistics</h1>
                <p className="text-xs text-gray-400">Carrier Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchLoads}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition"
              >
                Exit
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Available Loads</h2>
            <p className="text-sm text-gray-400">
              {loads.length} load{loads.length !== 1 ? "s" : ""} available for pickup
            </p>
          </div>

          {loading ? (
            <div className="text-gray-400">Loading available loads...</div>
          ) : loads.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-400">No loads available at this time.</p>
              <p className="text-sm text-gray-500 mt-2">Check back later or contact dispatch.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {loads.map((load) => (
                <div key={load.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                          {load.equipmentType || "Van"}
                        </span>
                        <span className="text-xs text-gray-500">#{load.refNumber}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-white">
                        <span className="font-medium">{load.originCity}, {load.originState}</span>
                        <span className="text-gray-500">→</span>
                        <span className="font-medium">{load.destCity}, {load.destState}</span>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
                        {load.pickupDate && (
                          <span>Pickup: {new Date(load.pickupDate).toLocaleDateString()}</span>
                        )}
                        {load.dropDate && (
                          <span>Delivery: {new Date(load.dropDate).toLocaleDateString()}</span>
                        )}
                        {load.weight && (
                          <span>{load.weight.toLocaleString()} lbs</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {load.sellRate && (
                        <div className="text-xl font-bold text-emerald-400">
                          ${load.sellRate.toLocaleString()}
                        </div>
                      )}
                      <a
                        href={`mailto:dispatch@sioxlogistics.com?subject=Interest in Load ${load.refNumber}&body=I am interested in load ${load.refNumber} from ${load.originCity}, ${load.originState} to ${load.destCity}, ${load.destState}.`}
                        className="inline-block mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        Contact Dispatch
                      </a>
                    </div>
                  </div>

                  {load.notes && (
                    <p className="mt-3 text-sm text-gray-400 border-t border-gray-700 pt-3">
                      {load.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="border-t border-gray-800 mt-12">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
            SIOX Logistics | dispatch@sioxlogistics.com
          </div>
        </footer>
      </div>
    </>
  );
}

CarrierLoadsPage.getLayout = (page: React.ReactNode) => page;
