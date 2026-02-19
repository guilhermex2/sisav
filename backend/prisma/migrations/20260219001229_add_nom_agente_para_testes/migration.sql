/*
  Warnings:

  - Added the required column `nomeAgente` to the `Turno` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "nomeAgente" TEXT NOT NULL;
