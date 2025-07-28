import prisma from "../libs/prisma";
import { redis } from "../libs/redis";

export const getUserById = async (id: string) => {
  const user = await redis.get(id);
  if (user) {
    return JSON.parse(user);
  }
};

// Get all users
export const getAllUsersService = async () =>{
  const users = await prisma.user.findMany({
    orderBy:{
      createdAt: "desc"
    }
  });
  return users;
}