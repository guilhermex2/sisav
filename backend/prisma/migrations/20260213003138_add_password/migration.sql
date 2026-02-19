/*
  Warnings:

  - A unique constraint covering the columns `[password]` on the table `Agente` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `Agente` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Agente" ADD COLUMN     "password" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Agente_password_key" ON "Agente"("password");
