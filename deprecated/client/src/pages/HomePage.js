import queryString from "query-string";
import React, { useEffect } from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import GithubIcon from "../assets/icons/github.png";
import SpotifyLogo from "../assets/logos/SpotifyLogo.png";
import Confetti from "../components/Confetti";
import Loader from "../components/Loader";
import { API_URL } from "../utils/const";
import { useFetch } from "../utils/hooks";
import { loginUrl } from "../utils/spotify";
import { colors } from "../utils/styles";

const Container = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
	align-items: center;
	background: black;
	overflow: auto;
`;

const Section = styled.div`
	display: flex;
	flex: 1;
	padding: 0 16px;
	align-self: center;
	height: 100%;

	max-width: 800px;
	max-height: 800px;
	align-items: center;

	flex-direction: column;
	text-align: center;
	justify-content: space-around;
`;

const Img = styled.img`
	width: 240px;
	/* max-width: 400px; */
`;

const LoginButton = styled.a`
	padding: 20px 24px;
	margin-top: 24px;
	margin-bottom: 24px;
	border-radius: 99px;
	background-color: #1db954;
	font-weight: 600;
	color: white;
	text-decoration: none;
`;

const Message = styled.div`
	padding: 0 16px;
	background: #222222;
	border: 2px solid ${colors.SPOTIFY_GREEN};
	border-radius: 6px;
`;

const HomePage = ({}) => {
	const history = useHistory();

	const { data, error, isLoading, setAxiosParams } = useFetch();
	const {
		data: usersCount,
		// error: usersCountError,
		// isLoading: usersCountIsLoading,
		setAxiosParams: usersCountSetAxiosParams,
	} = useFetch();

	// fetch the total users
	useEffect(() => {
		const axiosParams = {
			method: "GET",
			url: `${API_URL}/users/count`,
		};
		usersCountSetAxiosParams(axiosParams);
	}, []);

	// catch code after successful spotify sign in
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
	}, []);

	if (isLoading)
		return (
			<Container>
				<div
					style={{
						display: "flex",
						flex: 1,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<Loader />
				</div>
			</Container>
		);

	return (
		<Container>
			<div style={{ display: "flex", flex: 1 }}>
				<Section>
					<div style={{ paddingTop: 16 }}>
						<Img src={SpotifyLogo} alt='Spotify logo' />
						<p style={{ fontSize: 24, fontWeight: 500 }}>
							<span style={{ color: colors.SPOTIFY_GREEN }}>
								Spotify Weekly:
							</span>{" "}
							autosave your Discover Weekly
						</p>
					</div>
					<div>
						<p style={{ fontSize: 24, fontWeight: 500 }}>How it works?</p>
						<p>
							By clicking on the button below, your tracks from Discover Weekly
							will be added to a new playlist called Spotify Weekly each Monday
							at 9:00 PM UTC (GMT +0).
						</p>
					</div>
					<div>
						<p style={{ fontWeight: 500 }}>
							Used by{" "}
							<span style={{ color: colors.SPOTIFY_GREEN }}>
								{usersCount ? usersCount.data : "_"}
							</span>{" "}
							users
						</p>
					</div>

					{!data && (
						<LoginButton href={loginUrl}>LOGIN WITH SPOTIFY</LoginButton>
					)}
					{data && (
						<Message>
							<p style={{ fontWeight: 500 }}>{data.data}</p>
						</Message>
					)}
					{error && (
						<Message>
							<p style={{ color: "red" }}>{error}</p>
						</Message>
					)}

					<div style={{ marginTop: 16, paddingBottom: 16 }}>
						<div>
							<a
								href='https://github.com/vladi-strilets/spotify-weekly'
								target='_blank'
							>
								<img
									src={GithubIcon}
									alt='Link to code on github'
									style={{ width: 34 }}
								/>
							</a>
						</div>
						<p>
							Created by Vladimir Strilets:{" "}
							<a
								style={{ color: colors.SPOTIFY_GREEN, textDecoration: "none" }}
								href='mailto:vladi@strilets.dev'
							>
								vladi@strilets.dev
							</a>
						</p>
					</div>
				</Section>
			</div>

			{data && <Confetti />}
		</Container>
	);
};

export default HomePage;
