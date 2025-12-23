import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import CarrierDraftTab from "./tabs/CarrierDraftTab";
import EodDraftTab from "./tabs/EodDraftTab";
import OpsDiagnosticsTab from "./tabs/OpsDiagnosticsTab";
import IntelligenceTab from "./tabs/IntelligenceTab";

type TabId = "carrier-draft" | "eod-draft" | "ops-diagnostics" | "intelligence";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "carrier-draft", label: "Carrier Draft", icon: "✉️" },
  { id: "eod-draft", label: "EOD Draft", icon: "📋" },
  { id: "ops-diagnostics", label: "Ops Diagnostics", icon: "🔧" },
  { id: "intelligence", label: "Intelligence", icon: "🧠" },
];

function FreightAiToolsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("carrier-draft");

  useEffect(() => {
    const tabFromQuery = router.query.tab as TabId | undefined;
    if (tabFromQuery && TABS.some((t) => t.id === tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
  }, [router.query.tab]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    router.replace({ pathname: router.pathname, query: { tab: tabId } }, undefined, { shallow: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Tools</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI-powered tools for carrier outreach, reporting, diagnostics, and analytics
        </p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
        {activeTab === "carrier-draft" && <CarrierDraftTab />}
        {activeTab === "eod-draft" && <EodDraftTab />}
        {activeTab === "ops-diagnostics" && <OpsDiagnosticsTab />}
        {activeTab === "intelligence" && <IntelligenceTab />}
      </div>
    </div>
  );
}

FreightAiToolsPage.title = "AI Tools";
export default FreightAiToolsPage;
