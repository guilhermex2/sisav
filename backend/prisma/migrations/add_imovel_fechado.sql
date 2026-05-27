-- CreateEnum
CREATE TYPE "StatusFechado" AS ENUM ('FECHADO', 'PENDENTE', 'RECUPERADO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "ResultadoTentativa" AS ENUM ('SEM_RESPOSTA', 'RECUSA', 'RECUPERADO');

-- DropForeignKey
ALTER TABLE "Turno" DROP CONSTRAINT "Turno_agenteId_fkey";

-- DropForeignKey
ALTER TABLE "Visita" DROP CONSTRAINT "Visita_agenteId_fkey";

-- DropForeignKey
ALTER TABLE "Visita" DROP CONSTRAINT "Visita_imovelId_fkey";

-- DropForeignKey
ALTER TABLE "Visita" DROP CONSTRAINT "Visita_turnoId_fkey";

-- AlterTable
ALTER TABLE "Agente" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Imovel" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Turno" ALTER COLUMN "data" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "finalizadoEm" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Visita" ALTER COLUMN "horarioEntrada" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "criadoEm" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ImovelFechado" (
    "id" SERIAL NOT NULL,
    "imovelId" INTEGER NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "agenteId" INTEGER NOT NULL,
    "tipoImovel" TEXT NOT NULL,
    "status" "StatusFechado" NOT NULL DEFAULT 'FECHADO',
    "motivoFechamento" TEXT,
    "dataFechamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataRecuperacao" TIMESTAMP(3),
    "visitaOrigemId" INTEGER,
    "visitaRecuperacaoId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImovelFechado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TentativaRecuperacao" (
    "id" SERIAL NOT NULL,
    "imovelFechadoId" INTEGER NOT NULL,
    "agenteId" INTEGER NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "resultado" "ResultadoTentativa" NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativaRecuperacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImovelFechado_visitaOrigemId_key" ON "ImovelFechado"("visitaOrigemId");

-- CreateIndex
CREATE UNIQUE INDEX "ImovelFechado_visitaRecuperacaoId_key" ON "ImovelFechado"("visitaRecuperacaoId");

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visita" ADD CONSTRAINT "Visita_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visita" ADD CONSTRAINT "Visita_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visita" ADD CONSTRAINT "Visita_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImovelFechado" ADD CONSTRAINT "ImovelFechado_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImovelFechado" ADD CONSTRAINT "ImovelFechado_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImovelFechado" ADD CONSTRAINT "ImovelFechado_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImovelFechado" ADD CONSTRAINT "ImovelFechado_visitaOrigemId_fkey" FOREIGN KEY ("visitaOrigemId") REFERENCES "Visita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImovelFechado" ADD CONSTRAINT "ImovelFechado_visitaRecuperacaoId_fkey" FOREIGN KEY ("visitaRecuperacaoId") REFERENCES "Visita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TentativaRecuperacao" ADD CONSTRAINT "TentativaRecuperacao_imovelFechadoId_fkey" FOREIGN KEY ("imovelFechadoId") REFERENCES "ImovelFechado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TentativaRecuperacao" ADD CONSTRAINT "TentativaRecuperacao_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TentativaRecuperacao" ADD CONSTRAINT "TentativaRecuperacao_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

