import React from "react";
import ReactConfetti from "react-confetti";
import { useWindowDimensions } from "../utils/hooks";

const Confetti = () => {
	const { width, height } = useWindowDimensions();

	return <ReactConfetti width={width} height={height} />;
};

export default Confetti;
