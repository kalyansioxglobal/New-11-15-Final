import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/dispatch/inbox",
      permanent: false,
    },
  };
};

export default function DispatchIndex(): null {
  return null;
}
