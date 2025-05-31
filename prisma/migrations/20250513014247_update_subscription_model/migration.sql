/*
  Warnings:

  - You are about to drop the column `acceptedAt` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `cancellationReason` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `planId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `sessionsLeft` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `tokenExpiresAt` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `validUntil` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the `SessionConsumption` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SessionConsumption" DROP CONSTRAINT "SessionConsumption_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "SessionConsumption" DROP CONSTRAINT "SessionConsumption_branchId_fkey";

-- DropForeignKey
ALTER TABLE "SessionConsumption" DROP CONSTRAINT "SessionConsumption_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropIndex
DROP INDEX "Subscription_token_key";

-- Adicionar coluna therapyPlanId e copiar dados de planId
ALTER TABLE "Subscription" ADD COLUMN "therapyPlanId" TEXT;
UPDATE "Subscription" SET "therapyPlanId" = "planId";
ALTER TABLE "Subscription" ALTER COLUMN "therapyPlanId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" 
DROP COLUMN "acceptedAt",
DROP COLUMN "cancellationReason",
DROP COLUMN "token",
DROP COLUMN "tokenExpiresAt",
DROP COLUMN "validUntil",
ADD COLUMN "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "endDate" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + interval '30 day'),
ADD COLUMN "totalSessions" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "remainingSessions" INTEGER NOT NULL DEFAULT 10,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- Remover colunas antigas
ALTER TABLE "Subscription" DROP COLUMN "planId";
ALTER TABLE "Subscription" DROP COLUMN "sessionsLeft";

-- DropTable
DROP TABLE "SessionConsumption";

-- CreateTable
CREATE TABLE "SubscriptionConsumption" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TherapyPlanToBranch" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TherapyPlanToBranch_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionConsumption_appointmentId_key" ON "SubscriptionConsumption"("appointmentId");

-- CreateIndex
CREATE INDEX "_TherapyPlanToBranch_B_index" ON "_TherapyPlanToBranch"("B");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_therapyPlanId_fkey" FOREIGN KEY ("therapyPlanId") REFERENCES "TherapyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionConsumption" ADD CONSTRAINT "SubscriptionConsumption_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionConsumption" ADD CONSTRAINT "SubscriptionConsumption_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionConsumption" ADD CONSTRAINT "SubscriptionConsumption_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TherapyPlanToBranch" ADD CONSTRAINT "_TherapyPlanToBranch_A_fkey" FOREIGN KEY ("A") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TherapyPlanToBranch" ADD CONSTRAINT "_TherapyPlanToBranch_B_fkey" FOREIGN KEY ("B") REFERENCES "TherapyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
