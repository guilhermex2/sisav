-- CreateTable
CREATE TABLE "Agente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "municipio" TEXT NOT NULL,
    "ciclo" TEXT NOT NULL,
    "localidade" TEXT NOT NULL,
    "categoriaLocalidade" TEXT,
    "zona" TEXT,
    "atividade" TEXT,
    "agenteId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registro" (
    "id" SERIAL NOT NULL,
    "turnoId" INTEGER NOT NULL,
    "quarteirao" TEXT,
    "sequencia" TEXT,
    "sequencia2" TEXT,
    "lado" TEXT,
    "tipoImovel" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
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

    CONSTRAINT "Registro_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registro" ADD CONSTRAINT "Registro_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
