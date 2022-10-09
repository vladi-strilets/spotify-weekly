import axios from "axios";
import type { GetServerSideProps, NextPage } from "next";
import absoluteUrl from "next-absolute-url";
import Head from "next/head";
import { useEffect } from "react";
import useSWRMutation from "swr/mutation";
import { StringParam, useQueryParam } from "use-query-params";
import prisma from "../lib/prisma";
import { createLoginUrl } from "../lib/spotify";

type HomeProps = {
  totalCount: number;
  host: string;
};

const createUserFetcher = async (url: string, { arg }) => {
  return axios(url, {
    method: "POST",
    data: {
      code: arg.code,
    },
  });
};

const Home: NextPage<HomeProps> = (props) => {
  const { totalCount, host } = props;

  const [code, setCode] = useQueryParam("code", StringParam);
  const { data, error, trigger, isMutating } = useSWRMutation(
    "/api/users",
    createUserFetcher,
    { throwOnError: false }
  );

  useEffect(() => {
    if (code) {
      trigger({ code });
      setCode(undefined);
    }
  }, []);

  const loginUrl = createLoginUrl(host);

  return (
    <div>
      <Head>
        <title>Spotify Weekly</title>
        <meta
          name="description"
          content="Save you spotify weekly playlist every week"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <p>total count: {totalCount}</p>
        <a href={loginUrl}>CONNECT SPOTIFY</a>
        {isMutating && <p>loading...</p>}
      </main>

      <footer></footer>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  // get total user count
  const totalCount = await prisma.users.count();

  // get current host
  const { origin } = absoluteUrl(context.req);
  const host = new URL(origin).href;

  return {
    props: {
      totalCount,
      host,
    },
  };
};

export default Home;
