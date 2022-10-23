import React from "react";
import useWindowSize from "react-use/lib/useWindowSize";
import ReactConfetti from "react-confetti";

const Confetti = () => {
  const { width, height } = useWindowSize();

  return <ReactConfetti width={width} height={height} />;
};

export default Confetti;
