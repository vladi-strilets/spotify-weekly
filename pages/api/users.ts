// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import absoluteUrl from "next-absolute-url";
import prisma from "../../lib/prisma";
import { differenceInSeconds } from "date-fns";
import { WEEK_IN_SECONDS } from "../../lib/const";

type Data =
  | {
      message?: string;
      spotifyWeeklyPlaylistId?: string;
    }
  | {
      error?: string;
      errorDescription?: string;
    };

const catchError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return {
      status: 400,
      error: error.response?.data.error,
      errorDescription: error.response?.data.error_description,
    };
  }
  return {
    status: 500,
    error: "Something went wrong",
  };
};

const catctErrorAndRespond = (err: unknown, res: NextApiResponse<Data>) => {
  const { status, error, errorDescription } = catchError(err);
  res.status(status).json({ error, errorDescription });
};

const respondError = (
  status: number,
  message: string,
  res: NextApiResponse<Data>
) => {
  res.status(status).json({ error: message });
};

const getSpotifyToken = async (
  code: string,
  req: NextApiRequest,
  res: NextApiResponse<Data>
) => {
  const { origin } = absoluteUrl(req);
  const host = new URL(origin).href;

  const requestBody = {
    grant_type: "authorization_code",
    code,
    redirect_uri: host,
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_ID!,
    client_secret: process.env.SPOTIFY_SECRET!,
  };

  try {
    const response = await axios({
      method: "POST",
      url: "https://accounts.spotify.com/api/token",
      data: new URLSearchParams(requestBody),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data;
  } catch (err) {
    catctErrorAndRespond(err, res);
    return null;
  }
};

const getSpotifyUser = async (
  accessToken: string,
  res: NextApiResponse<Data>
) => {
  try {
    const response = await axios({
      method: "GET",
      url: "https://api.spotify.com/v1/me",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    catctErrorAndRespond(error, res);
    return null;
  }
};

const getTrackUrisFromList = (tracks: any[]) =>
  tracks.map((track) => track.track.uri);

const getListOfTracks = async (
  discoverWeeklyPlaylistId: string,
  accessToken: string,
  res: NextApiResponse<Data>
) => {
  try {
    const response = await axios({
      method: "GET",
      url: `https://api.spotify.com/v1/playlists/${discoverWeeklyPlaylistId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return getTrackUrisFromList(response.data.tracks.items);
  } catch (err) {
    catctErrorAndRespond(err, res);
    return null;
  }
};

const addTracksToThePlaylist = async (
  spotifyWeeklyPlaylistId: string,
  tracksUris: string[],
  accessToken: string,
  res: NextApiResponse<Data>
) => {
  try {
    await axios({
      method: "POST",
      url: `https://api.spotify.com/v1/playlists/${spotifyWeeklyPlaylistId}/tracks`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        uris: tracksUris,
        position: 0,
      },
    });
  } catch (err) {
    catctErrorAndRespond(err, res);
    return null;
  }
};

const findDiscoveryWeeklyFromArray = (items: any[]) =>
  items.find(
    (playlist) =>
      playlist.name === "Discover Weekly" &&
      playlist.owner.uri === "spotify:user:spotify"
  );

const findDiscoveryWeeklyPlaylist = async (
  url: string,
  params: object,
  accessToken: string,
  res: NextApiResponse<Data>
) => {
  try {
    const response = await axios({
      method: "GET",
      url,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params,
    });

    const discoverWeekly = findDiscoveryWeeklyFromArray(response.data.items);
    const next = response.data.next;

    return { discoverWeekly, next };
  } catch (err) {
    catctErrorAndRespond(err, res);
    return null;
  }
};

const findDiscoveryWeeklyPlaylistFromSearch = async (
  accessToken: string,
  res: NextApiResponse<Data>
) => {
  try {
    const response = await axios({
      method: "GET",
      url: "https://api.spotify.com/v1/search",
      params: {
        q: "Discover Weekly",
        type: "playlist",
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return findDiscoveryWeeklyFromArray(response.data.playlists.items);
  } catch (err) {
    catctErrorAndRespond(err, res);
    return null;
  }
};

const getListOfTracksFromDiscoverWeekly = async (
  discoverWeeklyId: string,
  accessToken: string,
  res: NextApiResponse<Data>
) => {
  try {
    const response = await axios({
      method: "GET",
      url: `https://api.spotify.com/v1/playlists/${discoverWeeklyId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return getTrackUrisFromList(response.data.tracks.items);
  } catch (error) {
    catctErrorAndRespond(error, res);
    return null;
  }
};

const createSpotifyWeeklyPlaylist = async (
  spotifyUserId: string,
  accessToken: string,
  res: NextApiResponse<Data>
) => {
  try {
    const response = await axios({
      method: "POST",
      url: `https://api.spotify.com/v1/users/${spotifyUserId}/playlists`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        name: "Spotify Weekly",
        description: "History of your songs from Discover Weekly",
        public: false,
      },
    });

    return response.data;
  } catch (err) {
    catctErrorAndRespond(err, res);
    return null;
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const { code } = req.body;

  // check for the code in the request body
  if (code == null) {
    return respondError(400, "Missing code", res);
  }

  // get token from spotify
  const token = await getSpotifyToken(code, req, res);
  if (token === null) return;

  const accessToken = token.access_token;

  // get spotify user data
  const spotifyUser = await getSpotifyUser(accessToken, res);
  if (spotifyUser === null) return;

  // check if user already exists
  let user;
  try {
    user = await prisma.users.findFirst({
      where: {
        spotifyId: spotifyUser.id,
      },
    });
  } catch (error) {
    return respondError(400, "Error finding user", res);
  }

  // if user exists
  if (user) {
    // update the playlist if needed
    if (
      user.lastUpdate == null ||
      differenceInSeconds(new Date(), user.lastUpdate) > WEEK_IN_SECONDS
    ) {
      // get the list of tracks from Discover Weekly
      const tracksUris = await getListOfTracks(
        user.discoverWeeklyPlaylistId!,
        accessToken,
        res
      );
      if (tracksUris === null) return;

      // add tracks to the playlist
      const result = await addTracksToThePlaylist(
        user.spotifyWeeklyPlaylistId!,
        tracksUris,
        accessToken,
        res
      );
      if (result === null) return;

      // update the last update date
      try {
        await prisma.users.update({
          where: {
            id: user.id,
          },
          data: {
            lastUpdate: new Date(),
          },
        });
      } catch (err) {
        return respondError(400, "Error updating last update date", res);
      }
    }

    // in case the user has returned, let's update the hasAccess flag
    try {
      await prisma.users.update({
        where: {
          id: user.id,
        },
        data: {
          hasAccess: true,
        },
      });
    } catch (err) {
      return respondError(400, "Error updating hasAccess flag", res);
    }

    return res.status(200).json({
      message: `Welcome back, ${spotifyUser.display_name}!`,
      spotifyWeeklyPlaylistId: user.spotifyWeeklyPlaylistId!,
    });
  }

  // new user

  // find the "discover weekly" playlist
  let findResults = await findDiscoveryWeeklyPlaylist(
    "https://api.spotify.com/v1/me/playlists",
    {
      offset: 0,
      limit: 50,
    },
    accessToken,
    res
  );
  if (findResults === null) return;
  let { discoverWeekly, next } = findResults;

  // repeat until find Discover Weekly or the end of the playlists list
  while (discoverWeekly === undefined || next != null) {
    findResults = await findDiscoveryWeeklyPlaylist(next, {}, accessToken, res);
    if (findResults === null) return;
    discoverWeekly = findResults.discoverWeekly;
    next = findResults.next;
  }

  // if there ir no Discover Weekly playlist, then we could find it from Search endpoint
  if (discoverWeekly === undefined) {
    discoverWeekly = await findDiscoveryWeeklyPlaylistFromSearch(
      accessToken,
      res
    );
    if (discoverWeekly === null) return;
  }

  // can't find Discover Weekly playlist
  if (discoverWeekly === undefined) {
    return respondError(400, "Can't find Discover Weekly playlist", res);
  }

  // get the list of tracks from Discover Weekly
  const tracksUris = await getListOfTracksFromDiscoverWeekly(
    discoverWeekly.id,
    accessToken,
    res
  );
  if (tracksUris === null) return;

  // create Spotify Weekly playlist
  const spotifyWeeklyPlaylist = await createSpotifyWeeklyPlaylist(
    spotifyUser.id,
    accessToken,
    res
  );
  if (spotifyWeeklyPlaylist === null) return;

  // put the tracks from Discover Weekly to a new create Sporify Weekly playlist
  const result = await addTracksToThePlaylist(
    spotifyWeeklyPlaylist.id,
    tracksUris,
    accessToken,
    res
  );
  if (result === null) return;

  // create a new user
  const userData = {
    spotifyId: spotifyUser.id as string,
    refreshToken: token.refresh_token as string,
    lastUpdate: new Date(),
    discoverWeeklyPlaylistId: discoverWeekly.id as string,
    spotifyWeeklyPlaylistId: spotifyWeeklyPlaylist.id as string,
  };

  try {
    await prisma.users.create({
      data: userData,
    });
  } catch (err) {
    return respondError(400, "Error creating user", res);
  }

  return res.status(200).json({
    message:
      "Setup is done. You will get your Spotify Weekly updates every Monday at 9:00 PM UTC (GTM+0). Check your Spotify Weekly playlist!",
  });
};

export default handler;
