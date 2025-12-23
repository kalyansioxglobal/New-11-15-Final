import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/freight/ai-tools?tab=intelligence",
      permanent: false,
    },
  };
};

export default function IntelligenceRedirect(): null {
  return null;
}
