/*
  Warnings:

  - You are about to drop the column `branchId` on the `Therapist` table. All the data in the column will be lost.
  - Added the required column `branchId` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Therapist" DROP CONSTRAINT "Therapist_branchId_fkey";

-- Verificar se existe alguma filial
DO $$ 
DECLARE
  branch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO branch_count FROM "Branch";
  
  -- Se não existir nenhuma filial, criar uma filial padrão
  IF branch_count = 0 THEN
    INSERT INTO "Branch" (id, name, address, phone, "isActive", "createdAt", "updatedAt")
    VALUES ('00000000-0000-0000-0000-000000000001', 'Matriz', 'Endereço da Matriz', '11999999999', true, NOW(), NOW());
  END IF;
END $$;

-- Adicionar a coluna branchId em Schedule com valor fixo (primeira filial)
ALTER TABLE "Schedule" ADD COLUMN "branchId" TEXT;
UPDATE "Schedule" SET "branchId" = (SELECT id FROM "Branch" LIMIT 1);
ALTER TABLE "Schedule" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Therapist" DROP COLUMN "branchId";

-- CreateTable
CREATE TABLE "TherapistBranch" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TherapistBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TherapistBranch_therapistId_branchId_key" ON "TherapistBranch"("therapistId", "branchId");

-- AddForeignKey
ALTER TABLE "TherapistBranch" ADD CONSTRAINT "TherapistBranch_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapistBranch" ADD CONSTRAINT "TherapistBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Criar relações TherapistBranch para terapeutas existentes
INSERT INTO "TherapistBranch" ("id", "therapistId", "branchId", "isActive", "createdAt")
SELECT 
  gen_random_uuid(), 
  t.id, 
  (SELECT id FROM "Branch" LIMIT 1), 
  true, 
  NOW()
FROM "Therapist" t;
