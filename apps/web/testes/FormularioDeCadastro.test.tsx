import type { ClienteCriado } from '@desafio-eteg/contratos';
import { screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { FormularioDeCadastro } from '../src/componentes/FormularioDeCadastro';
import {
  CADASTRO_ACEITO,
  CORES,
  cpfJaCadastrado,
  EXCESSO_DE_ENVIOS,
  instalarApiFalsa,
  renderizar,
  type ApiFalsa,
} from './apiFalsa';

const CPF_DIGITADO = '52998224725';

describe('FormularioDeCadastro', () => {
  let api: ApiFalsa;
  let usuario: UserEvent;
  let aoConcluir: Mock<(cliente: ClienteCriado, nomeCompleto: string) => void>;

  beforeEach(() => {
    api = instalarApiFalsa();
    usuario = userEvent.setup();
    aoConcluir = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function montar() {
    return renderizar(
      <FormularioDeCadastro aoEscolherCor={() => undefined} aoConcluir={aoConcluir} />,
    );
  }

  async function preencherEEnviar(email = 'Maria@Exemplo.COM.BR') {
    await usuario.type(screen.getByLabelText('Nome completo'), 'Maria Aparecida de Souza');
    await usuario.type(screen.getByLabelText('CPF'), CPF_DIGITADO);
    await usuario.type(screen.getByLabelText('E-mail'), email);

    // O grupo de rádios só existe depois que GET /api/cores responde.
    await usuario.click(await screen.findByRole('radio', { name: 'Azul' }));
    await usuario.click(screen.getByRole('button', { name: 'Enviar cadastro' }));
  }

  it('aplica a máscara enquanto o CPF é digitado', async () => {
    montar();

    await usuario.type(screen.getByLabelText('CPF'), CPF_DIGITADO);

    expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25');
  });

  it('envia ao servidor o cadastro já normalizado', async () => {
    montar();

    await preencherEEnviar();

    await waitFor(() => {
      expect(api.cadastrosEnviados).toHaveLength(1);
    });

    // O que trafega é o `z.output` do contrato: sem máscara, em minúsculas e
    // sem as observações vazias.
    expect(api.cadastrosEnviados[0]).toEqual({
      nomeCompleto: 'Maria Aparecida de Souza',
      cpf: CPF_DIGITADO,
      email: 'maria@exemplo.com.br',
      corPreferidaId: CORES[1]?.id,
    });
  });

  it('entrega o cadastro concluído para a página', async () => {
    montar();

    await preencherEEnviar();

    await waitFor(() => {
      expect(aoConcluir).toHaveBeenCalledWith(CADASTRO_ACEITO.corpo, 'Maria Aparecida de Souza');
    });
  });

  it('marca o campo do CPF quando a API recusa o cadastro por duplicidade', async () => {
    api.responderCadastroCom(cpfJaCadastrado());
    montar();

    await preencherEEnviar();

    const campoDoCpf = await screen.findByLabelText('CPF');

    // O campo culpado sai do `campo` do problem+json, não da leitura do texto
    // da mensagem.
    await waitFor(() => {
      expect(campoDoCpf).toHaveAttribute('aria-invalid', 'true');
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Este CPF já está cadastrado.');
    expect(aoConcluir).not.toHaveBeenCalled();
  });

  it('não envia nada quando o formulário está vazio', async () => {
    montar();

    await usuario.click(screen.getByRole('button', { name: 'Enviar cadastro' }));

    expect(await screen.findByText('Informe o nome completo.')).toBeInTheDocument();
    expect(api.cadastrosEnviados).toHaveLength(0);
  });

  it('liga cada campo inválido à sua mensagem para o leitor de tela', async () => {
    montar();

    await usuario.click(screen.getByRole('button', { name: 'Enviar cadastro' }));

    const campo = await screen.findByLabelText('Nome completo');

    expect(campo).toHaveAttribute('aria-invalid', 'true');
    // A mensagem precisa estar no `aria-describedby`, e não só na tela: é
    // assim que o leitor de tela a lê ao chegar no campo.
    expect(campo).toHaveAccessibleDescription(/Informe o nome completo\./);
  });

  describe('enquanto o envio está em andamento', () => {
    it('mantém o foco no botão e anuncia a espera', async () => {
      const liberar = api.segurarCadastro();
      montar();

      await preencherEEnviar();

      const botao = screen.getByRole('button', { name: 'Enviando…' });

      // Desabilitar um elemento em foco devolve o foco ao body e some com o
      // lugar de quem navega por teclado. Daí o `aria-disabled`.
      await waitFor(() => {
        expect(botao).toHaveAttribute('aria-disabled', 'true');
      });

      expect(botao).toHaveFocus();
      expect(screen.getByRole('status')).toHaveTextContent('Enviando o cadastro…');

      liberar();
      await waitFor(() => {
        expect(aoConcluir).toHaveBeenCalled();
      });
    });

    it('ignora um segundo clique no botão', async () => {
      const liberar = api.segurarCadastro();
      montar();

      await preencherEEnviar();
      await usuario.click(screen.getByRole('button', { name: 'Enviando…' }));

      expect(api.cadastrosEnviados).toHaveLength(1);

      liberar();
      await waitFor(() => {
        expect(aoConcluir).toHaveBeenCalled();
      });
    });
  });

  describe('falha que não pertence a nenhum campo', () => {
    it('avisa e leva o foco até o aviso quando a conexão cai', async () => {
      api.derrubarConexao(true);
      montar();

      await preencherEEnviar();

      const aviso = await screen.findByRole('group', {
        name: 'Não foi possível concluir o cadastro',
      });

      expect(aviso).toHaveTextContent('Verifique a conexão e tente de novo.');
      // Não há campo culpado para destacar, então o foco vai para a
      // explicação — senão ela apareceria acima, fora da vista.
      expect(aviso).toHaveFocus();
      expect(aoConcluir).not.toHaveBeenCalled();
    });

    it('explica o excesso de envios sem repetir a mensagem do servidor', async () => {
      api.responderCadastroCom(EXCESSO_DE_ENVIOS);
      montar();

      await preencherEEnviar();

      expect(
        await screen.findByText('Foram muitos envios seguidos. Espere um minuto e tente de novo.'),
      ).toBeInTheDocument();
    });

    it('some com o aviso assim que a pessoa mexe no formulário', async () => {
      api.derrubarConexao(true);
      montar();

      await preencherEEnviar();
      await screen.findByRole('group', { name: 'Não foi possível concluir o cadastro' });

      await usuario.type(screen.getByLabelText('E-mail'), '.br');

      // Um aviso que sobrevive à correção sugere que o que está na tela
      // continua inválido.
      await waitFor(() => {
        expect(
          screen.queryByRole('group', { name: 'Não foi possível concluir o cadastro' }),
        ).not.toBeInTheDocument();
      });
    });
  });

  it('oferece nova tentativa quando as cores não carregam', async () => {
    api.quebrarCores(true);
    montar();

    const tentarNovamente = await screen.findByRole('button', { name: 'Tentar novamente' });

    api.quebrarCores(false);
    await usuario.click(tentarNovamente);

    const primeiraCor = await screen.findByRole('radio', { name: 'Vermelho' });

    // O botão que tinha o foco desapareceu junto com o erro. Sem levar o foco
    // para a primeira cor, ele cairia no body.
    await waitFor(() => {
      expect(primeiraCor).toHaveFocus();
    });
  });
});
