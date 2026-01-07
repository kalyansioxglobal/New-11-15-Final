import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const AssetsTab = dynamic(() => import("./tabs/AssetsTab"), { ssr: false });
const IncidentsTab = dynamic(() => import("./tabs/IncidentsTab"), { ssr: false });

type TabId = "assets" | "incidents";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "assets", label: "Assets", icon: "💻" },
  { id: "incidents", label: "Incidents", icon: "🔧" },
];

function ITPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("assets");

  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab as TabId);
    }
  }, [router.query.tab]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    router.push({ pathname: "/it", query: { tab: tabId } }, undefined, { shallow: true });
  };

  return (
    <div className="p-6 space-y-6 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">IT Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage IT assets and track incidents across your organization.
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === "assets" && <AssetsTab />}
        {activeTab === "incidents" && <IncidentsTab />}
      </div>
    </div>
  );
}

ITPage.title = "IT Management";

export default ITPage;
