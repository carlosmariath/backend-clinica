/*
  Warnings:

  - You are about to drop the column `branchId` on the `TherapyPlan` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "TherapyPlan" DROP CONSTRAINT "TherapyPlan_branchId_fkey";

-- AlterTable
ALTER TABLE "TherapyPlan" DROP COLUMN "branchId";

-- CreateTable
CREATE TABLE "TherapyPlanBranch" (
    "id" TEXT NOT NULL,
    "therapyPlanId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TherapyPlanBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TherapyPlanBranch_therapyPlanId_branchId_key" ON "TherapyPlanBranch"("therapyPlanId", "branchId");

-- AddForeignKey
ALTER TABLE "TherapyPlanBranch" ADD CONSTRAINT "TherapyPlanBranch_therapyPlanId_fkey" FOREIGN KEY ("therapyPlanId") REFERENCES "TherapyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyPlanBranch" ADD CONSTRAINT "TherapyPlanBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
