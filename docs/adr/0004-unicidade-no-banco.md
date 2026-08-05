# 0004 — Unicidade garantida pelo índice

**Status:** aceita · 03/08/2026

## Contexto

O enunciado é explícito: "um cliente consiga preencher o formulário uma única
vez". Traduzindo, CPF e e-mail não podem se repetir.

O caminho intuitivo é consultar antes de inserir: procura o CPF, não achou,
grava. Ele funciona na demonstração e falha em produção. Entre o `SELECT` e o
`INSERT` existe uma janela; dois envios simultâneos do mesmo CPF — um duplo
clique, uma repetição de rede — passam os dois pela verificação e gravam os
dois. O bug é raro, não reproduzível sob demanda e caríssimo de investigar.

## Decisão

Índice único em `clientes.cpf` e em `clientes.email`. O cadastro **tenta
inserir** e trata a violação: o repositório reconhece o `P2002` do Prisma,
descobre qual coluna estourou e lança `ClienteJaCadastradoError`, que o
tratador central traduz em `409` com o campo culpado no problem+json.

Nenhuma consulta prévia. O banco é a autoridade, e ele não tem janela.

## Consequências

**A favor.** A garantia é do armazenamento, não do código: vale também para
quem escrever direto no banco, para um script de importação e para qualquer
segunda instância da API. Uma ida ao banco a menos por cadastro. O `409` é
sempre verdadeiro, porque nasce de uma tentativa real.

**Contra.** O código depende do formato do erro do Prisma. Onde fica o nome da
coluna mudou entre a engine binária e o driver adapter, e por isso
`identificarCampoDuplicado` procura no `meta` inteiro em vez de num campo
específico — sobrevive a mais uma mudança dessas, mas não a qualquer uma. Os
testes de integração rodam contra um Postgres de verdade justamente para o dia
em que isso mudar de novo (ver [0006](0006-imagem-unica.md) para a imagem, e
`apps/api/testes` para os testes).

**O 409 conta que aquele CPF já está na base.** Quem quiser descobrir se uma
pessoa se cadastrou aqui é só tentar cadastrá-la e ler a resposta — o
formulário é público e não pede senha. É o mesmo problema da tela de login que
responde "usuário não existe" em vez de "usuário ou senha inválidos".

Foi aceito porque o enunciado pede isso: quem preenche precisa saber por que o
cadastro não passou, e um "algo deu errado" deixaria a pessoa sem saída numa
tela só. O que segura o abuso é o limite de cinco envios por minuto e por IP.
Se um dia esse dado ficar sensível demais, o caminho é pedir uma confirmação de
que não é robô antes do envio — e não trocar por uma mensagem vaga, que
atrapalha quem está de boa-fé sem impedir quem tem tempo sobrando.

Quando os dois campos se repetem ao mesmo tempo, o Postgres relata só o
primeiro índice violado. A tela destaca um campo, a pessoa corrige, e o
segundo aparece no envio seguinte. É aceitável: o caso real é a pessoa
tentando se cadastrar de novo com os mesmos dados, e a primeira mensagem já
explica o que houve.
