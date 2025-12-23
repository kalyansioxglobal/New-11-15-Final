import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { PageWithLayout } from "@/types/page";

const OverviewTab = dynamic(() => import("./tabs/OverviewTab"), { ssr: false });
const RulesTab = dynamic(() => import("./tabs/RulesTab"), { ssr: false });
const SimulatorTab = dynamic(() => import("./tabs/SimulatorTab"), { ssr: false });
const RunTab = dynamic(() => import("./tabs/RunTab"), { ssr: false });

type TabId = "overview" | "rules" | "simulator" | "run";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "🏆" },
  { id: "rules", label: "Rules", icon: "📐" },
  { id: "simulator", label: "Simulator", icon: "🧪" },
  { id: "run", label: "Run", icon: "▶️" },
];

const AdminIncentivesPage: PageWithLayout = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab as TabId);
    }
  }, [router.query.tab]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    router.push({ pathname: "/admin/incentives", query: { tab: tabId } }, undefined, { shallow: true });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Incentive Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure incentive plans, rules, and run calculations across ventures.
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "rules" && <RulesTab />}
        {activeTab === "simulator" && <SimulatorTab />}
        {activeTab === "run" && <RunTab />}
      </div>
    </div>
  );
};

AdminIncentivesPage.title = "Incentive Management";

export default AdminIncentivesPage;
