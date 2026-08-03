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

/** Ordem importa: o CPF é checado primeiro por ser a chave mais forte. */
const CAMPOS_UNICOS: readonly CampoUnico[] = ['cpf', 'email'];

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

  // Onde fica o nome do campo depende de como o Prisma acessa o banco:
  //
  //   engine binária    -> meta.target = ['cpf']
  //   driver adapter    -> meta.driverAdapterError.cause.originalMessage,
  //                        contendo o nome do índice ('clientes_cpf_key')
  //
  // Procurar em todo o meta cobre as duas formas e sobrevive a mais uma
  // mudança dessas. `modelName` é o único outro campo presente e não colide
  // com nenhum nome de coluna nossa.
  const detalhes = JSON.stringify(erro.meta ?? {});

  return CAMPOS_UNICOS.find((campo) => detalhes.includes(campo)) ?? null;
}
