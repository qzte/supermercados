# ULSM · Gestão de Supermercados — GitHub Pages

**Versão da aplicação:** v3.12.0
**URL de produção:** https://qzte.github.io/supermercados/

---

## ⚠️ Ler primeiro: o `index.html` é gerado

**Não editar `index.html` à mão.** É produzido a partir de `src/index.src.html` e qualquer alteração directa é perdida no build seguinte. O ficheiro que se edita é o **`src/index.src.html`**.

## Estrutura do repositório

Os ficheiros **servidos** estão todos na raiz — a app faz `fetch()` de caminhos relativos sem subpastas. As fontes e as ferramentas ficam à parte.

```
supermercados/
│
│  ── EDITAR ────────────────────────────────────────────────
├── src/index.src.html                  # ✏️  a aplicação (contém JSX)
├── tools/build.mjs                     #     compila o JSX
├── workflow-default.json               #     template do workflow — 7 fases
├── email-template.json                 #     templates de e-mail  ⚠ minúsculas
├── ulsm_supermercados_backup.json      #     dados dos processos
│
│  ── GERADO — não editar ──────────────────────────────────
├── index.html                          # 🤖  aplicação servida
├── ulsm_supermercados_3_12_0.html      # 🤖  cópia arquivada (idêntica)
│
├── .github/workflows/build.yml         #     compila e faz commit no push
├── package.json                        #     dependências do build
├── .nojekyll                           #     desativa o processamento Jekyll
└── README.md                           #     este ficheiro
```

> ⚠️ **Case-sensitive.** O GitHub Pages distingue maiúsculas de minúsculas. O ficheiro tem de se chamar `email-template.json` — `EMAIL-template.json` devolve 404 e a app cai no fallback inline.

> `.nojekyll` é obrigatório — sem ele o Jekyll ignora ficheiros iniciados por `_` e pode interferir com o servir dos JSON.

---

## Deploy inicial

1. Criar o repositório **`supermercados`** na conta `qzte` (público).
2. Copiar todos os ficheiros acima para a **raiz** do repositório.
3. `Settings` → `Pages` → **Source:** `Deploy from a branch` → **Branch:** `main` / `/ (root)`.
4. Aguardar 1–2 min pela primeira publicação.
5. Abrir https://qzte.github.io/supermercados/

### Actualizar a aplicação

1. Editar **`src/index.src.html`**.
2. Ao mudar de versão, actualizar os **dois** sítios onde ela aparece — `const APP_VERSION` e o badge no cabeçalho. O build recusa-se a correr se divergirem.
3. Commit + push. A Action compila e faz commit do `index.html` e da cópia versionada; o Pages republica.

O nome do ficheiro arquivado deriva de `APP_VERSION`, e a cópia da versão anterior é removida automaticamente — deixa de ser preciso fazê-lo à mão.

> Podes editar `src/index.src.html` pela interface web do GitHub. A Action trata do resto; o `index.html` aparece num segundo commit, cerca de um minuto depois.

### Build local (opcional)

```bash
npm ci
npm run build     # gera index.html + cópia versionada
npm run check     # verifica se estão actualizados, sem escrever
```

`npm run check` é o que evita que o `index.html` fique dessincronizado da fonte.

---

## Porquê um build

`src/index.src.html` contém **~5 500 linhas de JSX**, que o browser não percebe. Sem build, cada carregamento de página descarregava o Babel (2,8 MB; 589 KB comprimidos) e traduzia essas linhas outra vez — trabalho idêntico, repetido em cada visita de cada utilizador, com a página em branco enquanto corria.

Tempo até a app estar utilizável (mediana de 3 execuções, bibliotecas locais):

| CPU | Sem build | Com build | |
|---|---|---|---|
| Desktop | 1 529 ms | **140 ms** | 10,9× |
| Telemóvel médio (4× mais lento) | 4 958 ms | **456 ms** | 10,9× |
| Telemóvel modesto (6×) | 7 044 ms | **809 ms** | 8,7× |

Em produção a diferença é maior: o Babel vinha do cdnjs, pelo que desaparecem também 589 KB de transferência. O `index.html` cresce 28 KB (o JS compilado é mais verboso que o JSX) — troca amplamente favorável.

O ficheiro-fonte mantém o `<script type="text/babel">` de propósito: **abre e corre directamente no browser**, sem passo de build, o que o mantém utilizável para testar alterações antes do commit.

---

## Carregamento automático

Servida por HTTPS, a app resolve os `fetch()` relativos ao subpath `/supermercados/`:

| Ficheiro | Fetch no código | Efeito se ausente |
|---|---|---|
| `workflow-default.json` | `?nocache=` / `?v=` | fallback inline `window.__ULSM_INLINE_DEFAULT` |
| `email-template.json` | `?v=` | fallback `window.__ULSM_INLINE_EMAIL_TEMPLATES` |
| `ulsm_supermercados_backup.json` | `?v=` | arranca vazio (BootScreen) |

Todos usam cache-busting por querystring — actualizações são apanhadas sem refresh forçado.

Em `file://` os `fetch()` são bloqueados pelo protocolo e a app usa exclusivamente os fallbacks inline.

A sessão persiste em `sessionStorage` — um refresh não regressa à BootScreen; fechar a aba limpa-a. Os processos **e** o plano anual são ambos guardados nessa sessão.

### Dependências externas

React, ReactDOM e Babel são carregados de `cdnjs.cloudflare.com`. Se essas bibliotecas não carregarem (sem internet, bloqueio de rede/proxy), a app mostra um ecrã de erro explícito com botão de recarregar — em vez de uma página em branco. O mesmo acontece se o arranque falhar por outro motivo ou demorar mais de 12 s.

Os relatórios em PDF/Excel carregam `jsPDF`, `html2canvas` e `SheetJS` da mesma CDN, mas só no momento da exportação.

### Precedência do workflow

Se existir uma versão editada em `localStorage` (`workflowTemplate`), esta tem precedência sobre o `workflow-default.json` servido — o editor local não é sobrescrito por uma versão potencialmente mais antiga do repositório.

---

## Persistência dos dados

O GitHub Pages é **read-only**. O `ulsm_supermercados_backup.json` no repositório é apenas o estado inicial de leitura.

Fluxo de trabalho:

1. Abrir a app → dados carregados do repositório.
2. `Entrar` → modo Editor → PIN → editar. O PIN é um dos nomes em `window.__ULSM_EDITOR_PINS` e **ignora maiúsculas/minúsculas** (`joaquim` = `JOAQUIM`).
3. `💾 Guardar backup` → ficheiro descarregado localmente.
4. Commit do ficheiro actualizado sobre `ulsm_supermercados_backup.json`.

> ⚠️ Não editar em simultâneo — o último commit sobrescreve.

O backup incluído neste pacote está vazio (`version: 2`, `data: []`) — arranque limpo.

---

## Responsividade e acessibilidade

A app é utilizável em telemóvel a partir de **320 px** de largura, sem scroll horizontal em nenhuma das três vistas. Abaixo de 900 px a barra de navegação passa a duas linhas e a variável `--nav-h` acompanha a mudança — qualquer elemento `sticky` deve usar `top: var(--nav-h)` em vez de um valor fixo.

As grelhas da app são definidas em **estilos inline do React**, que têm precedência sobre CSS normal. Por isso as media queries responsivas usam classes utilitárias com `!important`:

| Classe | Efeito |
|---|---|
| `.rg-2` … `.rg-6` | colapsa N colunas para 2 e depois 1, por patamares |
| `.rg-stats` | cartões de indicadores; mantém 2 colunas até 360 px |
| `.rp-pad` | reduz o padding lateral dos contentores principais |
| `.scroll-x` | põe conteúdo largo a rolar dentro do próprio contentor |

Ao adicionar uma grelha nova, aplicar a classe correspondente — não basta o estilo inline.

Do lado da acessibilidade: as três vistas são um `tablist` navegável por setas/Home/End, as cinco modais têm `role="dialog"`, fecham com Escape, confinam o Tab e devolvem o foco ao elemento que as abriu, os controlos de filtro expõem `aria-pressed`, e o foco por teclado é sempre visível (`:focus-visible`). São respeitados `prefers-reduced-motion` e `prefers-contrast`.
