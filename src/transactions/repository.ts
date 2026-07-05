import type { PrismaClient } from "../generated/prisma/client";
import type { CreateTransactionInput, Transaction, TransactionState } from "./entities";
import {
  InsufficientFundsError,
  InvalidTransactionStateError,
  TransactionNotFoundError,
} from "./errors";
import type { UserRepositoryLike } from "../users/repository";

export interface TransactionRepositoryLike {
  createPendingTransaction(data: CreateTransactionInput): Promise<Transaction>;
  createConfirmedTransactionWithBalanceUpdate(data: CreateTransactionInput): Promise<Transaction>;
  listTransactionsByUser(userId: number): Promise<Transaction[]>;
  approvePendingTransaction(id: number): Promise<Transaction>;
  rejectPendingTransaction(id: number): Promise<Transaction>;
}

class TransactionRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly userRepository: UserRepositoryLike,
  ) {}

  async createPendingTransaction(data: CreateTransactionInput): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: {
        originId: data.originId,
        destinationId: data.destinationId,
        amount: data.amount,
        state: "pending",
      },
    });
  }

  async createConfirmedTransactionWithBalanceUpdate(data: CreateTransactionInput): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      const debited = await this.userRepository.debitIfEnoughBalance(data.originId, data.amount, tx);

      if (!debited) {
        throw new InsufficientFundsError();
      }

      await this.userRepository.credit(data.destinationId, data.amount, tx);

      return tx.transaction.create({
        data: {
          originId: data.originId,
          destinationId: data.destinationId,
          amount: data.amount,
          state: "confirmed",
        },
      });
    });
  }

  async listTransactionsByUser(userId: number): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        OR: [{ originId: userId }, { destinationId: userId }],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTransactionById(id: number): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: { id },
    });
  }

  async approvePendingTransaction(id: number): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
      });

      if (!transaction) {
        throw new TransactionNotFoundError();
      }

      const stateUpdate = await tx.transaction.updateMany({
        where: { id, state: "pending" },
        data: { state: "confirmed" },
      });

      if (stateUpdate.count !== 1) {
        throw new InvalidTransactionStateError();
      }

      const debited = await this.userRepository.debitIfEnoughBalance(
        transaction.originId,
        transaction.amount,
        tx,
      );

      if (!debited) {
        throw new InsufficientFundsError();
      }

      await this.userRepository.credit(transaction.destinationId, transaction.amount, tx);

      return tx.transaction.findUniqueOrThrow({
        where: { id },
      });
    });
  }

  async rejectPendingTransaction(id: number): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!transaction) {
        throw new TransactionNotFoundError();
      }

      const stateUpdate = await tx.transaction.updateMany({
        where: { id, state: "pending" },
        data: { state: "rejected" },
      });

      if (stateUpdate.count !== 1) {
        throw new InvalidTransactionStateError();
      }

      return tx.transaction.findUniqueOrThrow({
        where: { id },
      });
    });
  }
}

export default TransactionRepository;
