import React from "react";
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import { default as ReactLoader } from "react-loader-spinner";

const Loader = ({}) => {
	return (
		<ReactLoader
			type='Oval'
			color='#FFFFFF'
			height={100}
			width={100}
			// timeout={3000} //3 secs
		/>
	);
};

export default Loader;
