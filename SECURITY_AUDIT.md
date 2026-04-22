# Auditoria de Segurança — `supermercados`

Data da auditoria: **2026-04-22**  
Escopo: `ulsm_supermercados.html`, `ulsm_supermercados.jsx`

## Resumo executivo
Foram identificados **7 riscos relevantes**. Os dois riscos mais críticos são:

1. **Autenticação fraca com PINs hardcoded no cliente**.
2. **Injeção de HTML/JS (XSS) por uso extensivo de `innerHTML` e `dangerouslySetInnerHTML` com dados editáveis/importáveis**.

A aplicação está funcionalmente madura, mas a arquitetura atual é orientada a conveniência local (single-file, sem backend), o que deixa lacunas sérias para um contexto com dados operacionais sensíveis.

---

## Metodologia rápida
- Revisão estática do front-end e fluxo de persistência local.
- Procura de padrões de risco (`innerHTML`, `dangerouslySetInnerHTML`, `eval`, dependências CDN, PINs client-side, ausência de CSP).
- Validação manual de pontos de entrada de dados e pontos de execução/renderização.

---

## Achados detalhados

### 1) PINs de editor hardcoded e validação só no cliente  
**Severidade: Alta**

**Evidência**
- PINs expostos diretamente em `window.__ULSM_EDITOR_PINS`.
- Vários pontos do código validam acesso comparando input com o array local de PINs.

**Impacto**
- Qualquer utilizador com acesso ao ficheiro consegue ler/alterar credenciais.
- Sem autenticação forte, sem rotação central de credenciais e sem trilho de auditoria robusto.

**Recomendação**
- Migrar para autenticação server-side (SSO/OIDC + RBAC).
- Remover segredos do bundle front-end.

---

### 2) XSS persistente por `innerHTML` e serialização de HTML não sanitizado  
**Severidade: Alta**

**Evidência**
- Criação de elementos com `innerHTML` em várias áreas do workflow/editor/reporting.
- Guardar/carregar template com `innerHTML` em `localStorage`.
- Reaplicação de dados editáveis sem sanitização forte.

**Impacto**
- Um payload malicioso em backup JSON, template ou `localStorage` pode ser executado quando renderizado.
- Persistência do ataque entre sessões (XSS persistente).

**Recomendação**
- Substituir `innerHTML` por `textContent` e criação de nós explícita.
- Quando HTML for estritamente necessário, aplicar sanitização allowlist (ex.: DOMPurify com política restrita).
- Validar/importar JSON com schema estrito.

---

### 3) Uso de `dangerouslySetInnerHTML` no React com conteúdo dinâmico  
**Severidade: Alta**

**Evidência**
- Componentes React utilizam `dangerouslySetInnerHTML` para apresentar labels/instruções.

**Impacto**
- Qualquer dado que entre nesse fluxo sem limpeza pode executar payload no DOM.

**Recomendação**
- Evitar `dangerouslySetInnerHTML` por defeito.
- Se inevitável, aplicar sanitização de HTML estrita antes da renderização.

---

### 4) Execução dinâmica com `eval()` em iframe/reporting  
**Severidade: Alta**

**Evidência**
- O código executa `iframeWin.eval(...)` para preencher relatórios de forma síncrona.

**Impacto**
- Aumenta muito a superfície para execução arbitrária em caso de dados/funções comprometidas.
- Incompatível com hardening moderno (CSP forte tende a bloquear `eval`).

**Recomendação**
- Remover `eval`; usar funções pré-definidas e comunicação controlada (`postMessage`, chamadas diretas validadas).

---

### 5) Dependências CDN sem SRI e carregamento dinâmico de bibliotecas externas  
**Severidade: Média/Alta**

**Evidência**
- React/ReactDOM/Babel e libs de exportação são carregadas via CDN.
- Não há `integrity` nos scripts principais observados.

**Impacto**
- Maior risco de supply-chain (compromisso de terceiros, alteração inesperada, indisponibilidade).

**Recomendação**
- Self-host de dependências críticas ou uso obrigatório de SRI + pin de versão.
- Definir processo de atualização e verificação de integridade.

---

### 6) Ausência de Content Security Policy robusta + muitos handlers inline  
**Severidade: Média**

**Evidência**
- Não foi identificado header/meta CSP efetivo.
- Há diversos `onclick="..."` inline no HTML.

**Impacto**
- Dificulta mitigação de XSS por políticas do browser.

**Recomendação**
- Introduzir CSP por header HTTP.
- Refatorar handlers inline para `addEventListener`.
- Evoluir para política sem `unsafe-inline`/`unsafe-eval`.

---

### 7) Persistência local sem garantias de integridade, auditoria e controlo concorrente  
**Severidade: Média**

**Evidência**
- Persistência principal em `localStorage`/ficheiro JSON local.
- Sem assinatura, sem controlo transacional e sem mecanismo robusto de concorrência.

**Impacto**
- Risco de adulteração local, perda de dados e overwrite silencioso entre operadores.

**Recomendação**
- Backend com controlo de versão/locking otimista.
- Assinatura de backups e trilho de auditoria imutável para operações críticas.

---

## Priorização recomendada

### P0 (imediato)
1. Remover PINs hardcoded e migrar autenticação para backend.
2. Eliminar vetores XSS: remover `innerHTML`/`dangerouslySetInnerHTML` sem sanitização.
3. Remover `eval` do fluxo de relatórios.

### P1 (curto prazo)
4. Implementar CSP robusta e remover handlers inline.
5. Endurecer cadeia de dependências (SRI/self-host + pinning).

### P2 (médio prazo)
6. Migrar persistência crítica para serviço central com auditoria e controlo de concorrência.

---

## Nota final
A aplicação pode continuar útil para operação local, mas **não deve ser considerada segura para contexto crítico** sem tratar os pontos P0. A combinação de credenciais no cliente + injeção HTML + `eval` torna a exploração plausível com esforço moderado.
