import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { PageWithLayout } from "@/types/page";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

const PreferencesPage: PageWithLayout = () => {
  const { preferences, loading, savePreferences } = useUserPreferences();

  if (loading) {
    return <div className="p-6">Loading your preferences…</div>;
  }

  if (!preferences) {
    return (
      <div className="p-6">
        <p className="text-red-600">Unable to load preferences. Please try refreshing the page.</p>
      </div>
    );
  }

  const handleChange =
    (field: keyof typeof preferences) =>
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      savePreferences({ [field]: e.target.value } as any);
    };

  const selectClass = "border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">User Preferences</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Customize how your Command Center looks and feels just for you.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="mr-4 font-medium text-gray-900 dark:text-gray-100">Theme</label>
          <select
            className={selectClass}
            value={preferences.theme}
            onChange={handleChange("theme")}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="mr-4 font-medium text-gray-900 dark:text-gray-100">Table Density</label>
          <select
            className={selectClass}
            value={preferences.density}
            onChange={handleChange("density")}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="mr-4 font-medium text-gray-900 dark:text-gray-100">Font Size</label>
          <select
            className={selectClass}
            value={preferences.fontSize}
            onChange={handleChange("fontSize")}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="mr-4 font-medium text-gray-900 dark:text-gray-100">Default Landing Page</label>
          <select
            className={selectClass}
            value={preferences.landingPage}
            onChange={handleChange("landingPage")}
          >
            <option value="freight">Freight Dashboard</option>
            <option value="hotels">Hospitality Dashboard</option>
            <option value="bpo">BPO Dashboard</option>
            <option value="holdings">Holdings / Bank</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
        Changes are saved automatically.
      </p>
    </div>
  );
};

PreferencesPage.title = "User Preferences";

export default PreferencesPage;
