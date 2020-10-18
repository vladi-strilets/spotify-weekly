export const API_URL =
	!process.env.NODE_ENV || process.env.NODE_ENV === "development"
		? "http://localhost:5000/api/v1"
		: "https://spotify-weekly.herokuapp.com/api/v1";
