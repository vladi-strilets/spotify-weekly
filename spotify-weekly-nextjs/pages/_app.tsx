import "../styles/normalize.css";
// import "../styles/app.css";
import { NextAdapter } from "next-query-params";
import type { AppProps } from "next/app";
import { QueryParamProvider } from "use-query-params";
import { SWRConfig } from "swr";
import { fetcher } from "../lib/swr";

const MyApp = ({ Component, pageProps }: AppProps) => {
  return (
    <SWRConfig
      value={{
        fetcher,
      }}
    >
      <QueryParamProvider adapter={NextAdapter}>
        <Component {...pageProps} />
      </QueryParamProvider>
    </SWRConfig>
  );
};

export default MyApp;
