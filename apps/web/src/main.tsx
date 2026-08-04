import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ProvedorDeDados } from './api/ProvedorDeDados';
import { LimiteDeErro } from './componentes/LimiteDeErro';
import './estilos/fontes.css';
import './estilos/base.css';
import { instalarCapturaGlobal } from './infra/monitoramento';

const raiz = document.getElementById('raiz');

if (!raiz) {
  throw new Error('Elemento #raiz não encontrado no index.html.');
}

instalarCapturaGlobal();

createRoot(raiz).render(
  <StrictMode>
    {/* Barreira externa: pega até o que quebrar no provedor. A interna, em
        volta do painel, preserva o cabeçalho quando só o formulário falha. */}
    <LimiteDeErro>
      <ProvedorDeDados>
        <App />
      </ProvedorDeDados>
    </LimiteDeErro>
  </StrictMode>,
);
