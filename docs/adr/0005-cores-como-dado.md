# 0005 — Cores no banco, não em enum

**Status:** aceita · 03/08/2026

## Contexto

O enunciado pede a cor preferida "entre as cores disponíveis em um arco-íris"
e acrescenta, entre parênteses, que **isso pode mudar posteriormente**. É a
única frase do texto que fala do futuro, e ela existe para ser levada a sério.

Um enum em TypeScript, ou um `CHECK` no banco, resolve hoje. Amanhã, quando
aparecer a oitava cor, o pedido vira: alterar o enum, alterar o esquema do
banco, escrever a migração, revisar, buildar, testar e publicar as duas
pontas — para cadastrar uma linha.

## Decisão

Tabela `cores`, com `slug`, `nome`, `hex`, `ordem` e `ativa`, e a rota
`GET /api/cores` alimentando o formulário. A tela nunca conhece o nome de uma
cor: renderiza o que a API devolveu.

Retirar uma cor de circulação é `ativa = false`, e não `DELETE`. A relação com
`clientes` é `onDelete: Restrict` — quem já escolheu roxo continua tendo
escolhido roxo, e o histórico não pode ser reescrito por uma mudança de
catálogo.

O serviço guarda a lista em memória por cinco minutos, porque é dado pequeno,
lido em todo carregamento da tela e que quase nunca muda.

## Consequências

**A favor.** Mudar o catálogo é um `INSERT` ou um `UPDATE`, sem deploy e sem
migração. A validação do cadastro consulta a mesma lista, então uma cor
desativada é recusada com `422` e mensagem própria — coisa que a chave
estrangeira sozinha não faria, porque a linha continua na tabela.

**Contra.** O formulário depende de uma requisição para poder ser preenchido,
e por isso a tela tem estado de carregamento, de falha e um "Tentar
novamente". Uma cor recém-criada leva até cinco minutos para aparecer, e com
várias instâncias cada uma tem seu próprio cache. Para esse volume de
mudança, cinco minutos de defasagem custam menos que um cache distribuído.
