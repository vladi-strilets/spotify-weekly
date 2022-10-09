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

const createUserFetcher = async (
  url: string,
  { arg }: { arg: { code: string } }
) => {
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
        <title>Spotify Weekly: autosave your Discover Weekly</title>
      </Head>

      <header>
        <h1>Spotify Weekly: autosave your Discover Weekly playlist</h1>
      </header>
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
