import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "../generated/prisma/client";
import { InsufficientFundsError, UsersNotFoundError, ValidationError } from "./errors";
import TransactionUseCases from "./use-cases";
import type { Transaction } from "./entities";
import type { TransactionRepositoryLike } from "./repository";
import type { UserRepositoryLike } from "../users/repository";

type TransactionCalls = {
  createPending: Array<{ originId: number; destinationId: number; amount: string }>;
  createConfirmed: Array<{ originId: number; destinationId: number; amount: string }>;
  list: number[];
  approve: number[];
  reject: number[];
};

type UserCalls = {
  exists: number[];
  allExist: number[][];
  hasEnoughBalance: Array<{ id: number; amount: string }>;
};

function makeTransaction(
  id: number,
  originId: number,
  destinationId: number,
  amount: Prisma.Decimal,
  state: Transaction["state"],
): Transaction {
  return {
    id,
    originId,
    destinationId,
    amount,
    state,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function createTransactionRepositoryMock(): { repo: TransactionRepositoryLike; calls: TransactionCalls } {
  const calls: TransactionCalls = {
    createPending: [],
    createConfirmed: [],
    list: [],
    approve: [],
    reject: [],
  };

  return {
    calls,
    repo: {
      async createPendingTransaction(data) {
        calls.createPending.push({
          originId: data.originId,
          destinationId: data.destinationId,
          amount: data.amount.toString(),
        });

        return makeTransaction(1, data.originId, data.destinationId, data.amount, "pending");
      },
      async createConfirmedTransactionWithBalanceUpdate(data) {
        calls.createConfirmed.push({
          originId: data.originId,
          destinationId: data.destinationId,
          amount: data.amount.toString(),
        });

        return makeTransaction(2, data.originId, data.destinationId, data.amount, "confirmed");
      },
      async listTransactionsByUser(userId) {
        calls.list.push(userId);
        return [];
      },
      async approvePendingTransaction(id) {
        calls.approve.push(id);
        return makeTransaction(3, 1, 2, new Prisma.Decimal(1000), "confirmed");
      },
      async rejectPendingTransaction(id) {
        calls.reject.push(id);
        return makeTransaction(4, 1, 2, new Prisma.Decimal(1000), "rejected");
      },
    },
  };
}

function createUserRepositoryMock() {
  const calls: UserCalls = {
    exists: [],
    allExist: [],
    hasEnoughBalance: [],
  };

  const state = {
    exists: true,
    allExist: true,
    hasEnoughBalance: true,
  };

  const repo: UserRepositoryLike = {
    async exists(id) {
      calls.exists.push(id);
      return state.exists;
    },
    async allExist(ids) {
      calls.allExist.push([...ids]);
      return state.allExist;
    },
    async hasEnoughBalance(id, amount) {
      calls.hasEnoughBalance.push({ id, amount: amount.toString() });
      return state.hasEnoughBalance;
    },
    async debitIfEnoughBalance() {
      return true;
    },
    async credit() {},
  };

  return { repo, calls, state };
}

function buildSut() {
  const transaction = createTransactionRepositoryMock();
  const user = createUserRepositoryMock();
  const useCases = new TransactionUseCases(transaction.repo, user.repo);

  return { useCases, transaction, user };
}

test("createTransaction rejects non integer ids", async () => {
  const { useCases, transaction, user } = buildSut();

  await assert.rejects(
    () =>
      useCases.createTransaction({
        originId: 1.2,
        destinationId: 2,
        amount: new Prisma.Decimal(1000),
      }),
    ValidationError,
  );

  assert.equal(user.calls.allExist.length, 0);
  assert.equal(transaction.calls.createPending.length, 0);
  assert.equal(transaction.calls.createConfirmed.length, 0);
});

test("createTransaction rejects same origin and destination", async () => {
  const { useCases, user } = buildSut();

  await assert.rejects(
    () =>
      useCases.createTransaction({
        originId: 1,
        destinationId: 1,
        amount: new Prisma.Decimal(1000),
      }),
    ValidationError,
  );

  assert.equal(user.calls.allExist.length, 0);
});

test("createTransaction rejects non positive amount", async () => {
  const { useCases, user } = buildSut();

  await assert.rejects(
    () =>
      useCases.createTransaction({
        originId: 1,
        destinationId: 2,
        amount: new Prisma.Decimal(0),
      }),
    ValidationError,
  );

  assert.equal(user.calls.allExist.length, 0);
});

test("createTransaction rejects when users do not exist", async () => {
  const { useCases, user } = buildSut();
  user.state.allExist = false;

  await assert.rejects(
    () =>
      useCases.createTransaction({
        originId: 1,
        destinationId: 2,
        amount: new Prisma.Decimal(1000),
      }),
    UsersNotFoundError,
  );

  assert.deepEqual(user.calls.allExist, [[1, 2]]);
});

test("createTransaction confirms automatically when amount is within threshold and balance is enough", async () => {
  const { useCases, transaction, user } = buildSut();

  const result = await useCases.createTransaction({
    originId: 1,
    destinationId: 2,
    amount: new Prisma.Decimal(1000),
  });

  assert.equal(result.state, "confirmed");
  assert.equal(transaction.calls.createConfirmed.length, 1);
  assert.equal(transaction.calls.createPending.length, 0);
  assert.deepEqual(user.calls.hasEnoughBalance, [{ id: 1, amount: "1000" }]);
});

test("createTransaction rejects any amount when origin has insufficient funds", async () => {
  const { useCases, user, transaction } = buildSut();
  user.state.hasEnoughBalance = false;

  await assert.rejects(
    () =>
      useCases.createTransaction({
        originId: 1,
        destinationId: 2,
        amount: new Prisma.Decimal(60000),
      }),
    InsufficientFundsError,
  );

  assert.equal(transaction.calls.createPending.length, 0);
  assert.equal(transaction.calls.createConfirmed.length, 0);
});

test("createTransaction creates pending when amount is above threshold and balance is enough", async () => {
  const { useCases, transaction, user } = buildSut();

  const result = await useCases.createTransaction({
    originId: 1,
    destinationId: 2,
    amount: new Prisma.Decimal(60000),
  });

  assert.equal(result.state, "pending");
  assert.equal(transaction.calls.createPending.length, 1);
  assert.equal(transaction.calls.createConfirmed.length, 0);
  assert.deepEqual(user.calls.hasEnoughBalance, [{ id: 1, amount: "60000" }]);
});

test("listTransactionsByUser validates user id and delegates", async () => {
  const { useCases, transaction, user } = buildSut();

  const result = await useCases.listTransactionsByUser(1);

  assert.deepEqual(result, []);
  assert.deepEqual(user.calls.exists, [1]);
  assert.deepEqual(transaction.calls.list, [1]);
});

test("listTransactionsByUser rejects invalid id", async () => {
  const { useCases, transaction, user } = buildSut();

  await assert.rejects(() => useCases.listTransactionsByUser(NaN), ValidationError);

  assert.equal(user.calls.exists.length, 0);
  assert.equal(transaction.calls.list.length, 0);
});

test("listTransactionsByUser rejects missing user", async () => {
  const { useCases, user } = buildSut();
  user.state.exists = false;

  await assert.rejects(() => useCases.listTransactionsByUser(1), UsersNotFoundError);
});

test("approveTransaction validates id and delegates", async () => {
  const { useCases, transaction } = buildSut();

  const result = await useCases.approveTransaction(10);

  assert.equal(result.state, "confirmed");
  assert.deepEqual(transaction.calls.approve, [10]);
});

test("approveTransaction rejects invalid id", async () => {
  const { useCases, transaction } = buildSut();

  await assert.rejects(() => useCases.approveTransaction(1.1), ValidationError);

  assert.equal(transaction.calls.approve.length, 0);
});

test("rejectTransaction validates id and delegates", async () => {
  const { useCases, transaction } = buildSut();

  const result = await useCases.rejectTransaction(11);

  assert.equal(result.state, "rejected");
  assert.deepEqual(transaction.calls.reject, [11]);
});

test("rejectTransaction rejects invalid id", async () => {
  const { useCases, transaction } = buildSut();

  await assert.rejects(() => useCases.rejectTransaction(1.1), ValidationError);

  assert.equal(transaction.calls.reject.length, 0);
});
