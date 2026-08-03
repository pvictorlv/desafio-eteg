import type { CadastroCliente, ClienteCriado } from '@desafio-eteg/contratos';
import { Prisma } from '../generated/prisma/client.js';
import type { Banco } from '../infra/banco.js';
import { ClienteJaCadastradoError, type CampoUnico } from '../servicos/erros.js';

const VIOLACAO_DE_UNICIDADE = 'P2002';

export interface RepositorioDeClientes {
  cadastrar(dados: CadastroCliente): Promise<ClienteCriado>;
}

export function criarRepositorioDeClientes(banco: Banco): RepositorioDeClientes {
  return {
    async cadastrar(dados) {
      try {
        const cliente = await banco.cliente.create({
          data: {
            nomeCompleto: dados.nomeCompleto,
            cpf: dados.cpf,
            email: dados.email,
            observacoes: dados.observacoes ?? null,
            corId: dados.corPreferidaId,
          },
          select: { id: true, criadoEm: true },
        });

        return { id: cliente.id, criadoEm: cliente.criadoEm.toISOString() };
      } catch (erro) {
        const campo = identificarCampoDuplicado(erro);

        if (campo) {
          throw new ClienteJaCadastradoError(campo);
        }

        throw erro;
      }
    },
  };
}

/**
 * Descobre a duplicidade pelo erro do banco em vez de consultar antes de
 * inserir.
 *
 * Um SELECT prévio deixa uma janela entre a checagem e o INSERT: dois envios
 * simultâneos do mesmo CPF passariam os dois pela verificação. O índice único
 * não tem essa janela — só é preciso traduzir a violação.
 */
function identificarCampoDuplicado(erro: unknown): CampoUnico | null {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (erro.code !== VIOLACAO_DE_UNICIDADE) {
    return null;
  }

  // `meta.target` varia conforme o driver: às vezes traz os campos
  // (['cpf']), às vezes o nome do índice ('clientes_cpf_key'). Procurar o
  // nome do campo dentro dele cobre as duas formas.
  const alvo = JSON.stringify(erro.meta?.['target'] ?? '');

  if (alvo.includes('cpf')) {
    return 'cpf';
  }

  if (alvo.includes('email')) {
    return 'email';
  }

  return null;
}
