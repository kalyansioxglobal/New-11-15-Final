import { useEffect } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";

export default function IncentiveSimulatorRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/incentives?tab=simulator");
  }, [router]);

  return (
    <div className="p-6 flex items-center justify-center">
      <p className="text-sm text-gray-500">Redirecting to Incentive Management...</p>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
