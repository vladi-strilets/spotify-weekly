const express = require("express");
const path = require("path");

// Middlewares
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const hpp = require("hpp");
const cors = require("cors");
const xss = require("xss-clean");
// Database connector
const connectDB = require("./config/db");
// routes
const users = require("./routes/users");
// tasks
const { updateListTask } = require("./tasks/updateList");

// Load env vars
if (process.env.NODE_ENV !== "production") {
	const dotenv = require("dotenv");
	dotenv.config({ path: "./config/config.env" });
}

// Connect DB
connectDB();

// create app
const app = express();

// Body parser
app.use(express.json());
// Sanitize data
app.use(mongoSanitize());
// Set security headers
app.use(helmet());
// Prevent XSS attacks
app.use(xss());
// Prevent http param pollution
app.use(hpp());
// Enable CORS
app.use(cors());

// Dev logginf middleware
if (process.env.NODE_ENV === "development") {
	const morgan = require("morgan");
	app.use(morgan("dev"));
}

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

// Mount routers
app.use("/api/v1/users", users);

app.get("/api/v1", (req, res) => {
	res.status(200).json({
		message: "hello",
	});
});

app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname + "client/build/index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	// run the tasks
	updateListTask();
	console.log(`Express app listening on ${PORT}`);
});
