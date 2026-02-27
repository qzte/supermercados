# Auditoria de Segurança — `supermercados`

## Escopo
- `workflow_supermercados.html`
- `ulsm_supermercados.jsx`

## Resumo executivo
Foram identificados **4 riscos principais**:
1. **Controlo de acesso fraco** por PIN hardcoded no front-end.
2. **Integridade de dados fraca** (estado guardado no cliente e facilmente adulterável).
3. **Superfície de XSS** devido a uso de `innerHTML` com composição dinâmica de HTML.
4. **Dependência remota sem hardening** (Google Fonts sem SRI/CSP explícita).

---

## Achados detalhados

### 1) PIN de editor hardcoded no cliente (**Severidade: Alta**)
**Evidência técnica (estado anterior)**
- O código definia `const PIN = "ulsm2025"` diretamente no bundle front-end.

**Correção aplicada nesta revisão**
- O segredo hardcoded foi removido do código-fonte.
- O desbloqueio do modo editor passa a validar `SHA-256(pin)` contra `window.__ULSM_EDITOR_PIN_HASH` (valor injetado em runtime).
- Quando o hash não está configurado, o modo editor fica desativado por omissão (fail-safe).

**Impacto residual**
- Esta mitigação elimina o segredo estático no repositório, mas **não substitui** autenticação/autorização real de servidor.
- Em contexto puramente client-side, um atacante local continua com capacidade de manipulação do runtime.

**Recomendação**
- Implementar autenticação no servidor (SSO/OIDC ou sessão com backend) e autorização por perfil.
- Se a aplicação continuar offline/local, considerar assinatura/validação externa dos registos para evitar edição silenciosa.

---

### 2) Armazenamento e confiança no cliente sem verificação de integridade (**Severidade: Alta**)
**Evidência técnica (estado anterior)**
- A aplicação carregava e gravava estado via `window.storage.get/set` e aceitava os dados como válidos.
- Não havia checksum, envelope versionado nem validação robusta de esquema no carregamento.

**Correção aplicada nesta revisão**
- O payload persistido passou a usar envelope com metadados (`version`, `updatedAt`, `checksum`, `data`).
- Foi adicionada sanitização/validação defensiva ao carregar dados (tipos, datas, limites, status, fase/passo).
- O carregamento agora valida checksum SHA-256 do conteúdo sanitizado e rejeita estado adulterado/inconsistente.
- Mantida compatibilidade com formato antigo (array simples), com migração segura para o novo formato na próxima gravação.

**Impacto residual**
- Em arquitetura puramente client-side, utilizadores locais ainda podem adulterar estado se controlarem runtime e processo de gravação.
- O checksum melhora deteção de corrupção/tampering simples, mas não fornece não repúdio sem backend/assinatura externa.

**Recomendação**
- Persistir dados num backend com autenticação e trilha de auditoria imutável.
- Para requisito de não repúdio, usar assinatura digital com chave privada fora do cliente.

---

### 3) Uso de `innerHTML` para renderização de modal de e-mail (**Severidade: Média**)
**Evidência técnica**
- `workflow_supermercados.html` utiliza `element.innerHTML` para metadados e corpo do modal.
- Embora parte do conteúdo seja pré-definido, o padrão com concatenação HTML aumenta risco de regressão futura para XSS caso campos passem a ser dinâmicos (input externo/API).

**Impacto**
- Risco de XSS armazenado/refletido em evoluções futuras do código.
- Exposição de sessão/contexto do utilizador caso a página seja integrada noutros fluxos.

**Recomendação**
- Preferir `textContent` + criação de nós DOM (`createElement`, `appendChild`) em vez de `innerHTML`.
- Caso HTML seja necessário, sanitizar com biblioteca robusta (ex.: DOMPurify).
- Definir política CSP restritiva para reduzir impacto de injeções.

---

### 4) Dependência remota (Google Fonts) sem controles adicionais (**Severidade: Baixa**)
**Evidência técnica**
- Carregamento direto de CSS remoto de `https://fonts.googleapis.com/...`.

**Impacto**
- Aumenta superfície de supply chain e dependência de disponibilidade externa.
- Em ambientes regulados, pode colidir com requisitos de privacidade e endurecimento.

**Recomendação**
- Hospedar fontes localmente quando possível.
- Configurar CSP explícita (`default-src`, `style-src`, `font-src`) e rever política de terceiros.

---

## Prioridades de remediação
1. **Imediato (P0):** remover PIN hardcoded e mover autorização para backend.
2. **Curto prazo (P1):** reforçar integridade/rastreabilidade de dados persistidos.
3. **Curto prazo (P1):** eliminar `innerHTML` em caminhos não estritamente estáticos e adicionar CSP.
4. **Médio prazo (P2):** reduzir dependências remotas e alinhar hardening de conteúdo.

## Nota final
A aplicação parece orientada a uso operacional interno; ainda assim, os controlos atuais permitem edição não autorizada com esforço baixo por qualquer utilizador com acesso local ao browser.
