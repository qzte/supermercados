# Auditoria de Segurança — `supermercados`

Data: 2026-03-01

## Escopo auditado
- `ulsm_supermercados.html`
- `ulsm_supermercados.jsx`

## Resumo executivo
A revisão do estado atual do código identificou **5 riscos principais**:

1. **Credenciais de editor hardcoded no cliente** (Alta).
2. **XSS persistente via conteúdo HTML não sanitizado** (Alta).
3. **Cadeia de supply chain externa sem SRI (CDN + fontes)** (Média/Alta).
4. **Arquitetura exclusivamente client-side para permissões e persistência** (Média).
5. **Ausência de CSP explícita no HTML atual** (Média).

---

## Achados detalhados

### 1) Credenciais de editor hardcoded no cliente (**Severidade: Alta**)
**Evidência técnica**
- O ficheiro HTML define diretamente os PINs de editor em `window.__ULSM_EDITOR_PINS`.
- A verificação de permissões ocorre apenas no browser (`pins.includes(input.value.trim())`).

**Risco**
- Qualquer utilizador com acesso ao código-fonte consegue ler ou alterar os PINs.
- Não há autenticação forte nem trilho de auditoria centralizado.

**Recomendação**
- Remover segredos do front-end.
- Implementar autenticação/autorização server-side (SSO/OIDC + RBAC).

---

### 2) XSS persistente por `innerHTML` com dados editáveis/importados (**Severidade: Alta**)
**Evidência técnica**
- A construção de passos usa `step.innerHTML` com `stepData.title` e `stepData.body` (dados vindos de template/localStorage).
- A serialização guarda HTML bruto (`.innerHTML`) em armazenamento local.
- O carregamento reaplica o conteúdo sem sanitização (`applyTemplate` + `createStepElement`).

**Risco**
- Um JSON malicioso ou conteúdo adulterado em `localStorage` pode injetar script/event handlers.
- O ataque persiste entre sessões enquanto os dados estiverem guardados.

**Recomendação**
- Substituir inserção HTML por APIs seguras (`textContent`, `createElement`).
- Sanitizar rigorosamente conteúdo permitido (allowlist).
- Validar e normalizar templates no momento de importação.

---

### 3) Dependências externas críticas sem Subresource Integrity (**Severidade: Média/Alta**)
**Evidência técnica**
- React, ReactDOM e Babel são carregados de CDN sem atributos `integrity`.
- Fontes Google são carregadas de terceiros.

**Risco**
- Maior exposição a ataques de supply chain ou alteração indevida de assets externos.
- Dependência de disponibilidade e política de terceiros.

**Recomendação**
- Fixar versões com `integrity` + `crossorigin` adequado.
- Preferir self-host de bibliotecas e fontes para ambientes críticos.

---

### 4) Integridade e autorização limitadas por arquitetura client-side (**Severidade: Média**)
**Evidência técnica**
- O estado de workflow é gravado em `localStorage` (`workflowTemplate`) e pode ser manipulado localmente.
- O fallback de `window.storage` também grava em `localStorage` sem autoridade externa.

**Risco**
- Não há não-repúdio, controlo de versões confiável nem proteção forte contra adulteração local.

**Recomendação**
- Migrar persistência crítica para backend autenticado com registo de auditoria.
- Aplicar controlo de acesso por perfil e histórico imutável.

---

### 5) CSP ausente no HTML atual (**Severidade: Média**)
**Evidência técnica**
- Não há meta tag nem header CSP definido no documento auditado.
- Existem múltiplos handlers inline (`onclick`), o que dificulta hardening sem refatoração.

**Risco**
- Superfície de ataque XSS maior do que o necessário.

**Recomendação**
- Introduzir CSP por header HTTP (preferencial) e refatorar inline handlers.
- Evoluir para `script-src` com nonce/hash e sem `unsafe-inline`.

---

## Priorização sugerida
1. **P0**: eliminar credenciais hardcoded e mover autenticação/autorização para backend.
2. **P0**: bloquear vetor de XSS persistente (remover `innerHTML` não sanitizado).
3. **P1**: implementar CSP robusta e remover handlers inline.
4. **P1**: reforçar supply chain (`integrity`/self-host).
5. **P2**: migrar persistência crítica para backend com auditoria.

## Conclusão
O principal risco atual não é apenas “falta de backend”, mas a combinação de **segredos expostos no cliente + HTML não sanitizado + dependências externas sem validação de integridade**. Estes pontos devem ser tratados antes de considerar o sistema apto para dados/processos críticos.
