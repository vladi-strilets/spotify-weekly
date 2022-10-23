import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  // check the secret key
  if (req.headers.authorization !== `Bearer ${process.env.API_SECRET_KEY}`) {
    res.status(401).json({ error: "Wrong secret" });
    return;
  }

  if (req.body.count !== 3) {
    res.status(429).json({ message: "Too many requests" });
    return;
  }

  res.status(200).json({ message: "Success" });
};

export default handler;
