# ULSM · Gestão de Supermercados
### Sistema de Revisão — Stock Dupla Caixa

Aplicação web single-file (`ulsm_supermercados.html`) para gerir o workflow e o tracking das revisões de supermercados de stock dupla caixa da ULSM.

---

## Flow da Aplicação

```
Arranque
  └─▶ Workflow (tab ativa por defeito)

Tab "Tracking"
  └─▶ Vista de tracking (cards dos processos — vazia se não há dados)

Botão "🔓 Entrar" — no Tracking, sem dados carregados
  └─▶ LoadScreen
        ├─▶ Carregar backup  →  selecionar ficheiro JSON  →  PIN  →  Modo Editor
        └─▶ Primeiro arranque  →  lista vazia  →  PIN  →  Modo Editor

Botão "🔓 Entrar" — no Tracking, com dados já carregados
  └─▶ PIN  →  Modo Editor

Botão "🔓 Entrar" — no Workflow
  └─▶ PIN  →  Modo Editor do Workflow

Modo Editor ativo
  ├─▶ Tracking: criar/editar processos, avançar passos, guardar backup
  └─▶ Workflow: editar fases, passos, templates de e-mail

Guardar backup
  └─▶ Selecionar pasta destino  →  gera ficheiro JSON  →  substituir na pasta partilhada

Sair do Modo Editor
  └─▶ Volta ao modo leitura
```

---

## Tabs

| Tab | Descrição |
|---|---|
| 🗺 **Workflow** | Visualização do workflow completo de revisão (7 fases, editável em modo editor) |
| 📊 **Tracking** | Cards dos processos de revisão em curso, com tracking dual Clínico / Farmácia |

---

## Tracking — Como Funciona

Cada processo de revisão tem **dois trackings independentes**:

| | Clínico 🏥 | Farmácia 💊 |
|---|---|---|
| Responsável | Selecionado da equipa | Selecionado da equipa |
| Progresso | Fases e passos próprios | Fases e passos próprios |
| Estado | No prazo / Em risco / Atrasado / Concluído / Em pausa | idem |
| Histórico | Log de ações independente | Log de ações independente |

Ambos seguem o **mesmo workflow** (7 fases), mas avançam de forma independente.

### Card do Supermercado
Cada card exibe:
- Nome do serviço e centro de custo
- **Barra Clínico** — responsável + fase atual + % de execução
- **Barra Farmácia** — responsável + fase atual + % de execução
- Percentagem geral (média dos dois)
- Estado global (pior dos dois trackings)
- Data de início e prazo

### KPIs
| KPI | Critério |
|---|---|
| **Concluído** | Clínico **e** Farmácia ambos com estado "Concluído" |
| **Atrasado** | Data alvo ultrapassada e processo não concluído |
| **Em curso** | Nem concluído nem em pausa |

---

## Painel de Detalhe do Processo

Ao clicar num card abre um painel lateral com:

- **Seletor Clínico / Farmácia** — alterna entre os dois trackings
- **Tab Passos** — workflow com estado de cada passo para o tracking selecionado
- **Tab Detalhes** — editar serviço, datas, responsáveis, estados e notas
- **Tab Histórico** — log de eventos e notas manuais por tracking

Em modo editor é possível marcar passos como concluídos, o que avança automaticamente para o passo seguinte.

---

## Modo Editor

### Ativar
1. Clicar em **🔓 Entrar** na barra de navegação
2. Se não há dados: LoadScreen → carregar backup ou primeiro arranque
3. Introduzir o **PIN** de acesso

### PINs disponíveis
```
JOAQUIM · MARTA · MARIANA · JESSICA · ANA
```
*(definidos em `window.__ULSM_EDITOR_PINS` no início do ficheiro HTML)*

### O que é possível no Modo Editor

**Tracking:**
- Criar novos processos (serviço, CC, responsáveis Clínico e Farmácia, data alvo)
- Avançar passos do workflow (Clínico e Farmácia independentemente)
- Editar detalhes, estados e notas
- Guardar backup JSON

**Workflow:**
- Editar títulos e durações de fases
- Editar títulos, tempos e instruções de passos
- Adicionar/remover passos e fases
- Editar templates de e-mail
- Guardar template JSON / Repor versão original

---

## Backup (ficheiro de dados)

O ficheiro de dados é um JSON partilhado:

```
ulsm_supermercados_backup.json
```

### Fluxo de trabalho
1. **Abrir** a app → clicar Entrar → carregar o ficheiro JSON da pasta partilhada
2. **Trabalhar** — criar/editar processos
3. **Guardar** — clicar 💾 Guardar backup → selecionar pasta → substituir o ficheiro

> ⚠️ Não abrir em simultâneo com outra pessoa — o último a guardar sobrescreve.

### Estrutura do JSON
```json
{
  "version": 2,
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "data": [
    {
      "id": 1234567890,
      "service": "UCIP",
      "costCenter": "70HD",
      "startDate": "2025-01-01",
      "targetDate": "2025-02-01",
      "status": "ok",
      "clinico": {
        "responsible": "Joaquim Camelo",
        "currentPhase": 2,
        "currentStep": 3,
        "status": "ok",
        "notes": "",
        "emailLog": [],
        "history": []
      },
      "farmacia": {
        "responsible": "Ana Correia",
        "currentPhase": 1,
        "currentStep": 2,
        "status": "ok",
        "notes": "",
        "emailLog": [],
        "history": []
      }
    }
  ]
}
```

---

## Workflow — Fases

| Fase | Código | Duração |
|---|---|---|
| Comunicação & Planeamento | F01 | ~2 dias |
| Análise de Consumos | F02 | ~2 dias |
| Validação & Protótipo | F03 | ~1,5 semanas |
| Simulação | F04 | ~2 dias |
| Montagem | F05 | ~1 semana |
| Comunicação Final & Devolução | F06 | ~2 dias |
| Formação & Auditoria | F07 | contínuo |

---

## Equipa

| Nome | |
|---|---|
| Ana Correia | |
| Mariana Bastos | |
| Jessica Silveira | |
| Marta Figueiredo | |
| Joaquim Camelo | |

---

## Ficheiros do Projeto

| Ficheiro | Descrição |
|---|---|
| `ulsm_supermercados.html` | Aplicação completa (single-file) |
| `ulsm_supermercados_backup.json` | Dados dos processos (pasta partilhada) |
| `README.md` | Este ficheiro |

---

## Notas Técnicas

- Aplicação **single-file HTML** — sem dependências externas para instalar
- Utiliza **React 18** (via CDN) + **Babel standalone** para JSX
- Fontes: IBM Plex Sans + IBM Plex Mono (Google Fonts)
- Sem base de dados — toda a persistência é via ficheiro JSON local
- Compatível com Chrome, Edge, Firefox, Safari (desktop)
- A funcionalidade **"Selecionar pasta de destino"** para guardar usa a File System Access API (Chrome/Edge); outros browsers fazem download direto
