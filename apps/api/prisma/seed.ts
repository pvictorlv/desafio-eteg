import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * As sete cores do arco-íris, na ordem do espectro. É só o ponto de partida:
 * a lista mora no banco justamente para poder mudar sem deploy.
 */
const CORES_DO_ARCO_IRIS = [
  { slug: 'vermelho', nome: 'Vermelho', hex: '#FF0000', ordem: 1 },
  { slug: 'laranja', nome: 'Laranja', hex: '#FF7F00', ordem: 2 },
  { slug: 'amarelo', nome: 'Amarelo', hex: '#FFD700', ordem: 3 },
  { slug: 'verde', nome: 'Verde', hex: '#00A650', ordem: 4 },
  { slug: 'azul', nome: 'Azul', hex: '#0057B8', ordem: 5 },
  { slug: 'anil', nome: 'Anil', hex: '#3F00FF', ordem: 6 },
  { slug: 'violeta', nome: 'Violeta', hex: '#8B00FF', ordem: 7 },
] as const;

async function popular(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error('DATABASE_URL não definida. Copie apps/api/.env.example para .env.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    for (const cor of CORES_DO_ARCO_IRIS) {
      // upsert por slug: o seed roda a cada deploy e não pode duplicar nem
      // reverter uma cor que alguém tenha desativado de propósito.
      await prisma.cor.upsert({
        where: { slug: cor.slug },
        update: { nome: cor.nome, hex: cor.hex, ordem: cor.ordem },
        create: { ...cor },
      });
    }

    const total = await prisma.cor.count();
    console.log(`Seed concluído: ${total} cores disponíveis.`);
  } finally {
    await prisma.$disconnect();
  }
}

await popular();
