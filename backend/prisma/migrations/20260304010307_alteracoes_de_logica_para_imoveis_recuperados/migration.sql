/*
  Warnings:

  - You are about to drop the column `nomeAgente` on the `Turno` table. All the data in the column will be lost.
  - You are about to drop the `Registro` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoVisita" AS ENUM ('NORMAL', 'R_F', 'C_F', 'RECUPERACAO');

-- DropForeignKey
ALTER TABLE "Registro" DROP CONSTRAINT "Registro_turnoId_fkey";

-- DropIndex
DROP INDEX "Agente_password_key";

-- AlterTable
ALTER TABLE "Turno" DROP COLUMN "nomeAgente";

-- DropTable
DROP TABLE "Registro";

-- CreateTable
CREATE TABLE "Imovel" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "municipio" TEXT,
    "localidade" TEXT,
    "quarteirao" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Imovel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visita" (
    "id" SERIAL NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "agenteId" INTEGER NOT NULL,
    "imovelId" INTEGER NOT NULL,
    "tipoVisita" "TipoVisita" NOT NULL,
    "horarioEntrada" TIMESTAMP(3),
    "informacao" TEXT,
    "a1" INTEGER,
    "a2" INTEGER,
    "b" INTEGER,
    "c" INTEGER,
    "d1" INTEGER,
    "d2" INTEGER,
    "e" INTEGER,
    "inspL1" BOOLEAN,
    "imTrat" BOOLEAN,
    "amostraInicial" INTEGER,
    "amostraFinal" INTEGER,
    "qtdDepTrat" INTEGER,
    "depositosEliminados" INTEGER,
    "qtdTubitos" INTEGER,
    "quedaGramas" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Imovel_codigo_key" ON "Imovel"("codigo");

-- AddForeignKey
ALTER TABLE "Visita" ADD CONSTRAINT "Visita_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visita" ADD CONSTRAINT "Visita_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visita" ADD CONSTRAINT "Visita_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
