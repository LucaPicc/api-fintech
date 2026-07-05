import type { Request, Response } from "express";
import TransactionUseCases from "./use-cases";
import { handleError, parseAmount, serializeTransaction } from "./utils";

class TransactionController {
  constructor(private readonly useCases: TransactionUseCases) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const originId = Number(req.body.originId);
      const destinationId = Number(req.body.destinationId);
      const amount = parseAmount(req.body.amount);

      const transaction = await this.useCases.createTransaction({
        originId,
        destinationId,
        amount,
      });

      res.status(201).json(serializeTransaction(transaction));
    } catch (error) {
      handleError(error, res);
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.query.userId);
      const transactions = await this.useCases.listTransactionsByUser(userId);

      res.status(200).json(transactions.map(serializeTransaction));
    } catch (error) {
      handleError(error, res);
    }
  }

  async approve(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const transaction = await this.useCases.approveTransaction(id);

      res.status(200).json(serializeTransaction(transaction));
    } catch (error) {
      handleError(error, res);
    }
  }

  async reject(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const transaction = await this.useCases.rejectTransaction(id);

      res.status(200).json(serializeTransaction(transaction));
    } catch (error) {
      handleError(error, res);
    }
  }
}

export default TransactionController;
