import { PrismaClient } from "../supabase/functions/generated/client";

// const prisma = global.prisma || new PrismaClient();

// if (process.env.NODE_ENV !== "production") global.prisma = prisma;

const prisma = new PrismaClient();

export default prisma;
