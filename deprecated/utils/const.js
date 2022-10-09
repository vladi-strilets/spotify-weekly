const REDIRECT_URI =
	!process.env.NODE_ENV || process.env.NODE_ENV === "development"
		? "http://localhost:3000/"
		: "https://spotify-weekly.herokuapp.com/";

module.exports = {
	REDIRECT_URI,
};
