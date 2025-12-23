import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/carrier-portal",
      permanent: true,
    },
  };
};

export default function LoadsRedirect(): null {
  return null;
}
