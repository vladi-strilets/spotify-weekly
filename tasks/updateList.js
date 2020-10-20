const { default: axios } = require("axios");
const User = require("../models/User");
const moment = require("moment");
const queryString = require("query-string");

const updateList = async () => {
	console.log("Running a task");

	// as we use Free Heroku Scheduler, we need to specify to run this code only on Mondays
	if (moment().day() !== 1) {
		console.log("Sorry, but not today");
		return;
	}

	// get the list of users
	const users = await User.find({ hasAccess: true });

	// if there is no users just return
	if (!users.length) return;

	// update spotify weekly playlist
	users.forEach(async (user) => {
		// check if the last update week and year is the current week, then do nothing
		if (
			moment(user.lastUpdate).week() === moment().week() &&
			moment(user.lastUpdate).year() === moment().year()
		) {
			return;
		}

		// get the access token
		try {
			const token = await axios({
				method: "POST",
				url: "https://accounts.spotify.com/api/token",
				data: queryString.stringify({
					grant_type: "refresh_token",
					client_id: process.env.SPOTIFY_ID,
					client_secret: process.env.SPOTIFY_SECRET,
					refresh_token: user.refreshToken,
				}),
			});
		} catch (err) {
			console.error(err.message);
			// if there is an error that means the access has been removed
			await User.findByIdAndUpdate(user._id, { hasAccess: false });
			return;
		}

		const access_token = token.data.access_token;

		// get the list of tracks from Discover Weekly
		try {
			const discoverWeeklyInfo = await axios({
				method: "GET",
				url: `https://api.spotify.com/v1/playlists/${user.discoverWeeklyPlaylistId}`,
				headers: {
					Authorization: `Bearer ${access_token}`,
				},
			});
		} catch (err) {
			console.error(err.message);
			return;
		}

		const trackUris = discoverWeeklyDetails.data.tracks.items.map(
			(track) => track.track.uri
		);

		// add tracks to Spotify Weekly
		try {
			const addTracks = await axios({
				method: "POST",
				url: `https://api.spotify.com/v1/playlists/${user.spotifyWeeklyPlaylistId}/tracks`,
				data: { uris: trackUris },
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});
		} catch (err) {
			console.error(err.message);
			return;
		}
		// update the lastUpdate
		await User.findByIdAndUpdate(user._id, { lastSave: Date.now() });
	});
};

module.exports = updateList;
