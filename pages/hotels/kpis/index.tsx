import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { GetServerSideProps } from "next";
import Link from "next/link";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

const ChartsTab = dynamic(() => import("./tabs/ChartsTab"), { ssr: false });
const YoYReportTab = dynamic(() => import("./tabs/YoYReportTab"), { ssr: false });

type TabId = "charts" | "yoy-report";

const TABS: { id: TabId; label: string }[] = [
  { id: "charts", label: "Charts" },
  { id: "yoy-report", label: "YoY Report" },
];

function HotelKpisPage() {
  const router = useRouter();
  const activeTab = (router.query.tab as TabId) || "charts";

  const handleTabChange = (tabId: TabId) => {
    router.push({ pathname: router.pathname, query: { tab: tabId } }, undefined, { shallow: true });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Hotel KPIs</h1>
        <Link
          href="/hotels/snapshot"
          className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-600 dark:border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          View Snapshot
        </Link>
      </div>

      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === "charts" && <ChartsTab />}
        {activeTab === "yoy-report" && <YoYReportTab />}
      </div>
    </div>
  );
}

HotelKpisPage.title = "Hotel KPIs";

export default HotelKpisPage;
