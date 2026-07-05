import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "../generated/prisma/client";
import { InsufficientFundsError, ValidationError } from "./errors";
import { handleError, parseAmount, serializeTransaction } from "./utils";
import type { Transaction } from "./entities";

function makeTransaction(): Transaction {
  return {
    id: 1,
    originId: 10,
    destinationId: 11,
    amount: new Prisma.Decimal("1234.56"),
    state: "confirmed",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

test("parseAmount converts a finite number to Decimal", () => {
  const amount = parseAmount(1234.56);

  assert.equal(amount.toNumber(), 1234.56);
});

test("parseAmount rejects non numbers", () => {
  assert.throws(() => parseAmount("1234.56"), ValidationError);
});

test("parseAmount rejects infinite values", () => {
  assert.throws(() => parseAmount(Number.POSITIVE_INFINITY), ValidationError);
});

test("serializeTransaction converts Decimal amount to number", () => {
  const transaction = makeTransaction();
  const serialized = serializeTransaction(transaction);

  assert.equal(serialized.amount, 1234.56);
  assert.equal(serialized.state, "confirmed");
  assert.equal(serialized.originId, 10);
});

test("handleError uses statusCode for application errors", () => {
  const response = createResponseMock();

  handleError(new InsufficientFundsError(), response as never);

  assert.deepEqual(response.statusCalls, [409]);
  assert.deepEqual(response.jsonCalls, [{ error: "Insufficient funds" }]);
});

test("handleError falls back to 500 for unknown errors", () => {
  const response = createResponseMock();
  const error = new Error("boom");
  const originalConsoleError = console.error;
  const consoleCalls: unknown[] = [];

  console.error = (...args: unknown[]) => {
    consoleCalls.push(args);
  };

  try {
    handleError(error, response as never);
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(response.statusCalls, [500]);
  assert.deepEqual(response.jsonCalls, [{ error: "Internal server error" }]);
  assert.equal(consoleCalls.length, 1);
});

function createResponseMock() {
  const response = {
    statusCalls: [] as number[],
    jsonCalls: [] as Array<{ error: string }>,
    status(code: number) {
      response.statusCalls.push(code);
      return response;
    },
    json(body: { error: string }) {
      response.jsonCalls.push(body);
      return response;
    },
  };

  return response;
}
