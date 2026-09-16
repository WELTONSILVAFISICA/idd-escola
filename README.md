# 📱 IDD Escola — Versão GitHub Pages + Supabase

Esta é a versão **sem servidor próprio** do app IDD Escola: os arquivos são
100% estáticos (HTML/CSS/JS) e podem ser hospedados de graça no
**GitHub Pages**. O banco de dados é o **Supabase** (Postgres gratuito,
sempre ligado, com autenticação embutida) — não existe nenhum Node.js para
manter rodando.

> 📄 Para o tutorial completo, passo a passo, de como publicar isso, veja o
> **Tutorial — Publicar no GitHub Pages + Supabase** (PDF entregue junto).

---

## Em que essa versão difere da versão com servidor (Node.js)

| | Versão Node.js (idd-app.zip) | Esta versão (GitHub Pages + Supabase) |
|---|---|---|
| Onde roda | Precisa de um servidor ligado (VPS, Oracle Cloud, etc.) | Só arquivos estáticos — GitHub Pages |
| Banco de dados | SQLite (arquivo local no servidor) | Supabase (Postgres na nuvem, gratuito) |
| Cálculo do IDD | `server/calc.js` (Node.js) | Gatilho SQL dentro do Supabase (`supabase/schema.sql`) |
| Login do admin | Senha própria + token | Supabase Auth (e-mail + senha) |
| Custo | Grátis (Oracle) ou pago (VPS) | Grátis (GitHub Pages + plano gratuito do Supabase) |
| Precisa manter servidor no ar? | Sim | Não — GitHub e Supabase cuidam disso |

O formulário, o visual e a metodologia do IDD são **exatamente os mesmos**.

---

## 🗂️ Estrutura do projeto

```
idd-app-static/
├── index.html            # formulário do aluno
├── admin.html             # painel administrativo
├── css/
│   ├── style.css            # visual do app (idêntico à versão Node.js)
│   └── admin.css              # visual do painel
├── js/
│   ├── supabase-config.js       # ⚠️ ARQUIVO A PERSONALIZAR (URL + chave do seu Supabase)
│   ├── questions.js                # perguntas e opções (mesma fonte da versão Node.js)
│   ├── niveis.js                     # textos/cores de cada nível de IDD (só apresentação)
│   ├── app.js                          # lógica do formulário (usa o Supabase)
│   ├── admin.js                          # lógica do painel (login + gráficos)
│   └── charts.js                           # gráficos em canvas puro, sem libs externas
├── supabase/
│   └── schema.sql          # rode este script no SQL Editor do Supabase
└── docs/screenshots/        # imagens usadas no material de apoio
```

---

## 🧮 Onde está a fórmula do IDD agora

Antes, o cálculo vivia em `server/calc.js` (Node.js). Nesta versão, ele foi
movido para dentro do **próprio banco de dados**, como um gatilho SQL
(`calcular_idd_trigger`, em `supabase/schema.sql`), que roda automaticamente
toda vez que uma resposta é inserida.

Isso é proposital: como não existe mais um servidor nosso no meio do
caminho, o gatilho garante que o valor salvo do IDD é **sempre** o valor
correto — mesmo que alguém tente adulterar o JavaScript no navegador e
enviar um resultado forjado direto para o banco.

```sql
IDD = (3×horas_uso + 3×ansiedade + 2×procrastinacao + 2×distracao)
      / (2×sono + 2×bem_estar)
```

Para ajustar pesos ou faixas, edite a função `calcular_idd_trigger()` em
`supabase/schema.sql` e rode o script atualizado novamente no SQL Editor do
Supabase. Para ajustar os **textos/cores/dicas** de cada nível (conteúdo de
apresentação, não o cálculo), edite `js/niveis.js`.

---

## 🔐 Segurança dos dados (Row Level Security)

O arquivo `supabase/schema.sql` configura duas regras de segurança no banco:

- **Qualquer visitante pode enviar uma resposta** (INSERT) — necessário para
  o formulário funcionar sem exigir login do aluno.
- **Só um usuário autenticado (o administrador) pode ler as respostas**
  (SELECT) — ninguém mais consegue ver os dados, mesmo tendo acesso ao
  código do site.
- **Ninguém pode alterar ou apagar respostas já enviadas** (sem políticas de
  UPDATE/DELETE) — protege a integridade dos dados coletados.

---

## ⚠️ Arquivo que você precisa personalizar

Depois de criar seu projeto no Supabase (veja o tutorial), edite
**`js/supabase-config.js`** com os dados do seu projeto:

```js
window.IDD_SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
window.IDD_SUPABASE_ANON_KEY = 'SUA-CHAVE-ANON-AQUI';
```

Tanto a URL quanto a chave "anon" são seguras para ficar visíveis no código
— é assim que o Supabase foi projetado. A proteção real vem das regras de
segurança do banco (acima), não do sigilo desses valores.

---

## 🛠️ Testando localmente antes de publicar

Como são só arquivos estáticos, dá pra testar no seu computador sem
precisar de Node.js nem de nada instalado — qualquer servidor HTTP simples
serve. Se tiver Python instalado:

```
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000` no navegador. (Sem servidor HTTP
nenhum, abrir o `index.html` direto com duplo-clique **não funciona** — o
navegador bloqueia alguns recursos ao abrir arquivos com `file://`.)

---

## 📄 Licença

MIT — use, adapte e reutilize livremente neste projeto escolar.
