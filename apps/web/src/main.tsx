import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ProvedorDeDados } from './api/ProvedorDeDados';
import './estilos/fontes.css';
import './estilos/base.css';

const raiz = document.getElementById('raiz');

if (!raiz) {
  throw new Error('Elemento #raiz não encontrado no index.html.');
}

createRoot(raiz).render(
  <StrictMode>
    <ProvedorDeDados>
      <App />
    </ProvedorDeDados>
  </StrictMode>,
);
