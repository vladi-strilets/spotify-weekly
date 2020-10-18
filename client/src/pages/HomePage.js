import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import SpotifyLogo from "../assets/logos/SpotifyLogo.png";
import Login from "../components/Login";
import queryString from "query-string";
import axios from "axios";
import { API_URL } from "../utils/const";
import { useFetch } from "../utils/hooks";
import Loader from "../components/Loader";

const Container = styled.div`
	display: flex;
	height: 100%;
	justify-content: space-around;
	align-items: center;
	flex-direction: column;
	background: black;
`;

const Img = styled.img`
	width: 240px;
	/* max-width: 400px; */
`;

const HomePage = ({}) => {
	const history = useHistory();

	const { data, error, isLoading, setAxiosParams } = useFetch();

	useEffect(() => {
		// get code from search url
		const searchParams = queryString.parse(history.location.search);
		if (searchParams && "code" in searchParams) {
			const code = searchParams.code;

			// clear a location search
			history.replace(history.location.pathname);

			// define the request params
			const axiosParams = {
				method: "POST",
				url: `${API_URL}/users`,
				data: {
					code: code,
				},
			};
			setAxiosParams(axiosParams);
		}

		// make the request to server
	}, []);

	if (isLoading)
		return (
			<Container>
				<Loader />
			</Container>
		);

	console.log("data", data);
	return (
		<Container>
			<Img src={SpotifyLogo} alt='Spotify logo' />
			{data ? <p style={{ color: "white" }}>{data.data}</p> : <Login />}
		</Container>
	);
};

export default HomePage;
