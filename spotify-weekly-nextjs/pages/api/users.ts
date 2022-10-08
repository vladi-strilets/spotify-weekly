// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  name: string;
};

const handler = (req: NextApiRequest, res: NextApiResponse<Data>) => {
  if (req.method === "POST") {
    // check for the code in the request body
    if (req.body.code) {
      res.status(400).json({ name: "No code provided" });
      return;
    }

    // get token from spotify
    let token;
    try {
      const requestBody = {
        grant_type: "authorization_code",
        code: req.body.code,
        redirect_uri: process.env.REDIRECT_URI,
        client_id: process.env.SPOTIFY_ID,
        client_secret: process.env.SPOTIFY_SECRET,
      };
    } catch (error) {}
  }

  res.status(404).json({ name: "Not found" });
};

export default handler;
