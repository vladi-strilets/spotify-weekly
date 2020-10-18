export const REDIRECT_URI =
	!process.env.NODE_ENV || process.env.NODE_ENV === "development"
		? "http://localhost:5000/"
		: "https://spotify-weekly.herokuapp.com/";
