import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { GetServerSideProps } from "next";

const DisputesTab = dynamic(() => import("./tabs/DisputesTab"), { ssr: false });
const LossNightsTab = dynamic(() => import("./tabs/LossNightsTab"), { ssr: false });

type TabId = "disputes" | "loss-nights";

const TABS: { id: TabId; label: string }[] = [
  { id: "disputes", label: "Disputes" },
  { id: "loss-nights", label: "Loss Nights" },
];

function HotelIssuesPage() {
  const router = useRouter();
  const activeTab = (router.query.tab as TabId) || "disputes";

  const handleTabChange = (tabId: TabId) => {
    router.push({ pathname: router.pathname, query: { tab: tabId } }, undefined, { shallow: true });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Hotel Issues</h1>

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
        {activeTab === "disputes" && <DisputesTab />}
        {activeTab === "loss-nights" && <LossNightsTab />}
      </div>
    </div>
  );
}

HotelIssuesPage.title = "Hotel Issues";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

export default HotelIssuesPage;
