import React from "react";
import styled from "styled-components";
import { loginUrl } from "../utils/spotify";

const LoginButton = styled.a`
	padding: 20px 24px;
	border-radius: 99px;
	background-color: #1db954;
	font-weight: 600;
	color: white;
	text-decoration: none;
`;

const Login = ({}) => {
	return <LoginButton href={loginUrl}>LOGIN WITH SPOTIFY</LoginButton>;
};

export default Login;
