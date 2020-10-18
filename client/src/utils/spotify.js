export const authEndpoint = "https://accounts.spotify.com/authorize";
const redirectUri = "http://localhost:5000/";
const clientId = "eabb884d255d413b84aa357232bf1a08";

const scopes = ["playlist-read-private", "playlist-modify-private"];

export const loginUrl = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join(
	"%20"
)}&response_type=code&show_dialog=true`;
