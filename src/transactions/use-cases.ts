import { Prisma } from "../generated/prisma/client";
import type { Transaction } from "./entities";
import { InsufficientFundsError, UsersNotFoundError, ValidationError } from "./errors";
import type { TransactionRepositoryLike } from "./repository";
import type { UserRepositoryLike } from "../users/repository";

const MANUAL_REVIEW_THRESHOLD = new Prisma.Decimal(50000);

class TransactionUseCases {
  constructor(
    private readonly transactionRepository: TransactionRepositoryLike,
    private readonly userRepository: UserRepositoryLike,
  ) {}

  async createTransaction(input: {
    originId: number;
    destinationId: number;
    amount: Prisma.Decimal;
  }): Promise<Transaction> {
    if (!Number.isInteger(input.originId) || !Number.isInteger(input.destinationId)) {
      throw new ValidationError("originId and destinationId must be integers");
    }

    if (input.originId === input.destinationId) {
      throw new ValidationError("originId and destinationId must be different");
    }

    if (!input.amount.isFinite() || input.amount.lte(0)) {
      throw new ValidationError("amount must be greater than 0");
    }

    const usersExist = await this.userRepository.allExist([input.originId, input.destinationId]);

    if (!usersExist) {
      throw new UsersNotFoundError("Origin or destination user not found");
    }

    const originHasEnoughBalance = await this.userRepository.hasEnoughBalance(input.originId, input.amount);

    if (!originHasEnoughBalance) {
      throw new InsufficientFundsError();
    }

    if (input.amount.gt(MANUAL_REVIEW_THRESHOLD)) {
      return this.transactionRepository.createPendingTransaction(input);
    }

    return this.transactionRepository.createConfirmedTransactionWithBalanceUpdate(input);
  }

  async listTransactionsByUser(userId: number): Promise<Transaction[]> {
    if (!Number.isInteger(userId)) {
      throw new ValidationError("userId must be an integer");
    }

    const userExists = await this.userRepository.exists(userId);

    if (!userExists) {
      throw new UsersNotFoundError("User not found");
    }

    return this.transactionRepository.listTransactionsByUser(userId);
  }

  async approveTransaction(id: number): Promise<Transaction> {
    if (!Number.isInteger(id)) {
      throw new ValidationError("id must be an integer");
    }

    return this.transactionRepository.approvePendingTransaction(id);
  }

  async rejectTransaction(id: number): Promise<Transaction> {
    if (!Number.isInteger(id)) {
      throw new ValidationError("id must be an integer");
    }

    return this.transactionRepository.rejectPendingTransaction(id);
  }
}

export default TransactionUseCases;
