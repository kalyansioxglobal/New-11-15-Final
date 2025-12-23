import type { NextPage } from "next";
import type { ReactNode } from "react";

export type PageWithLayout<P = object> = NextPage<P> & {
  getLayout?: (page: ReactNode) => ReactNode;
  title?: string;
};
