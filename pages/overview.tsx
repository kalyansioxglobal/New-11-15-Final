import { useEffect, useState } from "react";
import Link from "next/link";
import FreightMiniKpi from "../components/FreightMiniKpi";
import HotelMiniKpi from "../components/HotelMiniKpi";
import OwnerTimeline from "../components/OwnerTimeline";
import DailyBriefingPanel from "../components/DailyBriefing";
import AttendanceWidget from "../components/AttendanceWidget";
import QuickLinks from "../components/QuickLinks";
import { VenturesHealthTable } from "@/components/Overview/VenturesHealthTable";
import type { VentureSummaryWithAggregates, VentureHealth } from "@/types/ventures";
import { useTestMode } from "@/contexts/TestModeContext";
import { Skeleton } from "@/components/ui/Skeleton";

type SummaryStats = {
  openTasks: number;
  overdueTasks: number;
  activePolicies: number;
  expiringPolicies: number;
};

function OverviewPage() {
  const { testMode } = useTestMode();
  const [ventures, setVentures] = useState<VentureSummaryWithAggregates[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    const hasSeenFlash = localStorage.getItem("hasSeenWelcomeFlash");
    if (!hasSeenFlash) {
      setShowFlash(true);
      localStorage.setItem("hasSeenWelcomeFlash", "true");
      setTimeout(() => {
        setShowFlash(false);
      }, 2500);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [venturesRes, summaryRes] = await Promise.all([
          fetch(`/api/overview/ventures?includeTest=${testMode}`),
          fetch("/api/overview/summary"),
        ]);

        if (!venturesRes.ok) throw new Error("Failed to load ventures");

        const venturesData = await venturesRes.json();
        const summaryData = await summaryRes.json();

        if (isMounted) {
          setVentures(venturesData.ventures || []);
          setSummary(summaryData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [testMode]);

  const healthCounts = ventures.reduce(
    (acc, v) => {
      acc[v.health] = (acc[v.health] || 0) + 1;
      return acc;
    },
    { Healthy: 0, Attention: 0, Critical: 0 } as Record<VentureHealth, number>
  );

  if (loading) {
    return (
     <Skeleton className="w-full h-[85vh]" />
    );
  }

  if (ventures.length === 0) {
    return (
      <p className="text-gray-600">
        No active ventures yet. Add some in <strong>Admin → Ventures</strong>.
      </p>
    );
  }

  return (
    <>
      {showFlash && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-sioxBootFade">
          <div className="relative flex flex-col items-center justify-center px-8 py-6 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-black/90 shadow-2xl">
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-emerald-500/30 via-sky-500/30 to-indigo-500/30 blur-sm opacity-60 animate-sioxBorderPulse" />
            <div className="relative flex flex-col items-center gap-2 text-center">
              <div className="text-xs tracking-[0.35em] text-emerald-300/80 uppercase animate-sioxTextGlitch">
                SIOX SYSTEM ONLINE
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Siox Command Center
              </div>
              <div className="text-[11px] md:text-xs text-slate-300/80 italic">
                System Architected, Designed &amp; Built by{" "}
                <span className="font-semibold text-emerald-300">
                  Herry Chokshi
                </span>
              </div>
              <div className="text-[11px] md:text-xs text-slate-400/70 italic mt-2 animate-sioxTextGlitch">
                &quot;Look up. Refuse to look down.&quot; – SIOX
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Siox Command Center</h1>
          <p className="text-sm text-gray-500 italic mt-1">
            Architected, Designed & Engineered by Herry Chokshi
          </p>
          <p className="text-xs text-slate-400/70 italic mt-1">
            &quot;Look up. Refuse to look down.&quot; – SIOX
          </p>
        </header>

        <section>
          <QuickLinks />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AttendanceWidget />
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Total Ventures" value={ventures.length} />
          <SummaryCard
            label="Healthy"
            value={healthCounts.Healthy}
            variant="healthy"
          />
          <SummaryCard
            label="Attention"
            value={healthCounts.Attention}
            variant={healthCounts.Attention > 0 ? "attention" : "default"}
          />
          <SummaryCard
            label="Critical"
            value={healthCounts.Critical}
            variant={healthCounts.Critical > 0 ? "critical" : "default"}
          />
        </section>

        {summary && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/tasks?status=OPEN,IN_PROGRESS,BLOCKED" className="block">
              <SummaryCard label="Open Tasks" value={summary.openTasks} />
            </Link>
            <Link href="/tasks?status=OVERDUE" className="block">
              <SummaryCard
                label="Overdue Tasks"
                value={summary.overdueTasks}
                variant={summary.overdueTasks > 0 ? "critical" : "default"}
              />
            </Link>
            <Link href="/policies?status=ACTIVE" className="block">
              <SummaryCard label="Active Policies" value={summary.activePolicies} />
            </Link>
            <Link href="/policies?expiring=30" className="block">
              <SummaryCard
                label="Expiring (30d)"
                value={summary.expiringPolicies}
                variant={summary.expiringPolicies > 0 ? "attention" : "default"}
              />
            </Link>
          </section>
        )}

        <section>
          <VenturesHealthTable ventures={ventures} showKpis />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
              {ventures.map((v) => (
                <VentureCard key={v.id} venture={v} />
              ))}
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="flex-1">
              <DailyBriefingPanel />
            </div>
            <OwnerTimeline />
          </div>
        </section>
      </div>
    </>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  variant?: "default" | "healthy" | "attention" | "critical";
};

function SummaryCard({ label, value, variant = "default" }: SummaryCardProps) {
  const valueColors = {
    default: "text-gray-900",
    healthy: "text-green-700",
    attention: "text-amber-700",
    critical: "text-red-700",
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm h-full">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${valueColors[variant]}`}>
        {value}
      </div>
    </div>
  );
}

function VentureCard({ venture }: { venture: VentureSummaryWithAggregates }) {
  const badgeClasses: Record<VentureHealth, string> = {
    Healthy: "bg-green-100 text-green-800",
    Attention: "bg-amber-100 text-amber-800",
    Critical: "bg-red-100 text-red-800",
  };
  const badgeClass = badgeClasses[venture.health];

  const cardShadow =
    venture.health !== "Healthy" ? "shadow-md" : "shadow-sm";

  const topReason = venture.reasons?.[0];

  const isLogistics = venture.category === "Logistics" || venture.category === "Transport";
  const isHospitality = venture.category === "Hospitality";

  return (
    <Link
      href={`/ventures/${venture.id}`}
      className={`block rounded-xl border border-gray-200 p-4 bg-white ${cardShadow} hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer h-full`}
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors truncate">
            {venture.name}
          </div>
          <div className="text-sm text-gray-500">
            {venture.category} {venture.roleLabel !== "—" && `• ${venture.roleLabel}`}
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${badgeClass}`}
        >
          {venture.health}
        </span>
      </div>

      {topReason && (
        <div className="text-sm text-gray-600 mb-3">
          <span className="font-medium">Why: </span>
          {topReason.message}
          {venture.reasons.length > 1 && (
            <span className="text-gray-400">
              {" "}
              (+{venture.reasons.length - 1} more)
            </span>
          )}
        </div>
      )}

      <div className="flex items-center text-sm text-gray-600 mb-3">
        <span className="font-medium mr-1">Offices:</span>
        <span>{venture.officesCount}</span>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        {isLogistics && <FreightMiniKpi ventureId={venture.id} />}
        {isHospitality && <HotelMiniKpi ventureId={venture.id} />}
      </div>

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-blue-600 font-medium">
          View Details →
        </span>
        {isHospitality && (
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = `/hotel/${venture.id}`;
            }}
            className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
          >
            Hotel dashboard
          </span>
        )}
      </div>
    </Link>
  );
}

OverviewPage.title = "Overview";

export default OverviewPage;
