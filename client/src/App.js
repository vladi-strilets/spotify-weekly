import React from "react";
import { BrowserRouter } from "react-router-dom";
import "./css/app.css";
import "./css/normalize.css";
import MainRouter from "./routes/main.router";

const App = () => {
	return (
		<BrowserRouter>
			<MainRouter />
		</BrowserRouter>
	);
};

export default App;
