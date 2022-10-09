import axios from "axios";
import type { GetServerSideProps, NextPage } from "next";
import absoluteUrl from "next-absolute-url";
import Head from "next/head";
import Image from "next/image";
import { useEffect } from "react";
import useSWRMutation from "swr/mutation";
import { StringParam, useQueryParam } from "use-query-params";
import prisma from "../lib/prisma";
import { createLoginUrl } from "../lib/spotify";
import SpotifyLogo from "../assets/logos/SpotifyLogo.png";
import GithubIcon from "../assets/icons/github.png";

import clsx from "clsx";
import Confetti from "../components/Confetti";

type HomeProps = {
  totalCount: number;
  host: string;
};

const createUserFetcher = async (
  url: string,
  { arg }: { arg: { code: string } }
) => {
  const response = await axios(url, {
    method: "POST",
    data: {
      code: arg.code,
    },
  });

  return response.data;
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

  const spotifyWeeklyPlaylistLink =
    data != null
      ? `https://open.spotify.com/playlist/${data.spotifyWeeklyPlaylistId}`
      : undefined;

  return (
    <div
      className="flex flex-col h-full overflow-auto p-4 mx-auto items-center justify-center max-w-3xl gap-16 text-center"
      style={{ minHeight: 800 }}
    >
      <Head>
        <title>Spotify Weekly: autosave your Discover Weekly</title>
      </Head>

      <header className="flex flex-col gap-4">
        <div className="w-60 mx-auto">
          <Image src={SpotifyLogo} alt="Spotify logo" layout="responsive" />
        </div>
        <h1 className="text-2xl font-medium">
          <span className="text-spotify-green">Spotify Weekly:</span> autosave
          your Discover Weekly playlist
        </h1>
      </header>

      <main className="flex flex-col gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-medium ">How it works?</h2>
          <p>
            By clicking on the button below, your tracks from Discover Weekly
            will be added to a new playlist called Spotify Weekly each Monday at
            9:00 PM UTC (GMT +0).
          </p>
        </div>

        <p className="font-medium">
          Used by <span className="text-spotify-green">{totalCount}</span> users
        </p>

        <a
          className={clsx(
            "mx-auto py-5 px-6 bg-spotify-green font-semibold no-underline rounded-full",
            isMutating && "pointer-events-none"
          )}
          href={loginUrl}
        >
          {isMutating ? "CONNECTING WITH SPOTIFY..." : "CONNECT WITH SPOTIFY"}
        </a>

        {(error != null || data != null) && (
          <div className="px-8 py-4 bg-gray-900 border-2 rounded-md border-spotify-green font-medium mx-auto">
            {error != null && (
              <p className="text-red-500">
                {error?.response?.data?.error || "Something went wrong"}
              </p>
            )}
            {data != null && (
              <>
                <p>{data?.message}</p>
                {spotifyWeeklyPlaylistLink != null && (
                  <a
                    className="hover:text-spotify-green underline"
                    href={spotifyWeeklyPlaylistLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open your Spotify Weekly Playlist
                  </a>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="flex flex-col gap-4 items-center">
        <a
          href="https://github.com/vladi-strilets/spotify-weekly"
          target="_blank"
          rel="noreferrer"
        >
          <div className="w-9">
            <Image src={GithubIcon} alt="Github icon" layout="responsive" />
          </div>
        </a>
        <p>
          Created by Vladimir Strilets:{" "}
          <a
            className="text-spotify-green no-underline"
            href="mailto:vladi@strilets.dev"
          >
            vladi@strilets.dev
          </a>
        </p>
      </footer>
      {data != null && error == null && <Confetti />}
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
