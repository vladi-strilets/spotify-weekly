const User = require("../models/User");
const asyncHandler = require("../middlewares/async");
const axios = require("axios");
const queryString = require("query-string");
const ErrorResponse = require("../utils/errorResponse");
const { useAsync } = require("../utils/async");
const moment = require("moment");
const { REDIRECT_URI } = require("../utils/const");

// @desc    Create a new user
// @route   POST /api/v1/users/
// @access  Public
exports.createUser = asyncHandler(async (req, res, next) => {
	if (!req.body.code) {
		return next(new ErrorResponse(`code is required`, 400));
	}

	// get token
	const requestBody = {
		grant_type: "authorization_code",
		code: req.body.code,
		redirect_uri: REDIRECT_URI,
		client_id: process.env.SPOTIFY_ID,
		client_secret: process.env.SPOTIFY_SECRET,
	};

	const [token, tokenError] = await useAsync(
		axios({
			method: "POST",
			url: "https://accounts.spotify.com/api/token",
			data: queryString.stringify(requestBody),
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		})
	);

	if (tokenError) {
		return next(new ErrorResponse(`Get token error`, 400));
	}

	const access_token = token.data.access_token;

	// get spotify user
	const [spotifyUser, spotifyUserError] = await useAsync(
		axios({
			method: "GET",
			url: "https://api.spotify.com/v1/me",
			headers: {
				Authorization: `Bearer ${access_token}`,
			},
		})
	);

	if (spotifyUserError) {
		return next(new ErrorResponse(`Spotify user error`, 400));
	}

	// check if user already exists
	let user;
	user = await User.findOne({ spotifyId: spotifyUser.data.id });
	if (user) {
		// USER EXISTS
		// update the list if needed
		if (
			!(
				moment(user.lastUpdate).week() === moment().week() &&
				moment(user.lastUpdate).year() === moment().year()
			)
		) {
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
				return next(new ErrorResponse(`Discover Weekly Info error`, 400));
			}
			const trackUris = discoverWeeklyInfo.data.tracks.items.map(
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
				return next(
					new ErrorResponse(`Error on add tracks to Spotify Weekly`, 400)
				);
			}

			// update the lastUpdate
			await User.findByIdAndUpdate(user._id, { lastUpdate: Date.now() });
		}

		// update hasAccess to true
		if (!user.hasAccess) {
			await User.findByIdAndUpdate(user._id, { hasAccess: true });
		}

		return res.status(200).json({
			success: true,
			data: "Welcome back!",
		});
	}

	// find the "Discover weekly playlist"
	let playlists = await axios({
		method: "GET",
		url: "https://api.spotify.com/v1/me/playlists",
		headers: {
			Authorization: `Bearer ${access_token}`,
		},
		params: {
			offset: 0,
			limit: 50,
		},
	});
	let discoverWeekly = playlists.data.items.find(
		(playlist) =>
			playlist.name === "Discover Weekly" &&
			playlist.owner.uri === "spotify:user:spotify"
	);

	// repeat until find Discover Weekly or the end of the playlists list
	while (!discoverWeekly && !!playlists.data.next) {
		playlists = await axios({
			method: "GET",
			url: playlists.data.next,
			headers: {
				Authorization: `Bearer ${access_token}`,
			},
		});
		discoverWeekly = playlists.data.items.find(
			(playlist) =>
				playlist.name === "Discover Weekly" &&
				playlist.owner.uri === "spotify:user:spotify"
		);
	}

	// if there ir no Discover Weekly playlist, then we could find it from Search endpoint
	if (!discoverWeekly) {
		// it should be the first one
		playlists = await axios({
			method: "GET",
			url: "https://api.spotify.com/v1/search",
			params: {
				q: "Discover Weekly",
				type: "playlist",
			},
			headers: {
				Authorization: `Bearer ${access_token}`,
			},
		});
		discoverWeekly = playlists.data.items.find(
			(playlist) =>
				playlist.name === "Discover Weekly" &&
				playlist.owner.uri === "spotify:user:spotify"
		);
	}

	if (!discoverWeekly) {
		// if there is no Discover Weekly
		return next(
			new ErrorResponse(
				`Discover Weekly playlist not found, please follow it on your Spotify and try again`,
				404
			)
		);
	}

	// get the list of tracks from Discover Weekly
	const [discoverWeeklyInfo, discoverWeeklyInfoError] = await useAsync(
		axios({
			method: "GET",
			url: `https://api.spotify.com/v1/playlists/${discoverWeekly.id}`,
			headers: {
				Authorization: `Bearer ${access_token}`,
			},
		})
	);

	if (discoverWeeklyInfoError) {
		return next(new ErrorResponse(`Discover Weekly Info error`, 400));
	}

	const trackUris = discoverWeeklyInfo.data.tracks.items.map(
		(track) => track.track.uri
	);

	// create a new Playlist
	const [spotifyWeeklyPlaylist, spotifyWeeklyPlaylistError] = await useAsync(
		axios({
			method: "POST",
			url: `https://api.spotify.com/v1/users/${spotifyUser.data.id}/playlists`,
			data: {
				name: "Spotify Weekly",
				description: "History of your songs from Discover Weekly",
				public: false,
			},
			headers: {
				Authorization: `Bearer ${access_token}`,
			},
		})
	);

	if (spotifyWeeklyPlaylistError) {
		return next(new ErrorResponse(`Error on create a new playlist`, 400));
	}

	// put the tracks from Discover Weekly to a new create Sporify Weekly playlist
	const [addTracks, addTracksError] = await useAsync(
		axios({
			method: "POST",
			url: `https://api.spotify.com/v1/playlists/${spotifyWeeklyPlaylist.data.id}/tracks`,
			data: {
				uris: trackUris,
				position: 0,
			},
			headers: {
				Authorization: `Bearer ${access_token}`,
				"Content-Type": "application/json",
			},
		})
	);

	if (addTracksError) {
		return next(
			new ErrorResponse(`Error on add tracks to Spotify Weekly`, 400)
		);
	}

	// create a new user
	const userData = {
		spotifyId: spotifyUser.data.id,
		refreshToken: token.data.refresh_token,
		lastUpdate: Date.now(),
		discoverWeeklyPlaylistId: discoverWeekly.id,
		spotifyWeeklyPlaylistId: spotifyWeeklyPlaylist.data.id,
	};
	await User.create(userData);

	return res.status(201).json({
		success: true,
		data:
			"Setup is done. You will get your Spotify Weekly updates every Monday at 9:00 PM UTC (GTM+0). Check your Spotify Weekly playlist!",
	});
});

exports.usersCount = asyncHandler(async (req, res, next) => {
	const usersCount = await User.countDocuments({});

	return res.status(200).json({
		success: true,
		data: usersCount,
	});
});
