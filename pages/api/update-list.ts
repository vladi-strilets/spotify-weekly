import axios, { AxiosError, AxiosResponse } from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { WEEK_IN_MILLISECONDS } from "../../lib/const";
import prisma from "../../lib/prisma";
import queryString from "query-string";

type SettledResult = {
  status: "rejected" | "fulfilled";
  value?: AxiosResponse;
  reason?: AxiosError;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  // check the secret key
  if (req.headers.authorization !== `Bearer ${process.env.API_SECRET_KEY}`) {
    res.status(401).json({ error: "Wrong secret" });
    return;
  }

  // get the list of users
  const users = await prisma.users.findMany({
    where: {
      hasAccess: true,
      lastUpdate: {
        lte: new Date(new Date().getTime() - WEEK_IN_MILLISECONDS),
      },
      discoverWeeklyPlaylistId: {
        not: null,
      },
      spotifyWeeklyPlaylistId: {
        not: null,
      },
      // spotifyId: "11137035373",
    },
  });

  // if there is no users just return
  if (users.length === 0) {
    res.status(200).json({ message: "No users" });
    return;
  }

  // get new access token for each user
  const getAccessTokenPromises = users.map((user) =>
    axios({
      method: "POST",
      url: "https://accounts.spotify.com/api/token",
      data: queryString.stringify({
        grant_type: "refresh_token",
        refresh_token: user.refreshToken,
        client_id: process.env.NEXT_PUBLIC_SPOTIFY_ID,
        client_secret: process.env.SPOTIFY_SECRET,
      }),
    })
  );

  const getAccessTokenResults = await Promise.allSettled(
    getAccessTokenPromises
  );

  const getAccessTokenResultsWithUsers = getAccessTokenResults.map(
    (result: SettledResult, index) => ({
      status: result.status,
      value: result.value?.data,
      reason: result.reason,
      user: users[index],
    })
  );

  // filter rejected promises (means the access has been removed) or user doesn't exist anymore
  // update has access to false for each rejected promise
  const rejectedGetAccessTokenResultsWithUsers =
    getAccessTokenResultsWithUsers.filter(
      (result) => result.status === "rejected"
    );

  if (rejectedGetAccessTokenResultsWithUsers.length > 0) {
    console.error(
      "rejectedGetAccessTokenResultsWithUsers",
      rejectedGetAccessTokenResultsWithUsers.map((result) => ({
        ...(result.reason?.response?.data as object),
        userId: result.user.id,
      }))
    );
  }

  const usersIdsHasAccessFalse = rejectedGetAccessTokenResultsWithUsers.map(
    (result) => result.user.id
  );

  if (usersIdsHasAccessFalse.length > 0) {
    console.log(
      `set 'hasAccess: false' to ${usersIdsHasAccessFalse.length} users from usersIdsHasAccessFalse`
    );
    await prisma.users.updateMany({
      where: {
        id: {
          in: usersIdsHasAccessFalse,
        },
      },
      data: {
        hasAccess: false,
      },
    });
  }

  // filter fulfilled promises
  const fulfilledGetAccessTokenResultsWithUsers =
    getAccessTokenResultsWithUsers.filter(
      (result) => result.status === "fulfilled"
    );

  // get the list of tracks from Discover Weekly
  const getTracksPromises = fulfilledGetAccessTokenResultsWithUsers.map(
    (result) => {
      const { access_token: accessToken } = result.value;
      const { discoverWeeklyPlaylistId } = result.user;

      return axios({
        method: "GET",
        url: `https://api.spotify.com/v1/playlists/${discoverWeeklyPlaylistId}/tracks`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit: 50,
        },
      });
    }
  );

  const getTracksResults = await Promise.allSettled(getTracksPromises);

  const getTracksResultsWithUsers = getTracksResults.map(
    (result: SettledResult, index) => ({
      status: result.status,
      value: result.value?.data,
      reason: result.reason,
      user: fulfilledGetAccessTokenResultsWithUsers[index].user,
      accessToken:
        fulfilledGetAccessTokenResultsWithUsers[index].value.access_token,
    })
  );

  const failedGetTracksResultsWithUsers = getTracksResultsWithUsers.filter(
    (result) => result.status === "rejected"
  );

  if (failedGetTracksResultsWithUsers.length > 0) {
    console.error(
      "failedGetTracksResultsWithUsers",
      failedGetTracksResultsWithUsers.map(
        (result) => result.reason?.response?.data
      )
    );
  }

  // remove users who doesn't have discover weekly playlist anymore
  const removeDiscoverWeeklyPlaylistUserIds = failedGetTracksResultsWithUsers
    .filter(
      // @ts-ignore
      (result) => result.reason?.response?.data?.error?.message === "Not found."
    )
    .map((result) => result.user.id);

  if (removeDiscoverWeeklyPlaylistUserIds.length > 0) {
    console.log(
      `removing discoverWeeklyPlaylistId from ${removeDiscoverWeeklyPlaylistUserIds.length} users`
    );
    await prisma.users.updateMany({
      where: {
        id: {
          in: removeDiscoverWeeklyPlaylistUserIds,
        },
      },
      data: {
        hasAccess: false,
        discoverWeeklyPlaylistId: null,
      },
    });
  }

  const fulfilledGetTracksResultsWithUsers = getTracksResultsWithUsers.filter(
    (result) => result.status === "fulfilled"
  );

  // add tracks uris to the spotify weekly playlist
  const addTracksPromises = fulfilledGetTracksResultsWithUsers.map((result) => {
    const { accessToken } = result;
    const { items } = result.value;
    const { spotifyWeeklyPlaylistId } = result.user;

    const tracksUris: string[] = items.map(
      (item: { track: { uri: string } }) => item.track.uri
    );

    return axios({
      method: "POST",
      url: `https://api.spotify.com/v1/playlists/${spotifyWeeklyPlaylistId}/tracks`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        uris: tracksUris,
        position: 0,
      },
    });
  });

  const addTracksResults = await Promise.allSettled(addTracksPromises);

  const addTracksResultsWithUsers = addTracksResults.map(
    (result: SettledResult, index) => ({
      status: result.status,
      value: result.value?.data,
      reason: result.reason,
      user: fulfilledGetTracksResultsWithUsers[index].user,
    })
  );

  const failedAddTracksResultsWithUsers = addTracksResultsWithUsers.filter(
    (result) => result.status === "rejected"
  );

  if (failedAddTracksResultsWithUsers.length > 0) {
    console.error(
      "failedAddTracksResultsWithUsers",
      failedAddTracksResultsWithUsers.map(
        (result) => result.reason?.response?.data
      )
    );
  }

  // remove users who doesn't have spotify weekly playlist anymore
  const removeSpotifyWeeklyPlaylistUserIds = failedAddTracksResultsWithUsers
    .filter(
      // @ts-ignore
      (result) => result.reason?.response?.data?.error?.message === "Not found."
    )
    .map((result) => result.user.id);

  if (removeSpotifyWeeklyPlaylistUserIds.length > 0) {
    console.log(
      `removing spotifyWeeklyPlaylistId from ${removeSpotifyWeeklyPlaylistUserIds.length} users`
    );
    await prisma.users.updateMany({
      where: {
        id: {
          in: removeSpotifyWeeklyPlaylistUserIds,
        },
      },
      data: {
        hasAccess: false,
        spotifyWeeklyPlaylistId: null,
      },
    });
  }

  const fulfilledAddTracksResultsWithUsers = addTracksResultsWithUsers.filter(
    (result) => result.status === "fulfilled"
  );

  // update last update for each user
  const usersIdsLastUpdate = fulfilledAddTracksResultsWithUsers.map(
    (result) => result.user.id
  );

  if (usersIdsLastUpdate.length === 0) {
    res
      .status(200)
      .json({ message: "No users left to update in the last step" });
    return;
  }

  await prisma.users.updateMany({
    where: {
      id: {
        in: usersIdsLastUpdate,
      },
    },
    data: {
      lastUpdate: new Date(),
    },
  });

  console.log(`updated ${usersIdsLastUpdate.length} users`);

  res
    .status(200)
    .json({ message: `Updated ${usersIdsLastUpdate.length} users` });
};

export default handler;
