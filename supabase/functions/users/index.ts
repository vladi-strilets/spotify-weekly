// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { difference } from "https://deno.land/std@0.168.0/datetime/mod.ts";
import { encode } from "https://deno.land/std@0.170.0/encoding/base64.ts";

import { corsHeaders } from "../shared/cors.ts";
import { PrismaClient } from "../generated/client/deno/edge.ts";
import type { users } from "../generated/client/deno/edge.ts";
import { WEEK_IN_SECONDS } from "../shared/const.ts";

type SuccessData = {
  message: string;
  spotifyWeeklyPlaylistId: string;
};

const prisma = new PrismaClient();

const responseWithError = (error: string, status = 400) => {
  const body = JSON.stringify({ error });

  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
};

const responseWithSuccess = (data: SuccessData) => {
  const body = JSON.stringify(data);

  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
};

const getTrackUrisFromList = (tracks: any[]) =>
  tracks.map((track) => track.track.uri);

const getSpotifyToken = async (code: string) => {
  const requestBody = {
    grant_type: "authorization_code",
    code,
    redirect_uri: Deno.env.get("SPOTIFY_REDIRECT_URL")!,
    client_id: Deno.env.get("NEXT_PUBLIC_SPOTIFY_ID")!,
    client_secret: Deno.env.get("SPOTIFY_SECRET")!,
  };

  const authHeader = encode(
    Deno.env.get("NEXT_PUBLIC_SPOTIFY_ID")! +
      ":" +
      Deno.env.get("SPOTIFY_SECRET")!
  );

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    body: new URLSearchParams(requestBody),
    headers: {
      Authorization: "Basic " + authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error();
  }

  return data;
};

const getSpotifyUser = async (accessToken: string) => {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error();
  }

  const data = await response.json();

  return data;
};

const getListOfTracks = async (
  discoverWeeklyPlaylistId: string,
  accessToken: string
) => {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${discoverWeeklyPlaylistId}/tracks`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error();
  }

  const data = await response.json();

  const tracks = getTrackUrisFromList(data.items);

  return tracks;
};

const addTracksToThePlaylist = async (
  playlistId: string,
  tracksUris: string[],
  accessToken: string
) => {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      method: "POST",
      body: JSON.stringify({
        uris: tracksUris,
        position: 0,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error();
  }
};

const updatePlaylistForExistingUser = async (
  user: users,
  accessToken: string
) => {
  const { lastUpdate } = user;

  const secondsFromLastUpdate = difference(new Date(), lastUpdate, {
    units: ["seconds"],
  });

  if (lastUpdate == null || secondsFromLastUpdate > WEEK_IN_SECONDS) {
    const { discoverWeeklyPlaylistId, spotifyWeeklyPlaylistId } = user;

    if (discoverWeeklyPlaylistId == null) {
      throw new Error("discoverWeeklyPlaylistId is null");
    }

    if (spotifyWeeklyPlaylistId == null) {
      throw new Error("spotifyWeeklyPlaylistId is null");
    }

    // get the list of tracks from Discover Weekly
    const tracksUris = await getListOfTracks(
      discoverWeeklyPlaylistId,
      accessToken
    );

    // add tracks to the Spotify Weekly playlist
    await addTracksToThePlaylist(
      spotifyWeeklyPlaylistId,
      tracksUris,
      accessToken
    );

    // update the last update date
    await prisma.users.update({
      where: {
        id: user.id,
      },
      data: {
        lastUpdate: new Date(),
      },
    });
  }
};

const updateUserDataAfterFreshLogin = async (user: users) => {
  await prisma.users.update({
    where: {
      id: user.id,
    },
    data: {
      hasAccess: true,
    },
  });
};

const fetchDiscoverWeeklyPlaylist = async (
  url: string,
  params: any,
  accessToken: string
) => {
  const queryParams = new URLSearchParams(params);

  const response = await fetch(`${url}/?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error();
  }

  const data = await response.json();

  return data;
};

const findDiscoveryWeeklyFromArray = (items: any[]) =>
  items.find(
    (playlist) =>
      playlist.name === "Discover Weekly" &&
      playlist.owner.uri === "spotify:user:spotify"
  );

const findDiscoveryWeeklyPlaylistFromSearch = async (accessToken: string) => {
  const queryParams = new URLSearchParams({
    q: "Discover Weekly",
    type: "playlist",
  });

  const response = await fetch(
    `https://api.spotify.com/v1/search/?${queryParams}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error();
  }

  const data = await response.json();

  const discoverWeekly = findDiscoveryWeeklyFromArray(data.playlists.items);

  return discoverWeekly;
};

const findDiscoverWeeklyPlaylist = async (accessToken: string) => {
  let data = await fetchDiscoverWeeklyPlaylist(
    "https://api.spotify.com/v1/me/playlists",
    {
      limit: 50,
      offset: 0,
    },
    accessToken
  );

  let discoverWeekly = findDiscoveryWeeklyFromArray(data.items);
  let next = data.next;

  while (discoverWeekly == null && next != null) {
    data = await fetchDiscoverWeeklyPlaylist(next, {}, accessToken);

    discoverWeekly = findDiscoveryWeeklyFromArray(data.items);
    next = data.next;
  }

  // if there ir no Discover Weekly playlist, then we could find it from Search endpoint
  if (discoverWeekly === undefined) {
    discoverWeekly = await findDiscoveryWeeklyPlaylistFromSearch(accessToken);
  }

  return discoverWeekly;
};

const getListOfTracksFromPlaylist = async (
  playlistId: string,
  accessToken: string
): Promise<string[]> => {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error();
  }

  const data = await response.json();

  const tracks = getTrackUrisFromList(data.items);

  return tracks;
};

const createSpotifyWeeklyPlaylist = async (
  spotifyUserId: string,
  accessToken: string
) => {
  const response = await fetch(
    `https://api.spotify.com/v1/users/${spotifyUserId}/playlists`,
    {
      method: "POST",
      body: JSON.stringify({
        name: "Spotify Weekly",
        description: "Discover Weekly playlist from Spotify Weekly",
        public: false,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error();
  }

  const data = await response.json();

  return data;
};

const addTracksFromDiscoverWeeklyToSpotifyWeekly = async (
  discoverWeeklyId: string,
  spotifyUserId: string,
  accessToken: string
) => {
  const tracksUris = await getListOfTracksFromPlaylist(
    discoverWeeklyId,
    accessToken
  );

  if (tracksUris.length === 0) {
    throw new Error("No tracks in Discover Weekly");
  }

  const spotifyWeeklyPlaylist = await createSpotifyWeeklyPlaylist(
    spotifyUserId,
    accessToken
  );

  await addTracksToThePlaylist(
    spotifyWeeklyPlaylist.id,
    tracksUris,
    accessToken
  );

  return spotifyWeeklyPlaylist;
};

const sleep = (seconds: number) => {
  const ms = seconds * 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
};

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST", ...corsHeaders },
    });
  }

  await sleep(15);

  const { code } = await req.json();

  // check for the code in the request body
  if (code == null) {
    return responseWithError("Code in body is missing");
  }

  // get token from spotify
  let token;
  try {
    token = await getSpotifyToken(code);
  } catch (error) {
    console.log(error);
    return responseWithError("Error getting token from Spotify");
  }

  const accessToken = token.access_token;

  // get spotify user data
  let spotifyUser;
  try {
    spotifyUser = await getSpotifyUser(accessToken);
  } catch (error) {
    console.log(error);
    return responseWithError("Error getting user from Spotify");
  }

  // check if user already exists
  let user;
  try {
    user = await prisma.users.findFirst({
      where: {
        spotifyId: spotifyUser.id,
      },
    });
  } catch (error) {
    console.log(error);
    return responseWithError("Error getting user from database");
  }

  // if user exists
  if (user) {
    try {
      await updatePlaylistForExistingUser(user, accessToken);
    } catch (error) {
      console.log(error);
      return responseWithError("Error updating playlist for existing user");
    }

    // in case the user has returned, let's update the hasAccess flag
    if (!user.hasAccess) {
      try {
        await updateUserDataAfterFreshLogin(user);
      } catch (error) {
        console.log(error);
        return responseWithError("Error updating user data after fresh login");
      }
    }

    return responseWithSuccess({
      message: `Welcome back, ${spotifyUser.display_name}!`,
      spotifyWeeklyPlaylistId: user.spotifyWeeklyPlaylistId!,
    });
  }

  // new user

  // find the Discover Weekly playlist
  let discoverWeeklyPlaylist;
  try {
    discoverWeeklyPlaylist = await findDiscoverWeeklyPlaylist(accessToken);
  } catch (error) {
    console.log(error);
    return responseWithError("Error finding Discover Weekly playlist");
  }

  if (discoverWeeklyPlaylist == null) {
    return responseWithError("Can't find your Discover Weekly playlist");
  }

  // get the list of tracks from Discover Weekly
  let spotifyWeeklyPlaylist;
  try {
    spotifyWeeklyPlaylist = await addTracksFromDiscoverWeeklyToSpotifyWeekly(
      discoverWeeklyPlaylist.id,
      spotifyUser.id,
      accessToken
    );
  } catch (error) {
    console.log(error);
    return responseWithError(
      "Error adding tracks from Discover Weekly to Spotify Weekly"
    );
  }

  // create user in the database
  const userData = {
    spotifyId: spotifyUser.id as string,
    refreshToken: token.refresh_token as string,
    lastUpdate: new Date(),
    discoverWeeklyPlaylistId: discoverWeeklyPlaylist.id as string,
    spotifyWeeklyPlaylistId: spotifyWeeklyPlaylist.id as string,
  };

  try {
    await prisma.users.create({
      data: userData,
    });
  } catch (error) {
    console.log(error);
    return responseWithError("Error creating user in the database");
  }

  return responseWithSuccess({
    message:
      "Setup is done. You will get your Spotify Weekly updates every Tuesday. Check your Spotify Weekly playlist!",
    spotifyWeeklyPlaylistId: spotifyWeeklyPlaylist.id,
  });
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
