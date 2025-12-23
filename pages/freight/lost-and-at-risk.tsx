import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/freight/shipper-health?tab=at-risk",
      permanent: false,
    },
  };
};

export default function LostAndAtRiskRedirect(): null {
  return null;
}
