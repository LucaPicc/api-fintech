import express from "express";
import transactionsRouter from "./transactions/routers";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());
app.use("/transactions", transactionsRouter);

app.get("/healthcheck", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on port ${port}`);
});
