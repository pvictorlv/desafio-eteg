import type { CadastroCliente, ClienteCriado } from '@desafio-eteg/contratos';
import type { RepositorioDeClientes } from '../repositorios/clientes.js';
import { CorNaoEncontradaError } from './erros.js';
import type { ServicoDeCores } from './cores.js';

export interface ServicoDeClientes {
  cadastrar(dados: CadastroCliente): Promise<ClienteCriado>;
}

export function criarServicoDeClientes(
  repositorio: RepositorioDeClientes,
  servicoDeCores: ServicoDeCores,
): ServicoDeClientes {
  return {
    async cadastrar(dados) {
      // A chave estrangeira já barraria uma cor inexistente, mas não uma cor
      // desativada — e a mensagem de erro do banco não serve para o usuário.
      if (!(await servicoDeCores.existe(dados.corPreferidaId))) {
        throw new CorNaoEncontradaError();
      }

      // A unicidade de CPF e e-mail é garantida pelo índice único e traduzida
      // no repositório. Ver o comentário em identificarCampoDuplicado.
      return repositorio.cadastrar(dados);
    },
  };
}
