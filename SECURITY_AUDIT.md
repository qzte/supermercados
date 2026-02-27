# Auditoria de Segurança — `supermercados`

Data: 2026-02-27

## Escopo auditado
- `workflow_supermercados.html`
- `ulsm_supermercados.jsx`

## Resumo executivo
A revisão do código identificou **3 riscos relevantes** e **1 risco residual de menor gravidade**:

1. **Autorização apenas no cliente para modo editor** (Alta).
2. **Persistência e integridade de dados dependentes do cliente** (Média/Alta).
3. **CSP ainda permissiva por necessidade de código inline** (Média).
4. **Dependência de terceiros para fontes web** (Baixa).

Também foi aplicada uma melhoria de hardening na CSP para reduzir superfície de ataque em recursos não usados (`connect-src 'none'`, `form-action 'none'`, `frame-src 'none'`, `manifest-src 'none'`).

---

## Achados detalhados

### 1) Modo editor protegido apenas no front-end (**Severidade: Alta**)
**Evidência técnica**
- O desbloqueio do modo editor depende de validação local de PIN por hash (`SHA-256`) em variável de runtime (`window.__ULSM_EDITOR_PIN_HASH`).
- Não existe backend de autenticação/autorização para validar identidade/permissões do utilizador.

**Risco**
- Quem controla o browser/runtime consegue contornar barreiras de UI e adulterar comportamento local.
- Não há garantias fortes de identidade nem trilho de auditoria confiável.

**Recomendação**
- Migrar autenticação/autorização para backend (SSO/OIDC/sessão).
- Aplicar RBAC por perfil e registos de auditoria server-side.

---

### 2) Integridade de dados limitada por arquitetura client-side (**Severidade: Média/Alta**)
**Evidência técnica**
- A aplicação usa envelope com checksum para validar persistência local, o que melhora robustez.
- Contudo, checksum sem segredo servidor continua sujeito a forja por utilizador com controlo local.

**Risco**
- Alterações maliciosas podem ser reconstruídas com novo checksum válido no cliente.
- Não há não-repúdio nem histórico imutável de alterações.

**Recomendação**
- Persistir estado em backend autenticado.
- Para requisitos fortes de integridade: assinatura digital com chave privada fora do cliente.

---

### 3) Política CSP ainda depende de `unsafe-inline` para scripts/handlers inline (**Severidade: Média**)
**Evidência técnica**
- O HTML usa diversos `onclick` inline e bloco `<script>` inline.
- Isso exige `script-src 'unsafe-inline'`, reduzindo proteção contra XSS.

**Mitigação aplicada nesta revisão**
- Endurecimento adicional da CSP com diretivas restritivas para vetores não usados:
  - `connect-src 'none'`
  - `form-action 'none'`
  - `frame-src 'none'`
  - `manifest-src 'none'`

**Risco residual**
- Enquanto houver inline script/handlers, a proteção XSS fica abaixo do ideal.

**Recomendação**
- Remover handlers inline e mover JS para ficheiro externo.
- Trocar `script-src 'unsafe-inline'` por nonce/hash.

---

### 4) Dependência externa para fontes (**Severidade: Baixa**)
**Evidência técnica**
- Uso de `fonts.googleapis.com` e `fonts.gstatic.com`.

**Risco**
- Dependência de terceiros (disponibilidade/supply chain/privacidade).

**Recomendação**
- Self-host de fontes quando possível.
- Rever requisitos de privacidade/compliance da organização.

---

## Priorização sugerida
1. **P0**: autenticação/autorização real em backend para ações de editor.
2. **P1**: mover persistência crítica para backend com auditoria imutável.
3. **P1**: remover inline JS e endurecer CSP sem `unsafe-inline`.
4. **P2**: eliminar dependência de fontes de terceiros.

## Conclusão
A base atual está mais madura que uma versão inicial (há validações defensivas e CSP), mas os riscos estruturais de uma aplicação client-side permanecem: identidade fraca, integridade sem autoridade externa e CSP limitada por inline code.
