# ULSM · Gestão de Supermercados — GitHub Pages

**Versão da aplicação:** v3.21.2
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
│  ── TERCEIROS — substituir, não editar ───────────────────
├── xlsx.full.min.js                    # 📦  SheetJS 0.20.3 (hash fixado no validate)
│
│  ── GERADO — não editar ──────────────────────────────────
├── index.html                          # 🤖  aplicação servida
├── ulsm_supermercados_3_17_2.html      # 🤖  cópia arquivada (idêntica)
│
├── .github/workflows/build.yml         #     compila e faz commit no push
├── .github/workflows/ci.yml            #     valida os pull requests
├── tools/validate.mjs                  #     valida os ficheiros servidos
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
npm run validate  # valida os ficheiros JSON servidos
npm run ci        # validate + check — o mesmo que corre no CI
```

`npm run check` é o que evita que o `index.html` fique dessincronizado da fonte.

---

## Integração contínua

Duas Actions, com papéis separados de propósito:

| Workflow | Quando corre | O que faz | Permissões |
|---|---|---|---|
| `build.yml` | `push` que toque em `src/`, `tools/` ou `package*.json` | compila e **faz commit** dos ficheiros gerados | `contents: write` |
| `ci.yml` | todos os **pull requests** e `push` para `main` | apenas **verifica**; não escreve nada | `contents: read` |

O `ci.yml` existe para fechar uma lacuna concreta: uma alteração só a
`workflow-default.json` ou a `email-template.json` **não aciona o `build.yml`**,
porque não está nos caminhos do gatilho. Eram por isso os únicos ficheiros a
chegar a `main` sem verificação nenhuma — e são precisamente os que falham em
silêncio, porque a app cai num fallback inline em vez de dar erro. O
`workflow-default.json` já esteve meses em esquema legado, servido mas nunca
lido, sem ninguém dar por isso.

O que o `ci.yml` verifica:

1. **`npm run validate`** — os três ficheiros que a app vai buscar por `fetch()`:
   nome exacto (o Pages é case-sensitive), JSON válido, ids de fase e de passo
   únicos, campos obrigatórios dos templates de e-mail, e a **referência cruzada**
   entre os dois — um `emailKey` sem template correspondente não dá erro nenhum
   em runtime, o botão "Ver template de e-mail" simplesmente não faz nada.
   Valida ainda o envelope do backup e os ícones do manifest.
2. **`npm run build`** — compila o JSX. Falha se o JSX estiver partido, se
   `APP_VERSION` e o badge do cabeçalho divergirem, ou se o `workflow-default.json`
   estiver em esquema legado.
3. **`npm run check`** — só em PRs vindos de **forks**, onde o `build.yml` não
   corre e os ficheiros gerados têm de vir já actualizados no próprio PR. Em PRs
   deste repositório a verificação seria uma corrida com o commit do bot, que
   sincroniza os ficheiros um minuto depois.

Correr `npm run ci` localmente reproduz os pontos 1 e 3.

### Endurecimento

Aplica-se aos **dois** workflows:

- **Actions fixadas por SHA**, não por tag — uma tag pode ser reapontada para
  outro commit, e o CI passaria a executar código diferente sem que nada mudasse
  no repositório. Ao actualizar, trocar o SHA **e** o comentário com a versão que
  fica ao lado.
- **`npm ci --ignore-scripts`** — o build só precisa do Babel como biblioteca.
- **`persist-credentials: false`** no `checkout`. Sem isto o token fica gravado
  em `.git/config` durante todo o job, incluindo enquanto correm o `npm ci` e o
  `tools/build.mjs` — passos que executam código do repositório e das suas
  dependências.

No `build.yml`, que é o único que escreve, o token existe apenas no ambiente do
passo de commit e o URL vai como argumento do `git push` (que, ao contrário do
`git remote add`, não grava nada). O refspec é explícito porque, sem credenciais
persistidas, não há upstream configurado.

O passo de commit/push esteve muitos meses sem nunca correr — quem edita tem
feito sempre o build localmente, pelo que o workflow encontrava "nada a fazer" e
saía antes do push. Foi **exercitado de propósito em v3.15.6**, com um commit que
alterava só o `src/index.src.html`: a Action regenerou o `index.html`, renomeou a
cópia arquivada e fez commit como `github-actions[bot]`, e o resultado ficou byte
a byte igual ao de um build local. O caminho está confirmado a funcionar.

> Se um dia falhar, falha de forma visível: o passo dá erro e o workflow fica
> vermelho — nunca deixa os ficheiros gerados dessincronizados em silêncio.

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

### Arranque: escolha explícita, memorizada quando é seguro

Na primeira utilização a app **pergunta pelos dois ficheiros** — workflow e backup de dados — em vez de aplicar automaticamente o que está no repositório. O ecrã mostra **nº de fases/passos** e **nº de processos e data** de cada versão publicada, para a escolha ser informada.

A escolha fica memorizada em `localStorage` (`ulsm:bootChoice`), mas o que se guarda é a **origem, nunca o conteúdo**:

| Origem | Repetida sem perguntar? | Porquê |
|---|---|---|
| `publicada` | ✅ | é relida do repositório em cada arranque — fresca por construção |
| `incluida` | ✅ | vem do próprio ficheiro da app |
| `sem-backup` | ✅ | não há nada a reler |
| `local` | ❌ | um ficheiro do disco não pode ser relido sem nova interacção; guardar uma cópia sua seria precisamente o snapshot desactualizado que este ecrã evita |

Ou seja: quem usa as versões publicadas não volta a ser interrompido, e continua a receber dados actuais porque são refetchados. Quem usa um ficheiro local é sempre questionado — não há alternativa correcta. Se a releitura falhar (offline, ficheiro removido, formato mudado), o arranque **volta a perguntar** em vez de adivinhar.

A barra de topo do Tracking mostra a origem dos dados em `title` e tem um botão **⇄ trocar** que reabre o ecrã de arranque.

A sessão persiste em `sessionStorage` — um refresh não regressa ao ecrã de arranque; fechar a aba limpa-a. Os processos **e** o plano anual são ambos guardados nessa sessão.

### Publicar um workflow novo

O `workflow-default.json` é a via para alterar o processo para toda a gente sem tocar no código: editar no editor de workflow, exportar, e fazer commit do ficheiro. O `loadWorkflow` dá-lhe precedência sobre a versão embutida na app (e o `localStorage` tem precedência sobre ambos, para não sobrescrever edições locais em curso).

> ⚠️ O ficheiro tem de estar no **esquema actual** — fases com `id`/`code`/`color`/`label` e passos com `role`/`instructions`/`emailKey`. Um ficheiro em esquema legado é **ignorado em silêncio**: parece estar a ser servido, mas a app usa a versão embutida. Foi o que aconteceu durante meses. O `npm run build` passa a **falhar** nesse caso, com a indicação do que corrigir.

### Content-Security-Policy

O `index.html` traz uma `<meta http-equiv="Content-Security-Policy">` logo a
seguir ao `<meta charset>`. Tem de ficar aí: uma meta CSP **só governa o que
aparece depois dela**, e o GitHub Pages não permite configurar cabeçalhos HTTP.
O `npm run build` falha se a meta desaparecer, se descer para depois do primeiro
`<script>`/`<link>`, ou se lhe faltar uma directiva essencial.

O que a política entrega: nenhum script carrega de origem que não seja esta ou o
cdnjs; `connect-src 'self'` corta a exfiltração de dados para fora da origem;
`object-src`, `base-uri` e `form-action` fechados; e `default-src 'none'` a negar
por omissão tudo o que não esteja enumerado.

> ⚠️ **O que a política não faz.** O `script-src` leva `'unsafe-inline'` e
> `'unsafe-eval'` por necessidade — a aplicação tem 30 handlers em atributos
> (`onclick=`, `onchange=`, …), que nenhum hash cobre, e a exportação de PDF usa
> `eval()`. Enquanto for assim, **um `<script>` ou `onerror=` injectado continua
> a executar**. Para a tornar eficaz é preciso converter os handlers para
> `addEventListener` e remover o `eval()` — ver A3 e A8 no `SECURITY_AUDIT.md`.

Ao acrescentar uma biblioteca ou uma origem nova, a lista de directivas tem de
ser actualizada, senão o recurso é bloqueado **em silêncio** para o utilizador.

### Dependências externas

React, ReactDOM e Babel são carregados de `cdnjs.cloudflare.com`. Se essas bibliotecas não carregarem (sem internet, bloqueio de rede/proxy), a app mostra um ecrã de erro explícito com botão de recarregar — em vez de uma página em branco. O mesmo acontece se o arranque falhar por outro motivo ou demorar mais de 12 s.

Os relatórios em PDF carregam `jsPDF` e `html2canvas` da mesma CDN, só no momento da exportação.

O **`SheetJS` é servido pela própria aplicação** (`xlsx.full.min.js`, 930 KB), e não por CDN. A versão publicada no cdnjs está congelada na 0.18.5, que tem duas vulnerabilidades conhecidas (CVE-2023-30533, prototype pollution; CVE-2024-22363, ReDoS) — o SheetJS saiu do npm e do cdnjs, e as versões corrigidas só existem fora deles. Ao ser servido do mesmo sítio que a app, deixa também de haver um terceiro capaz de substituir o ficheiro, e a exportação passa a funcionar sem rede, incluindo em `file://`.

> Para actualizar: descarregar de <https://cdn.sheetjs.com>, correr `sha256sum xlsx.full.min.js` e actualizar `version` e `sha256` em `tools/validate.mjs` **no mesmo commit**. O `npm run validate` falha se o ficheiro e o hash divergirem — uma troca silenciosa da biblioteca não passa despercebida.

### Precedência do workflow

Se existir uma versão editada em `localStorage` (`workflowTemplate`), esta tem precedência sobre o `workflow-default.json` servido — o editor local não é sobrescrito por uma versão potencialmente mais antiga do repositório.

### Precedência dos templates de e-mail

Os templates seguem a mesma regra, e pela mesma razão. O editor grava-os **dentro** de `workflowTemplate` (`{ emailTemplates, phases }`), pelo que a ordem no arranque é:

1. `workflowTemplate.emailTemplates` no `localStorage` — as edições do utilizador;
2. `email-template.json` servido pelo repositório;
3. `emailTemplates` embutidos no workflow (inline default, usado em `file://`).

São lidos independentemente das `phases`: um workflow guardado que seja rejeitado por inválido não leva os templates editados atrás.

Consequência prática: **num browser onde já se editaram templates, uma actualização de `email-template.json` no repositório não é apanhada.** É o comportamento pretendido (uma edição local nunca é desfeita em silêncio); para voltar à versão publicada, usar `↺ Repor original` no editor de workflow, que limpa o `localStorage`.

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

**Cancelar o diálogo de gravação não conta como gravar.** O indicador `● não guardado` só desaparece depois de o ficheiro ser mesmo escrito; se o diálogo do browser for fechado sem escolher destino, o aviso mantém-se e o alerta de fecho de página continua armado.

**O plano anual viaja dentro do backup.** Trocar de ficheiro — pelo `⇄ trocar` ou pelo `📂 Carregar backup` — substitui o plano pelo do ficheiro novo. Um backup sem plano deixa o plano vazio, em vez de herdar o do ficheiro anterior.

### Identificadores de processo

O `id` de cada processo é a chave usada para gravar e eliminar. Backups gerados por versões antigas podem conter ids repetidos (derivavam de `Date.now()`, igual para processos criados no mesmo milissegundo). No carregamento, os duplicados são **reatribuídos** — a primeira ocorrência mantém o id original. Sem isto, editar um processo reescrevia os homónimos e eliminá-lo eliminava-os todos.

### Percursos activos (`roles`)

Um processo pode ter só o percurso **clínico** ou só o de **farmácia** (`roles.clinico` / `roles.farmacia`). O tracking do percurso desactivado continua a existir no objecto, parado na fase 1. Qualquer contagem ou indicador tem por isso de verificar `roles` antes de olhar para o estado — caso contrário conta percursos que não existem: os totais 🏥/💊, a barra de distribuição por fase e o throughput a 30 dias já o fazem.

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
