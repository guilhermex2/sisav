/*
  Warnings:

  - A unique constraint covering the columns `[nome]` on the table `Agente` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Agente_nome_key" ON "Agente"("nome");
