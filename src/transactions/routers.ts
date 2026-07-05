import { Router } from "express";
import { prisma } from "../database/prisma";
import UserRepository from "../users/repository";
import TransactionController from "./controller";
import TransactionRepository from "./repository";
import TransactionUseCases from "./use-cases";

const transactionsRouter = Router();
const userRepository = new UserRepository(prisma);
const transactionRepository = new TransactionRepository(prisma, userRepository);
const useCases = new TransactionUseCases(transactionRepository, userRepository);
const controller = new TransactionController(useCases);

transactionsRouter.post("/", (req, res) => controller.create(req, res));
transactionsRouter.get("/", (req, res) => controller.list(req, res));
transactionsRouter.patch("/:id/approve", (req, res) => controller.approve(req, res));
transactionsRouter.patch("/:id/reject", (req, res) => controller.reject(req, res));

export default transactionsRouter;
