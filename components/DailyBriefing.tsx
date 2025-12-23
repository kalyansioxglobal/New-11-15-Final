import { useEffect, useState } from 'react';

type Severity = 'INFO' | 'WARN' | 'CRITICAL';

interface BriefingItem {
  severity: Severity;
  label: string;
  detail: string;
  ventureId?: number;
  ventureName?: string;
  ventureType?: string;
  tags?: string[];
}

interface BriefingSection {
  title: string;
  items: BriefingItem[];
}

interface DailyBriefing {
  generatedAt: string;
  summaryLines: string[];
  logistics: BriefingSection;
  hospitality: BriefingSection;
  bpo: BriefingSection;
  generic: BriefingSection;
  wins: BriefingSection;
}

function severityBadge(severity: Severity) {
  const base =
    'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium gap-1';
  if (severity === 'CRITICAL') return `${base} bg-red-100 text-red-700`;
  if (severity === 'WARN') return `${base} bg-amber-100 text-amber-700`;
  return `${base} bg-emerald-100 text-emerald-700`;
}

function SeverityLabel({ severity }: { severity: Severity }) {
  if (severity === 'CRITICAL') {
    return (
      <>
        <span>🔥</span>
        <span>Firefront</span>
      </>
    );
  }
  if (severity === 'WARN') {
    return (
      <>
        <span>🌩</span>
        <span>Stormfront</span>
      </>
    );
  }
  return (
    <>
      <span>👀</span>
      <span>Watch</span>
    </>
  );
}

function severityDot(severity: Severity) {
  if (severity === 'CRITICAL') return 'bg-red-500';
  if (severity === 'WARN') return 'bg-amber-500';
  return 'bg-emerald-500';
}

function SectionBlock({
  section,
  defaultOpen = false,
}: {
  section: BriefingSection;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasCritical = section.items.some(i => i.severity === 'CRITICAL');
  const hasWarn = section.items.some(i => i.severity === 'WARN');

  if (section.items.length === 0) return null;

  return (
    <div className="border border-slate-600 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 flex items-center justify-between bg-slate-700/50 hover:bg-slate-700 text-left"
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              hasCritical ? 'bg-red-500' : hasWarn ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
          <span className="font-medium text-sm text-slate-100">{section.title}</span>
          <span className="text-xs text-slate-400">({section.items.length})</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="p-2 pb-1 space-y-2 max-h-[480px] overflow-y-auto">
          {section.items.map((item, idx) => (
            <div 
              key={idx} 
              className="border border-slate-600 rounded-lg p-3 bg-slate-800/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${severityDot(item.severity)}`} />
                <span className="font-medium text-sm text-slate-100 leading-tight">{item.label}</span>
              </div>
              
              <div className="pl-4 space-y-2">
                <span className={severityBadge(item.severity)}>
                  <SeverityLabel severity={item.severity} />
                </span>
                
                <p className="text-slate-400 text-xs leading-relaxed">{item.detail}</p>
                
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {item.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] rounded uppercase tracking-wide"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DailyBriefingPanel() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/briefing');
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load briefing');
        }
        const data = await res.json();
        setBriefing(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="border border-slate-700 rounded-xl bg-slate-800 p-4 shadow-sm">
        <h2 className="text-sm font-semibold mb-2 text-slate-100">Daily Briefing</h2>
        <div className="text-xs text-slate-400">Loading briefing...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-slate-700 rounded-xl bg-slate-800 p-4 shadow-sm">
        <h2 className="text-sm font-semibold mb-2 text-slate-100">Daily Briefing</h2>
        <div className="text-xs text-red-400">{error}</div>
      </div>
    );
  }

  if (!briefing) return null;

  const allSections = [
    briefing.logistics,
    briefing.hospitality,
    briefing.bpo,
    briefing.generic,
    briefing.wins,
  ];

  const criticalCount = allSections.reduce(
    (sum, s) => sum + s.items.filter(i => i.severity === 'CRITICAL').length,
    0
  );
  const warnCount = allSections.reduce(
    (sum, s) => sum + s.items.filter(i => i.severity === 'WARN').length,
    0
  );
  const winsCount = briefing.wins.items.length;

  return (
    <div className="border border-slate-700 rounded-xl bg-slate-800 p-4 shadow-sm flex flex-col h-full">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Daily Briefing (War Room)</h2>
          <span className="text-[10px] text-slate-400">
            {new Date(briefing.generatedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Fires, storms and wins across Logistics, Hospitality, BPO & tasks.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-3 text-xs">
        {criticalCount > 0 && (
          <div className="flex items-center gap-1">
            <span>🔥</span>
            <span className="text-red-700 font-medium">{criticalCount} Fires</span>
          </div>
        )}
        {warnCount > 0 && (
          <div className="flex items-center gap-1">
            <span>🌩</span>
            <span className="text-amber-700 font-medium">{warnCount} Storms</span>
          </div>
        )}
        {winsCount > 0 && (
          <div className="flex items-center gap-1">
            <span>✅</span>
            <span className="text-emerald-700 font-medium">{winsCount} Wins</span>
          </div>
        )}
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-0">
        <SectionBlock section={briefing.logistics} defaultOpen={criticalCount > 0} />
        <SectionBlock section={briefing.hospitality} defaultOpen={criticalCount > 0} />
        <SectionBlock section={briefing.bpo} defaultOpen={criticalCount > 0} />
        <SectionBlock section={briefing.generic} defaultOpen />
        <SectionBlock section={briefing.wins} />
      </div>

      {briefing.summaryLines.length > 0 && (
        <div className="mt-auto pt-2 border-t border-slate-700 text-xs text-slate-400">
          {briefing.summaryLines.map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
