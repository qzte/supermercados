# ULSM Supermercados — v3.9.0 (GitHub Pages)

Aplicação web de gestão do processo de revisão de stock dupla caixa (ULSM). Ficheiro único HTML (React 18 + Babel standalone), sem servidor nem build. Servida diretamente pelo GitHub Pages.

## Estrutura do repositório (tudo na raiz)

| Ficheiro | Função |
|---|---|
| `index.html` | Aplicação completa — v3.9.0 |
| `workflow-default.json` | Definição do workflow (fonte de verdade, carregada no boot) |
| `email-template.json` | Templates de e-mail (carregados no boot; fallback inline se falhar) |
| `ulsm_supermercados_backup.json` | *(opcional)* Backup automático carregado no boot, se existir |
| `.nojekyll` | Desativa o processamento Jekyll do GitHub Pages |

⚠ **Nomes em minúsculas.** O GitHub Pages é *case-sensitive*: o ficheiro tem de se chamar `email-template.json` (não `EMAIL-template.json`), tal como a app o pede via `fetch`.

## Publicar

1. Criar repositório no GitHub (ex.: `ulsm-supermercados`).
2. Colocar estes ficheiros na raiz do branch `main`.
3. **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
4. A app fica disponível em `https://<utilizador>.github.io/ulsm-supermercados/`.

## Atualizar dados

- **Workflow / templates de e-mail:** substituir o JSON respetivo na raiz e fazer commit. Os `fetch` usam *cache-busting* (`?v=timestamp`), pelo que a alteração é imediata após o deploy do Pages (~1 min).
- **Backup de processos:** exportar o backup na app (Modo Editor → Guardar Backup) e fazer commit do ficheiro `ulsm_supermercados_backup.json` na raiz para que todos os utilizadores o carreguem no arranque.

## Novidades v3.9.0

- **🔧 Corrigir data de conclusão** (Modo Editor): no separador *✏️ Detalhes* de um processo, quando um tracking (Clínico ou Farmácia) está concluído, é possível corrigir a data/hora de conclusão. A correção respeita o `phaseLog` *append-only* — anexa uma nova entrada `done` com o timestamp corrigido — e regista auditoria no histórico do processo. Aplica-se apenas após "💾 Guardar alterações".
- Caminhos dos JSON movidos de `backups/` para a raiz (estrutura GitHub Pages).

## Versionamento

Semantic Versioning (Major.Minor.Patch). Constante `APP_VERSION` e badge de navegação mantidos em sincronia (v3.9.0).
