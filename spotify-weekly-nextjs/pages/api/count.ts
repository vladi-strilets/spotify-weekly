// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

type Data = {
  totalUsers: number;
};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
  const totalUsers = await prisma.users.count();
  res.status(200).json({ totalUsers });
};

export default handler;
