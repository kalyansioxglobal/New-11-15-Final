import { useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import type { PageWithLayout } from "@/types/page";
import { useRoleGuard } from "@/hooks/useRoleGuard";

import ShipperChurnTab from "./tabs/ShipperChurnTab";
import ShipperIcpTab from "./tabs/ShipperIcpTab";
import AtRiskLostTab from "./tabs/AtRiskLostTab";

type TabId = "churn" | "icp" | "at-risk";

const TABS: { id: TabId; label: string; description: string }[] = [
  { id: "churn", label: "Churn Analysis", description: "Track shipper activity and predict churn risk" },
  { id: "icp", label: "ICP Analysis", description: "Identify ideal customer profiles and segment shippers" },
  { id: "at-risk", label: "At-Risk & Lost", description: "Monitor loads approaching pickup and those already lost" },
];

const ShipperHealthPage: PageWithLayout = () => {
  const { loading: roleLoading, authorized } = useRoleGuard();
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tabParam = router.query.tab as string;
    if (tabParam === "icp" || tabParam === "at-risk" || tabParam === "churn") {
      return tabParam;
    }
    return "churn";
  });

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    router.push({ pathname: router.pathname, query: { tab } }, undefined, { shallow: true });
  };

  if (roleLoading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }
  if (!authorized) {
    return null;
  }

  if (!session) {
    return (
      <div className="p-6 text-gray-500">Please sign in to view shipper health analytics.</div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shipper Health</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Comprehensive shipper analytics: churn prediction, ideal customer profiling, and load risk monitoring
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-4 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "churn" && <ShipperChurnTab />}
      {activeTab === "icp" && <ShipperIcpTab />}
      {activeTab === "at-risk" && <AtRiskLostTab />}
    </div>
  );
};

ShipperHealthPage.title = "Shipper Health";

export default ShipperHealthPage;
