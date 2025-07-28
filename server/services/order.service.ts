import { NextFunction } from "express";
import prisma from "../libs/prisma";
import { CatchAsyncError } from "../middleware/catchAsyncError";

export const createOrderService = async (data: any) => {
  const order = await prisma.order.create(data);
  return order;
};

export const getAllOrderService = async () => {
  const orders = await prisma.order.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
  return orders;
};
