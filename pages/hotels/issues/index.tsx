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
      <h1 className="text-xl font-semibold text-slate-100">Hotel Issues</h1>

      <div className="border-b border-slate-700">
        <nav className="flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
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
