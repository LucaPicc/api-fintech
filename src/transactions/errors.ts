export interface ApplicationError extends Error {
  statusCode: number;
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof Error && "statusCode" in error && typeof error.statusCode === "number";
}

export class ValidationError extends Error implements ApplicationError {
  statusCode = 400;
}

export class UsersNotFoundError extends Error implements ApplicationError {
  statusCode = 404;
}

export class TransactionNotFoundError extends Error implements ApplicationError {
  statusCode = 404;

  constructor() {
    super("Transaction not found");
  }
}

export class InsufficientFundsError extends Error implements ApplicationError {
  statusCode = 409;

  constructor() {
    super("Insufficient funds");
  }
}

export class InvalidTransactionStateError extends Error implements ApplicationError {
  statusCode = 409;

  constructor() {
    super("Transaction must be pending");
  }
}
