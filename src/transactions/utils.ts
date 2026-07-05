import type { Response } from "express";
import { Prisma } from "../generated/prisma/client";
import type { Transaction } from "./entities";
import { isApplicationError, ValidationError } from "./errors";

export function parseAmount(value: unknown): Prisma.Decimal {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError("amount must be a number");
  }

  return new Prisma.Decimal(value);
}

export function serializeTransaction(transaction: Transaction) {
  return {
    ...transaction,
    amount: transaction.amount.toNumber(),
  };
}

export function handleError(error: unknown, res: Response): void {
  if (isApplicationError(error)) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}
