# Erros da API

Toda resposta de erro sai em `application/problem+json`
([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)), com dois campos além dos
padrões:

| Campo    | Para quê                                                          |
| -------- | ----------------------------------------------------------------- |
| `codigo` | Identificador estável. É por ele que o cliente decide o que fazer |
| `campo`  | Qual campo do formulário destacar, quando há um só culpado        |
| `erros`  | Uma entrada por campo inválido, quando são vários                 |

O `type` de cada resposta aponta para a seção correspondente desta página.

**Decida pelo `codigo`, nunca pelo texto.** `title` e `detail` são escritos
para gente e vão mudar quando alguém melhorar a redação. O `codigo` é
contrato: alterá-lo é breaking change.

**Nem todo `detail` pode ir para a tela.** `DADOS_INVALIDOS` é usado também
como pega-tudo para os 4xx do próprio Fastify, e nesses casos o `detail` traz
a mensagem do framework — recado de desenvolvedor, que ainda vaza rota e
método. O formulário só exibe o `detail` dos códigos de negócio.

---

<a id="dados-invalidos"></a>

## Dados inválidos

`422` · `DADOS_INVALIDOS`

A entrada não passou no esquema. A resposta traz `erros` com um item por
campo, para o formulário destacar todos de uma vez.

```json
{
  "type": ".../docs/erros.md#dados-invalidos",
  "title": "Dados inválidos",
  "status": 422,
  "detail": "Revise os campos destacados e envie novamente.",
  "codigo": "DADOS_INVALIDOS",
  "erros": [
    { "campo": "nomeCompleto", "mensagem": "Informe nome e sobrenome." },
    { "campo": "cpf", "mensagem": "CPF inválido." }
  ]
}
```

O CPF é recusado quando os dígitos verificadores não batem, quando os onze
dígitos são iguais ou quando o tamanho está errado. Não conferimos se ele
existe na Receita Federal: para isso seria preciso um serviço externo, e
descartar o que é comprovadamente inválido já basta para o cadastro.

---

<a id="cpf-ja-cadastrado"></a>

## CPF já cadastrado

`409` · `CPF_JA_CADASTRADO` · `campo: "cpf"`

Este CPF já está na base. É o enunciado sendo cumprido: cada cliente preenche
o formulário uma única vez.

A comparação é feita sobre o CPF normalizado, só com dígitos, então
`529.982.247-25` e `52998224725` são o mesmo cadastro. A recusa vem do índice
único do banco, e não de uma consulta prévia — ver
[ADR 0004](adr/0004-unicidade-no-banco.md).

---

<a id="email-ja-cadastrado"></a>

## E-mail já cadastrado

`409` · `EMAIL_JA_CADASTRADO` · `campo: "email"`

Mesma regra do CPF. A comparação é sobre o e-mail em minúsculas, então
`Maria@Exemplo.com` e `maria@exemplo.com` são o mesmo cadastro.

Quando CPF e e-mail se repetem ao mesmo tempo, o Postgres relata só o primeiro
índice violado. A pessoa corrige um, e o outro aparece no envio seguinte.

---

<a id="cor-nao-encontrada"></a>

## Cor não encontrada

`422` · `COR_NAO_ENCONTRADA` · `campo: "corPreferidaId"`

A cor escolhida não existe ou saiu de circulação. Acontece com uma tela aberta
há muito tempo, com a lista em cache, quando a cor foi desativada nesse
intervalo.

Recarregar `GET /api/cores` resolve. A lista vem do banco justamente para
poder mudar sem deploy ([ADR 0005](adr/0005-cores-como-dado.md)).

---

<a id="requisicao-invalida"></a>

## Requisição inválida

`4xx` · `DADOS_INVALIDOS`

Recusa do próprio Fastify, antes de a rota rodar: JSON malformado, corpo acima
de 32 kB, ou `429` do limite de envios — cinco cadastros por minuto e por IP,
cento e vinte requisições por minuto no geral. O `429` vem com `retry-after`.

O `detail` aqui é a mensagem do framework. Não exiba na tela.

---

<a id="rota-nao-encontrada"></a>

## Rota não encontrada

`404` · `DADOS_INVALIDOS`

Nenhuma rota responde nesse método e caminho. Vale só para `/api/...`:
qualquer outro caminho recebe a casca da SPA, para o roteamento acontecer no
navegador.

---

<a id="erro-interno"></a>

## Erro interno

`500` · `ERRO_INTERNO`

Bug nosso. O `detail` é genérico de propósito — mensagem de exceção vaza
detalhe de infraestrutura. O registro completo fica no log, e o
`x-request-id` da resposta é o que liga o relato de quem viu o erro à linha
correspondente.

Se você recebeu um destes, guarde o `x-request-id`.
