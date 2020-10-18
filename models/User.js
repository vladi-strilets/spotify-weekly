const mongoose = require("mongoose");

const User = new mongoose.Schema(
	{
		spotifyId: {
			type: String,
			required: true,
			unique: true,
		},
		lastUpdate: {
			type: Date,
		},
		hasAccess: {
			type: Boolean,
			default: true,
		},
		refreshToken: {
			type: String,
			required: true,
		},
		discoverWeeklyPlaylistId: {
			type: String,
			unique: true,
		},
		spotifyWeeklyPlaylistId: {
			type: String,
			unique: true,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("User", User);
