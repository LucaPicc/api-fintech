import type { Prisma } from "../generated/prisma/client";

export interface User {
  id: number;
  name: string;
  email: string;
  balance: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  balance: Prisma.Decimal;
}
