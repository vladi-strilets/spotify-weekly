import "../styles/normalize.css";
import "../styles/app.css";
import { NextAdapter } from "next-query-params";
import type { AppProps } from "next/app";
import { QueryParamProvider } from "use-query-params";

const MyApp = ({ Component, pageProps }: AppProps) => {
  return (
    <QueryParamProvider adapter={NextAdapter}>
      <Component {...pageProps} />
    </QueryParamProvider>
  );
};

export default MyApp;
