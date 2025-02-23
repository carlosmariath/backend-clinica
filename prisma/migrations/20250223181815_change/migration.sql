/*
  Warnings:

  - A unique constraint covering the columns `[phoneNumber]` on the table `ChatSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ChatSession_phoneNumber_key" ON "ChatSession"("phoneNumber");
