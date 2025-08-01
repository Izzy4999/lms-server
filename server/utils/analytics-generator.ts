import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../libs/prisma";
import { DefaultArgs } from "@prisma/client/runtime/library";

interface MonthData {
  month: string;
  count: number;
}

export async function generateLast12MonthData<T extends keyof PrismaClient>(
  model: T,
): Promise<{ last12Months: MonthData[] }> {
  const last12Months: MonthData[] = [];
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 1);

  for (let i = 11; i >= 0; i--) {
    const endate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() - i * 28
    );
    const startDate = new Date(
      endate.getFullYear(),
      endate.getMonth(),
      endate.getDate() - 28
    );

    const monthYear = endate.toLocaleString("default", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const count = await (prisma[model] as any).count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endate,
        },
      },
    });

    last12Months.push({ month: monthYear, count });
  }

  return { last12Months };
}
