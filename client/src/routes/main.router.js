import React from "react";

import { Route, Switch } from "react-router-dom";
import HomePage from "../pages/HomePage";
import ROUTES from "./routes.types";

const MainRouter = () => {
	return (
		<Switch>
			<Route path={ROUTES.HOME} component={HomePage} />
		</Switch>
	);
};

export default MainRouter;
