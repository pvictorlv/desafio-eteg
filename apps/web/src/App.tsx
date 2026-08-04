import type { ClienteCriado } from '@desafio-eteg/contratos';
import { useState } from 'react';
import { useCores } from './api/cores';
import { Abertura } from './componentes/Abertura';
import { Confirmacao } from './componentes/Confirmacao';
import { Espectro } from './componentes/Espectro';
import { FormularioDeCadastro } from './componentes/FormularioDeCadastro';
import { LimiteDeErro } from './componentes/LimiteDeErro';
import { atraso } from './estilos/movimento';
import './estilos/layout.css';

interface CadastroConcluido {
  cliente: ClienteCriado;
  nomeCompleto: string;
}

export function App() {
  const cores = useCores();
  const [idDaCorEscolhida, setIdDaCorEscolhida] = useState<string | null>(null);
  const [concluido, setConcluido] = useState<CadastroConcluido | null>(null);

  const corEscolhida = cores.data?.find((cor) => cor.id === idDaCorEscolhida) ?? null;

  return (
    <div className="pagina">
      <Espectro
        cores={cores.data ?? []}
        idEmDestaque={idDaCorEscolhida}
        carregando={cores.isPending}
      />

      <div className="pagina__corpo">
        <Abertura corEscolhida={corEscolhida} />

        <main className="painel surgir" style={atraso(240)}>
          <LimiteDeErro compacto>
            {concluido ? (
              <Confirmacao
                cliente={concluido.cliente}
                nomeCompleto={concluido.nomeCompleto}
                cor={corEscolhida}
              />
            ) : (
              <FormularioDeCadastro
                aoEscolherCor={setIdDaCorEscolhida}
                aoConcluir={(cliente, nomeCompleto) => {
                  setConcluido({ cliente, nomeCompleto });
                }}
              />
            )}
          </LimiteDeErro>
        </main>
      </div>

      <Rodape />
    </div>
  );
}

function Rodape() {
  return (
    <footer className="rodape">
      <span>Cadastro de clientes · desafio ETEG</span>
      <a href="/docs" target="_blank" rel="noreferrer">
        Documentação da API
      </a>
    </footer>
  );
}
