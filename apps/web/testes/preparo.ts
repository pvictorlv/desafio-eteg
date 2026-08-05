import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// O jsdom não implementa `scrollIntoView`, e o `AvisoDeErro` chama isso ao
// aparecer. Sem este remendo, qualquer teste que renderize o aviso quebra com
// um TypeError vindo de dentro do efeito — que é uma limitação do ambiente, não
// um defeito do componente. Atribui direto em vez de checar antes: aqui só roda
// jsdom, e ler o método para compará-lo é o que o `unbound-method` proíbe.
Element.prototype.scrollIntoView = () => undefined;

// A limpeza automática da Testing Library depende dos globals do Vitest, que
// estão desligados aqui. Sem esta linha, cada teste renderiza por cima da
// árvore do anterior e as buscas passam a achar dois de tudo.
afterEach(cleanup);
