import axios from "axios";
import { useEffect, useState } from "react";

export const useFetch = () => {
	const [data, setData] = useState(null);
	const [axiosParams, setAxiosParams] = useState(null);
	const [error, setError] = useState(null);
	const [isLoading, setIsLoading] = useState(false);

	const fetchData = async () => {
		setIsLoading(true);
		try {
			const response = await axios(axiosParams);
			setData(response.data);
		} catch (err) {
			console.error(err.message);
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (axiosParams) {
			fetchData();
		}
	}, [axiosParams]);

	return { data, error, isLoading, setAxiosParams };
};

const getWindowDimensions = () => {
	const { innerWidth: width, innerHeight: height } = window;
	return {
		width,
		height,
	};
};

export const useWindowDimensions = () => {
	const [windowDimensions, setWindowDimensions] = useState(
		getWindowDimensions()
	);

	useEffect(() => {
		function handleResize() {
			setWindowDimensions(getWindowDimensions());
		}

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return windowDimensions;
};
