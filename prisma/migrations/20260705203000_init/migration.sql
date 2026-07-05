-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "TransactionState" AS ENUM ('pending', 'confirmed', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" SERIAL NOT NULL,
    "originId" INTEGER NOT NULL,
    "destinationId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "state" "TransactionState" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_state_idx" ON "Transaction"("state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_originId_idx" ON "Transaction"("originId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_destinationId_idx" ON "Transaction"("destinationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_originId_createdAt_idx" ON "Transaction"("originId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_destinationId_createdAt_idx" ON "Transaction"("destinationId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_originId_state_idx" ON "Transaction"("originId", "state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_destinationId_state_idx" ON "Transaction"("destinationId", "state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_state_createdAt_idx" ON "Transaction"("state", "createdAt");

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_originId_fkey" FOREIGN KEY ("originId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
