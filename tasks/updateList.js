const { default: axios } = require("axios");
const schedule = require("node-schedule");
const User = require("../models/User");
const moment = require("moment");
const queryString = require("query-string");
const useAsync = require("../utils/async");

const rule = new schedule.RecurrenceRule();

rule.tz = "Etc/GMT";
rule.dayOfWeek = 1; // Monday
rule.hour = 21;
rule.minute = 0;

exports.updateListTask = () =>
	schedule.scheduleJob(rule, async () => {
		console.log("running a task");

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
			const [token, tokenError] = useAsync(
				axios({
					method: "POST",
					url: "https://accounts.spotify.com/api/token",
					data: queryString.stringify({
						grant_type: "refresh_token",
						client_id: process.env.SPOTIFY_ID,
						client_secret: process.env.SPOTIFY_SECRET,
						refresh_token: user.refreshToken,
					}),
				})
			);
			// if there is an error that means the access has been removed
			if (tokenError) {
				await User.findByIdAndUpdate(user._id, { hasAccess: false });
				return;
			}
			const access_token = token.data.access_token;

			// get the list of tracks from Discover Weekly
			const [discoverWeeklyInfo, discoverWeeklyInfoError] = await useAsync(
				axios({
					method: "GET",
					url: `https://api.spotify.com/v1/playlists/${user.discoverWeeklyPlaylistId}`,
					headers: {
						Authorization: `Bearer ${access_token}`,
					},
				})
			);
			if (discoverWeeklyInfoError) {
				return;
			}
			const trackUris = discoverWeeklyDetails.data.tracks.items.map(
				(track) => track.track.uri
			);

			// add tracks to Spotify Weekly
			const [addTracks, addTracksError] = await useAsync(
				axios({
					method: "POST",
					url: `https://api.spotify.com/v1/playlists/${user.spotifyWeeklyPlaylistId}/tracks`,
					data: { uris: trackUris },
					headers: {
						Authorization: `Bearer ${access_token}`,
						"Content-Type": "application/json",
					},
				})
			);

			if (addTracksError) {
				return;
			}

			// update the lastUpdate
			await User.findByIdAndUpdate(user._id, { lastSave: Date.now() });
		});
	});
