import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/freight/shipper-health?tab=churn",
      permanent: false,
    },
  };
};

export default function ShipperChurnRedirect(): null {
  return null;
}
