const authEndpoint = "https://accounts.spotify.com/authorize";

const clientId = process.env.NEXT_PUBLIC_SPOTIFY_ID;

const scopes = ["playlist-read-private", "playlist-modify-private"];

export const createLoginUrl = (redirectUri: string) =>
  `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join(
    "%20"
  )}&response_type=code&show_dialog=true`;
