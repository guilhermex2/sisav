/*Cria uma instância do PrismaClient e a exporta para ser usada em outros lugares.
A verificação de globalThis é para evitar que o PrismaClient seja instanciado várias vezes.*/
import { PrismaClient } from '../generated/prisma'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma