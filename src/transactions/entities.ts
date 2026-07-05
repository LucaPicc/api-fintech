import type { Prisma } from "../generated/prisma/client";

export type TransactionState = "pending" | "confirmed" | "rejected";

export interface Transaction {
  id: number;
  originId: number;
  destinationId: number;
  amount: Prisma.Decimal;
  state: TransactionState;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionInput {
  originId: number;
  destinationId: number;
  amount: Prisma.Decimal;
}
