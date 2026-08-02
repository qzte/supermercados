# ULSM · Gestão de Supermercados — GitHub Pages

**Versão da aplicação:** v3.10.1
**URL de produção:** https://qzte.github.io/supermercados/

---

## Estrutura do repositório

Estrutura **plana** — todos os ficheiros na raiz. A app faz `fetch()` de caminhos relativos sem subpastas.

```
supermercados/
├── index.html                          # aplicação servida (cópia idêntica do ficheiro versionado)
├── ulsm_supermercados_3_10_1.html      # ficheiro versionado (referência/arquivo)
├── workflow-default.json               # template do workflow — 7 fases
├── email-template.json                 # templates de e-mail  ⚠ minúsculas
├── ulsm_supermercados_backup.json      # dados dos processos
├── .nojekyll                           # desativa o processamento Jekyll
└── README.md                           # este ficheiro
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

Substituir `index.html` **e** adicionar o novo `ulsm_supermercados_X_Y_Z.html`, commit + push. O Pages republica automaticamente.

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
