import {
  esquemaCadastroCliente,
  TAMANHO_MAXIMO_OBSERVACOES,
  type CadastroCliente,
  type ClienteCriado,
  type EntradaCadastroCliente,
} from '@desafio-eteg/contratos';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useCadastrarCliente } from '../api/clientes';
import { useCores } from '../api/cores';
import { interpretarFalha } from '../api/problemas';
import '../estilos/formulario.css';
import { aplicarMascaraPreservandoCursor } from '../infra/mascaraDeCpf';
import { AvisoDeErro } from './AvisoDeErro';
import { Campo } from './Campo';
import { SeletorDeCor } from './SeletorDeCor';

const VALORES_INICIAIS: EntradaCadastroCliente = {
  nomeCompleto: '',
  cpf: '',
  email: '',
  corPreferidaId: '',
  observacoes: '',
};

interface PropsDoFormulario {
  /** Avisa a página qual cor está marcada, para o espectro reagir. */
  aoEscolherCor: (id: string) => void;
  /** Entrega o cadastro gravado para a página trocar o formulário pela confirmação. */
  aoConcluir: (cliente: ClienteCriado, nomeCompleto: string) => void;
}

export function FormularioDeCadastro({ aoEscolherCor, aoConcluir }: PropsDoFormulario) {
  // Mesma chave da consulta feita na página: o TanStack Query devolve o cache
  // em vez de disparar uma segunda requisição.
  const cores = useCores();
  const cadastro = useCadastrarCliente();

  const [avisoGeral, setAvisoGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<EntradaCadastroCliente, unknown, CadastroCliente>({
    resolver: zodResolver(esquemaCadastroCliente),
    defaultValues: VALORES_INICIAIS,
    // Valida ao sair do campo, não a cada tecla: acusar "CPF inválido" no
    // terceiro dígito é hostil com quem ainda está digitando.
    mode: 'onTouched',
  });

  const observacoes = useWatch({ control, name: 'observacoes' }) ?? '';

  const registroDoCpf = register('cpf');

  /**
   * Distribui a falha do envio: o que a API atribuiu a um campo vira erro
   * daquele campo, o resto vira aviso no topo. O foco vai para o primeiro
   * campo culpado — quem envia um formulário longo não deveria ter que
   * procurar o que deu errado.
   */
  function mostrarFalha(erro: unknown) {
    const falha = interpretarFalha(erro);

    for (const { campo, mensagem } of falha.porCampo) {
      setError(campo, { type: 'server', message: mensagem });
    }

    setAvisoGeral(falha.avisoGeral);

    const primeiro = falha.porCampo[0];

    if (primeiro) {
      setFocus(primeiro.campo);
    }
  }

  return (
    <form
      className="formulario"
      noValidate
      aria-busy={cadastro.isPending}
      // Um aviso de "servidor fora do ar" que sobrevive à correção sugere que
      // o que está na tela agora continua inválido. Some ao primeiro toque.
      onInput={() => {
        if (avisoGeral !== null) {
          setAvisoGeral(null);
        }
      }}
      onSubmit={(evento) => {
        // O botão continua habilitado durante o envio (ver o `aria-disabled`
        // lá embaixo), então é aqui que o segundo clique morre.
        if (cadastro.isPending) {
          evento.preventDefault();
          return;
        }

        // `void` porque o onSubmit do DOM não espera promessa; a falha do
        // envio é tratada no `onError` da mutação, não aqui.
        void handleSubmit((dados) => {
          setAvisoGeral(null);
          cadastro.mutate(dados, {
            onError: mostrarFalha,
            onSuccess: (cliente) => {
              aoConcluir(cliente, dados.nomeCompleto);
            },
          });
        })(evento);
      }}
    >
      {avisoGeral === null ? null : <AvisoDeErro mensagem={avisoGeral} />}

      <Campo id="nomeCompleto" rotulo="Nome completo" erro={errors.nomeCompleto?.message}>
        {(ligacao) => (
          <input
            className="campo__entrada"
            type="text"
            autoComplete="name"
            placeholder="Maria Aparecida de Souza"
            {...register('nomeCompleto')}
            {...ligacao}
          />
        )}
      </Campo>

      <Campo
        id="cpf"
        rotulo="CPF"
        erro={errors.cpf?.message}
        dica="Digite só os números — a pontuação entra sozinha."
      >
        {(ligacao) => (
          <input
            className="campo__entrada campo__entrada--mono"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            maxLength={14}
            {...registroDoCpf}
            {...ligacao}
            onChange={(evento) => {
              // A máscara é aplicada no próprio valor do campo antes de o
              // formulário lê-lo. O esquema tira a pontuação depois, então o
              // que trafega continua sendo só dígito.
              aplicarMascaraPreservandoCursor(evento.target);
              void registroDoCpf.onChange(evento);
            }}
          />
        )}
      </Campo>

      <Campo id="email" rotulo="E-mail" erro={errors.email?.message}>
        {(ligacao) => (
          <input
            className="campo__entrada"
            type="email"
            autoComplete="email"
            placeholder="maria@exemplo.com.br"
            {...register('email')}
            {...ligacao}
          />
        )}
      </Campo>

      <SeletorDeCor
        cores={cores.data ?? []}
        carregando={cores.isPending}
        falhou={cores.isError}
        aoTentarNovamente={() => void cores.refetch()}
        aoMarcar={aoEscolherCor}
        erro={errors.corPreferidaId?.message}
        registro={register('corPreferidaId')}
      />

      <Campo
        id="observacoes"
        rotulo="Observações"
        erro={errors.observacoes?.message}
        dica={`Opcional. Até ${TAMANHO_MAXIMO_OBSERVACOES} caracteres.`}
        medidor={
          // O contador é redundante para quem usa leitor de tela: o limite já
          // está na dica, que entra no `aria-describedby` do campo.
          <span className="campo__contador" aria-hidden="true">
            {observacoes.length}/{TAMANHO_MAXIMO_OBSERVACOES}
          </span>
        }
      >
        {(ligacao) => (
          <textarea
            className="campo__entrada campo__entrada--longo"
            placeholder="Algo que a gente precise saber? Este campo é opcional."
            maxLength={TAMANHO_MAXIMO_OBSERVACOES}
            {...register('observacoes')}
            {...ligacao}
          />
        )}
      </Campo>

      <div className="formulario__acoes">
        {/* `aria-disabled` e não `disabled`: desabilitar um elemento que está
            com o foco faz o navegador devolver o foco ao body. Quem enviou
            pelo teclado perderia o lugar exatamente durante a espera, que é
            quando mais precisa saber onde está. O envio duplo é barrado no
            `onSubmit`. */}
        <button type="submit" className="botao" aria-disabled={cadastro.isPending}>
          {cadastro.isPending ? 'Enviando…' : 'Enviar cadastro'}
        </button>

        {/* O rótulo do botão muda para "Enviando…", mas trocar o nome
            acessível do elemento em foco não é anunciado de forma confiável.
            Esta região diz em voz alta o que a mudança de rótulo diz na tela. */}
        <p className="apenas-leitor-de-tela" role="status">
          {cadastro.isPending ? 'Enviando o cadastro…' : ''}
        </p>

        <p className="formulario__aviso-legal">
          Cada CPF e cada e-mail podem ser cadastrados uma única vez.
        </p>
      </div>
    </form>
  );
}
