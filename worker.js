const mongoose = require("mongoose");
const connectDB = require("./config/db");
const updateList = require("./tasks/updateList");

// Load env vars
if (process.env.NODE_ENV !== "production") {
	const dotenv = require("dotenv");
	dotenv.config({ path: "./config/config.env" });
}

// call the task async after the mongodb is connected
(async () => {
	// Connect DB
	await connectDB();
	// do the tasts
	await updateList();
	// Close DB
	await mongoose.connection.close();
})();
