import React from "react";
import "./css/normalize.css";
import "./css/app.css";
import { BrowserRouter } from "react-router-dom";
import MainRouter from "./routes/main.router";

const App = () => {
	return (
		<BrowserRouter>
			<MainRouter />
		</BrowserRouter>
	);
};

export default App;
