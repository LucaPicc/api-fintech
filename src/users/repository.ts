import type { Prisma, PrismaClient } from "../generated/prisma/client";

type PrismaTransactionClient = Prisma.TransactionClient;

export interface UserRepositoryLike {
  exists(id: number): Promise<boolean>;
  allExist(ids: number[]): Promise<boolean>;
  hasEnoughBalance(id: number, amount: Prisma.Decimal): Promise<boolean>;
  debitIfEnoughBalance(
    id: number,
    amount: Prisma.Decimal,
    prisma?: PrismaTransactionClient,
  ): Promise<boolean>;
  credit(id: number, amount: Prisma.Decimal, prisma?: PrismaTransactionClient): Promise<void>;
}

class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async exists(id: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    return Boolean(user);
  }

  async allExist(ids: number[]): Promise<boolean> {
    const uniqueIds = [...new Set(ids)];
    const count = await this.prisma.user.count({
      where: { id: { in: uniqueIds } },
    });

    return count === uniqueIds.length;
  }

  async hasEnoughBalance(id: number, amount: Prisma.Decimal): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { balance: true },
    });

    if (!user) {
      return false;
    }

    return user.balance.gte(amount);
  }

  async debitIfEnoughBalance(
    id: number,
    amount: Prisma.Decimal,
    prisma: PrismaTransactionClient = this.prisma,
  ): Promise<boolean> {
    const debit = await prisma.user.updateMany({
      where: {
        id,
        balance: { gte: amount },
      },
      data: {
        balance: { decrement: amount },
      },
    });

    return debit.count === 1;
  }

  async credit(id: number, amount: Prisma.Decimal, prisma: PrismaTransactionClient = this.prisma): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        balance: { increment: amount },
      },
    });
  }
}

export default UserRepository;
