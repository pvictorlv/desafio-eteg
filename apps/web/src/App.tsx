import { useCores } from './api/cores';
import { Abertura } from './componentes/Abertura';
import { Espectro } from './componentes/Espectro';
import './estilos/layout.css';

export function App() {
  const cores = useCores();

  return (
    <div className="pagina">
      <Espectro cores={cores.data ?? []} idEmDestaque={null} carregando={cores.isPending} />

      <div className="pagina__corpo">
        <Abertura corEscolhida={null} />
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
