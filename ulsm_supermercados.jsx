import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// DATA: PHASES, STEPS, EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_TEMPLATES = {
  abertura: {
    label: "Abertura do processo",
    para: "Serviço Clínico: Enfermeiro(a) gestor(a)",
    cc: "Diretor(a) SF · Diretor(a) SL · Coordenador(a) TSDT · Enf.º(a) gestor(a) c/ funções de direção · Gestor(a) de departamento · Gestor(a) SF",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Revisão Supermercado — [Nome do Serviço]",
    body: `Bom dia/Boa tarde,\n\nVimos por este meio informar que o supermercado referente ao serviço ___[Nome do Serviço]___ vai ser alvo de revisão.\n\nNecessitamos de agendar reunião com a seguinte ordem de trabalhos:\n1. Explicar como funciona um supermercado e que artigos podem constar;\n2. Verificar localização dos supermercados farmacêutico e clínico;\n3. Verificar necessidade de adquirir prateleiras para armários;\n4. Verificar centros de custo;\n5. Estabelecer cronograma;\n6. Informar como irá decorrer o processo e implementação RFID;\n7. Verificar agrupamento por grupo funcional;\n8. Enfermeiro substituto;\n9. Plano de higienização pré-montagem;\n10. Responsabilização de verificação de prazos de validade;\n11. Controlo de temperatura e humidade.\n\nMais se informa que em anexo enviamos o cronograma previsto, bem como as responsabilidades.\n\nAo dispor para qualquer esclarecimento,\nGestão de Supermercados`,
  },
  ata: {
    label: "Ata da reunião + cronograma",
    para: "Serviço Clínico: Enfermeiro(a) gestor(a)",
    cc: "Diretor(a) SF · Diretor(a) SL · Coordenador(a) TSDT · Enf.º(a) gestor(a) c/ funções de direção · Gestor(a) de departamento · Gestor(a) SF",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Ata Reunião — Revisão Stock Dupla Caixa [Nome do Serviço]",
    body: `Bom dia/Boa tarde,\n\nVimos por este meio enviar o cronograma de revisão do stock de dupla caixa acordado em reunião. Alertamos para a necessidade de cumprir as datas estabelecidas, sob penalização de a revisão ser adiada para o próximo ciclo.\n\nFicaram estabelecidos os seguintes temas:\n- Enfermeiro substituto: _______________\n- Centros de custo: _______________\n- Localização e organização dos produtos no supermercado.\n\nCom os melhores cumprimentos,\nGestão de Supermercados`,
  },
  ccira: {
    label: "Validação antimicrobianos (CCIRA)",
    para: "ana.durães@ulsm.min-saude.pt",
    cc: "—",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Validação Antimicrobianos — [Nome do Serviço]",
    body: `Bom dia,\n\nVimos por este solicitar a validação dos antimicrobianos a constar no stock de dupla caixa do serviço ___[Nome do Serviço]___.\n\nCom os melhores cumprimentos,\nGestão de Supermercados`,
  },
  proposta: {
    label: "Envio da proposta ao serviço",
    para: "Serviço Clínico: Enfermeiro(a) gestor(a)",
    cc: "Diretor(a) SF · Diretor(a) SL · Coordenador(a) TSDT · Enf.º(a) gestora c/ funções de direção · Gestor(a) de departamento · Gestor(a) SF",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Proposta Revisão Supermercado — [Nome do Serviço] (PDF + Excel)",
    body: `Bom dia/Boa tarde,\n\nVimos por este meio enviar o documento em formatos PDF e Excel com consumos e proposta da equipa da gestão de supermercados.\n\nA extração de consumos corresponde aos movimentos verificados nos últimos 12 meses. Por este motivo, produtos solicitados a outros serviços não surgem nos dados e produtos desperdiçados por prazo expirado surgem como consumidos pelo serviço. Alertamos para a necessidade de validar estes dados.\n\nOs antimicrobianos são alvo de análise pelo farmacêutico da CCIRA.\n\n- Pedido SGICM (PD): artigos de baixa rotação que não justificam dupla caixa. Caixa de cor diferente, sem etiqueta RFID.\n- Produtos não stockáveis: a retirada de kanban implica criação de encomenda.\n\nO(A) Enfermeiro(a) gestor(a) dispõe de 1 semana para enviar a proposta, sob penalização de só entrar no próximo ciclo de revisão.\n\nCom os melhores cumprimentos,\nGestão de Supermercados`,
  },
  ajuste: {
    label: "Pedido de ajuste / esclarecimento",
    para: "Serviço Clínico: Enfermeiro(a) gestor(a)",
    cc: "Diretor(a) SF · Diretor(a) SL · Coordenador(a) TSDT · Enf.º(a) gestora c/ funções de direção · Gestor(a) de departamento · Gestor(a) SF",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Esclarecimento Proposta — [Nome do Serviço]",
    body: `Bom dia/Boa tarde,\n\nVimos por este meio solicitar o esclarecimento de algumas sugestões enviadas.\n\n___[Inserir motivo(s)]___\n\nExemplos:\n- O produto solicitado não apresenta consumos que justifiquem a introdução em stock de dupla caixa.\n- As quantidades não apresentam justificação. Autonomia mínima ≥ 8 dias (rotas diárias) ou 2-3 dias (dose unitária).\n- Tendo em conta o espaço disponível não é possível colocar as referências solicitadas.\n\nAo dispor para qualquer esclarecimento,\nGestão de Supermercados`,
  },
  acordofinal: {
    label: "Acordo final fechado",
    para: "Serviço Clínico: Enfermeiro(a) gestor(a)",
    cc: "Diretor(a) SF · Diretor(a) SL · Coordenador(a) TSDT · Enf.º(a) gestora c/ funções de direção · Gestor(a) de departamento · Gestor(a) SF",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Acordo Final Supermercado — [Nome do Serviço]",
    body: `Bom dia/Boa tarde,\n\nVimos por este meio informar que foi fechado o acordo final. Iremos proceder à simulação nos próximos dias e assim que esteja pronta enviaremos e-mail a solicitar a validação.\n\nEm anexo enviamos o acordo simulado em formato PDF.\n\nAo dispor para qualquer esclarecimento,\nGestão de Supermercados`,
  },
  validacaosimulacao: {
    label: "Convite validação da simulação",
    para: "Serviço Clínico: Enfermeiro(a) gestor(a)",
    cc: "Diretor(a) SF · Diretor(a) SL · Coordenador(a) TSDT · Enf.º(a) gestora c/ funções de direção · Gestor(a) de departamento · Gestor(a) SF",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Validação da Simulação — [Nome do Serviço]",
    body: `Bom dia/Boa tarde,\n\nVimos por este meio solicitar o comparecimento do(a) Enfermeiro(a) gestor(a) no Serviço de Logística para validar a simulação (organização espacial com etiquetas a preto/branco). Hora e data pode ser acordada através deste e-mail.\n\nA ausência de contacto será interpretada como resposta positiva para avançar com produção definitiva.\n\nCom os melhores cumprimentos,\nGestão de Supermercados`,
  },
  confirmacaosimulacao: {
    label: "Confirmação da simulação",
    para: "Serviço Clínico: Enfermeiro(a) gestor(a)",
    cc: "Diretor(a) SF · Diretor(a) SL · Coordenador(a) TSDT · Enf.º(a) gestora c/ funções de direção · Gestor(a) de departamento · Gestor(a) SF",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Confirmação Simulação — [Nome do Serviço]",
    body: `Bom dia/Boa tarde,\n\nVimos por este meio solicitar a confirmação do(a) Enfermeiro(a) gestor(a) sobre a simulação visualizada a ___[inserir data]___.\n\nJunto remeto a listagem da disposição dos artigos solicitada.\n\nAo dispor para qualquer esclarecimento,\nGestão de Supermercados`,
  },
  datamontagem: {
    label: "Validação data de montagem",
    para: "Serviço Clínico: Enfermeiro(a) gestor(a)",
    cc: "Diretor(a) SF · Diretor(a) SL · Coordenador(a) TSDT · Coordenador TAS/AO · Enf.º(a) gestora c/ funções de direção · Gestor(a) de departamento · Gestor(a) SF",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Data de Montagem Supermercado — [Nome do Serviço]",
    body: `Bom dia/Boa tarde,\n\nVimos por este meio informar que prevemos iniciar a montagem do stock de dupla caixa no dia ___[data]___. Caso o(a) Enfermeiro(a) gestor(a) preconize que o espaço deve ser higienizado deve, por favor, agilizar com o serviço responsável.\n\nSe a data causar alguma perturbação, por favor responda com sugestão alternativa.\n\nAo dispor para qualquer esclarecimento,\nGestão de Supermercados`,
  },
  conclusaoSC: {
    label: "Conclusão — Serviço Clínico",
    para: "Serviço Clínico: Enfermeiro(a) gestor(a)",
    cc: "Diretor(a) SF · Diretor(a) SL · Coordenador(a) TSDT · Enf.º(a) gestora c/ funções de direção · Gestor(a) de departamento · Gestor(a) SF",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Revisão Concluída — Stock Dupla Caixa [Nome do Serviço]",
    body: `Bom dia/Boa tarde,\n\nVimos por este meio informar que a revisão do stock de dupla caixa se encontra terminada.\n\nA rota passa a ter os supermercados _________, com as designações ____________. As caixas do stock são ___cor___. As caixas dos pedidos SGICM estão identificadas com a cor __________.\n\nO stock está organizado da seguinte forma:\n___[Mencionar as zonas existentes]___\n\nA reposição de material farmacêutico ocorre ___[esquema de reposição]___.\n\nO stock está equipado com etiquetas RFID. A rota deve ser transportada exclusivamente pelos TAS do Serviço de Logística, pelos pórticos do piso -1.\n\nEnviamos em anexo o Index em formatos PDF.\n\nAo dispor para qualquer esclarecimento,\nGestão de Supermercados`,
  },
  conclusaoSFSL: {
    label: "Conclusão — SF e SL",
    para: "tsdt.farmacia@ulsm.min-saude.pt · farmacêuticos_ulsm@ulsm.min-saude.pt",
    cc: "filipe.sousa@ulsm.min-saude.pt · marta.lourenco@ulsm.min-saude.pt · vera.soares.lopes@ulsm.min-saude.pt",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Revisão Concluída SF/SL — [Nome do Serviço]",
    body: `Bom dia/Boa tarde,\n\nVimos por este meio informar que a revisão do stock de dupla caixa de ___[inserir serviço]___ se encontra terminada.\n\nA rota passa a ter os supermercados _________, com as designações ____________.\n\nA rota deve ser debitada com recurso a PDA, com movimento do tipo RSA (não consolidar pedido via "satisfação de pedidos").\n\nProblemas no SF devem ser reportados aos responsáveis (Ana Correia, Andreia, Rafaela, Marta Figueiredo e Flávia). O Index está disponível no TEAMS: Geral > Ficheiros > STOCKS Serviços (pasta vermelha).\n\nAo dispor para qualquer esclarecimento,\nGestão de Supermercados`,
  },
  resultadosfinais: {
    label: "Resultados finais (devoluções/validades)",
    para: "Serviço Clínico: Enfermeiro(a) gestor(a)",
    cc: "Diretor(a) SF · Diretor(a) SL · Coordenador(a) TSDT · Enf.º(a) gestora c/ funções de direção · Gestor(a) de departamento · Gestor(a) SF",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Resultados Finais — Devoluções e Validades [Nome do Serviço]",
    body: `Bom dia/Boa tarde,\n\nApós análise dos artigos dispensados, apresentamos os seguintes dados:\n\n___[COLAR DADOS — DEVOLUÇÕES POR EXCESSO E PRAZOS EXPIRADOS]___\n\nA distribuição pelo método de dupla caixa promove uma gestão eficiente de stock, reduzindo o desperdício. Para que resulte da melhor maneira, é essencial que as regras sejam rigorosamente cumpridas. É da responsabilidade do serviço clínico garantir a gestão de prazos de validade e o cumprimento das regras de armazenamento.\n\nAo dispor para qualquer esclarecimento,\nGestão de Supermercados`,
  },
  auditoria: {
    label: "Relatório de auditoria 5S",
    para: "Serviço Clínico: Enfermeiro(a) gestor(a)",
    cc: "Diretor(a) SF · Diretor(a) SL · Coordenador(a) TSDT · Enf.º(a) gestora c/ funções de direção · Gestor(a) de departamento · Gestor(a) SF",
    rem: "gestao.supermercados@ulsm.min-saude.pt",
    assunto: "Relatório de Auditoria 5S — Supermercado [Nome do Serviço]",
    body: `Bom dia/Boa tarde,\n\nNo âmbito da Verificação 5S realizada, foi efetuada uma análise ao cumprimento das normas do "Supermercado | stock dupla caixa", tendo em conta as responsabilidades de Manutenção, Reposição e Utilização. Foram identificados pontos de contacto com Responsabilidades Partilhadas, devidamente assinalados na grelha de verificação.\n\nO objetivo é identificar o grau de conformidade, promovendo a melhoria contínua e a responsabilidade clara dos intervenientes.\n\nFico ao dispor para qualquer esclarecimento.\n\nCom os melhores cumprimentos,\nGestão de Supermercados`,
  },
};

const PHASES = [
  {
    id: 1, code: "F01", color: "#2d8c4e", label: "Comunicação & Planeamento", duration: "~2 dias",
    steps: [
      { id: "1.1", title: "Criar pasta de trabalho partilhada (DCLF)", role: ["SF","SL"], time: "rápido",
        instructions: "Criar pasta na área partilhada com a nomenclatura: Código Serviço - Serviço.\n\nRegras de nomenclatura:\n• Ficheiro de trabalho: SiglaServiço_revisão_A TRABALHAR\n• Ficheiros da Gestão: SiglaServiço_revisão_farmácia_V1 e _clínico_V1\n• Ficheiros do Enf. gestor: SiglaServiço_revisão_farmácia_E (E2, E3…)" },
      { id: "1.2", title: "Enviar e-mail às chefias — abertura do processo", role: ["SF","SL"], time: "2 min", emailKey: "abertura",
        instructions: "Enviar via gestao.supermercados@ulsm.min-saude.pt para o Enfermeiro(a) gestor(a).\n\nCC obrigatório: Diretores SF/SL, Coordenador TSDT, Enf.º gestor c/ funções de direção, Gestor de departamento, Gestor SF.\n\nTemas a cobrir: funcionamento supermercado, localização stocks, espaço, centros de custo, cronograma, RFID, grupos funcionais, higienização, validades, temperatura/humidade." },
      { id: "1.3", title: "Reunião com Enfermeiro Chefe — gestão de expectativas", role: ["SF","SL","SC"], time: "1 hora",
        instructions: "Confirmar em reunião:\n• Localização dos supermercados farmacêutico e clínico\n• Necessidade de prateleiras adicionais\n• Centros de custo\n• Cronograma detalhado (atualizar com o Enf. gestor)\n• Implementação RFID\n• Agrupamento por grupo funcional (dar proposta de grupos)\n• Identificar enfermeiro substituto\n• Plano de higienização pré-montagem\n• Responsável pela verificação de prazos de validade\n• Controlo de temperatura e humidade" },
      { id: "1.4", title: "Enviar ata da reunião com cronograma", role: ["SF","SL"], time: "2 min", emailKey: "ata",
        instructions: "E-mail padrão com ata e cronograma de revisão (template de 4 semanas).\n\nAlertar para cumprimento de prazos sob penalização de adiamento para o próximo ciclo." },
    ],
  },
  {
    id: 2, code: "F02", color: "#1c7ed6", label: "Análise de Consumos", duration: "~2 dias",
    steps: [
      { id: "2.1", title: "Extrair listagem de consumos do Data Discovery", role: ["SF","SL"], time: "5 min",
        instructions: "Movimentos → Movimentos → ⚙ Filtros → intervalo 12 meses\n\nConfigurar campos:\n• Filtros: Código Estado, Código Serviço, Código Armazém\n• Linhas: Armazém\n• Métricas: Valor, Valor Consumo, Valor Aquisição\n\nExportar: símbolo abaixo da engrenagem → Listagem (Excel) → Confirmar\n\nGuardar como Movimentos_list_xxxx na pasta Revisão Supermercados." },
      { id: "2.2", title: "Atualizar Excel de análise — folha \"Consumos\"", role: ["SF"], time: "2 min",
        instructions: "Abrir o Excel de análise (Anexo I — Template consumos).\nSelecionar a folha Consumos → Consulta → Atualizar." },
      { id: "2.3", title: "Extrair listagem do index (Data Discovery → Supermercados)", role: ["SF","SL"], time: "2 min",
        instructions: "Supermercados → Supermercados Config. → Ver detalhe → Guardar\n\nExportar: Listagem (Excel)\n\nGuardar como Supermercados Config._list_xxxx." },
      { id: "2.4", title: "Atualizar folha \"Listagem\" e tabela dinâmica \"TD Consumos\"", role: ["SF"], time: "3 min",
        instructions: "Folha Listagem → Consulta → Atualizar\n\nFolha TD Consumos → clicar na tabela dinâmica → Atualizar\n\nVerificar campos selecionados." },
      { id: "2.5", title: "Decisão: artigos a remover, adicionar, ajustar quantidades", role: ["SF","SL"], time: "1 hora",
        instructions: "Analisar por: preço médio, consumo diário médio, autonomia, estado (stockável/não-stockável, autorizado, ativo/inativo).\n\n⚡ Regras de decisão:\n• Autonomia mínima ≥ 8 dias (rota diária) ou 2-3 dias (dose unitária)\n• Baixa rotação → classificar como Pedido SGICM\n• Antimicrobianos SF → validação obrigatória pela farmacêutica CCIRA antes de avançar" },
      { id: "2.6", title: "Corrigir preços em branco e grupos funcionais", role: ["SF"], time: "10 min",
        instructions: "Verificar coluna de preço médio e preencher valores em branco.\n\nVerificar e corrigir o grupo funcional de cada artigo (necessário para simulação de layout por grupos)." },
      { id: "2.7", title: "Criar proposta (nº caixas, tipo, quantidades) — protótipo inicial", role: ["SF","SL"], time: "30 min", emailKey: "ccira",
        instructions: "Definir artigo a artigo:\n• Número de caixas (normalmente 2)\n• Tipo de caixa (A, B, C, D, O, EL, EM, CF)\n• Quantidade por caixa\n\nFarmácia: antes de enviar ao serviço, enviar antimicrobianos para validação pela farmacêutica CCIRA (ana.durães@ulsm.min-saude.pt)." },
      { id: "2.8", title: "Enviar proposta ao serviço (PDF + Excel)", role: ["SF","SL"], time: "2 min", emailKey: "proposta",
        instructions: "Enviar PDF e Excel ao Enfermeiro(a) gestor(a).\n\n⏰ Prazo: o Enf. gestor tem 1 semana para responder, sob penalização de entrada no próximo ciclo de revisão." },
    ],
  },
  {
    id: 3, code: "F03", color: "#7950f2", label: "Validação & Protótipo", duration: "~1,5 semanas",
    steps: [
      { id: "3.1", title: "Análise do feedback do serviço", role: ["SF","SL"], time: "3 dias", emailKey: "ajuste",
        instructions: "Verificar:\n• Quantidades alteradas (com justificação)\n• Observações\n• Produtos a introduzir (verificar consumos reais)\n• Produtos a excluir (verificar porquê)\n• Solicitações sobre posições\n\n⚡ Decisão:\n→ Proposta aceite: enviar e-mail acordo final\n→ Necessita ajuste: enviar e-mail pedido de esclarecimento" },
      { id: "3.2", title: "Enviar e-mail de acordo final ao serviço", role: ["SF","SL"], time: "2 min", emailKey: "acordofinal",
        instructions: "Só avançar quando houver acordo fechado com o Enf. gestor.\n\nEnviar acordo em PDF como anexo." },
      { id: "3.3", title: "Caracterização do tipo de caixa por artigo", role: ["SF","SL"], time: "variável",
        instructions: "Regras gerais:\n• Não exceder altura de prateleira\n• Peso caixas C/D ≤ 8 kg\n• Última prateleira ≥ 15 cm do solo\n• Caixas A/O: não colocar nas prateleiras superiores nem inferiores\n• Artigos pesados: não nas prateleiras superiores\n• Sem luz direta\n\nFarmácia (cuidados especiais):\n• Pensos na horizontal (princípio ativo)\n• Última posição do stock medicamentos: deixar vazia (substituições)\n• Medicamentos de frio: dispensar em embalagem primária\n• Assinalar LASA e HIGH ALERT" },
      { id: "3.4", title: "Simulação informática do layout (grupos funcionais)", role: ["SF","SL"], time: "3 horas",
        instructions: "Usar Anexo II — Protótipo simulação (Excel).\n\nConsiderar:\n1. Grupos funcionais (artigos do mesmo grupo ficam juntos)\n2. Tipologia de caixa (tamanho + peso)\n3. Ergonomia (artigos pesados a altura de cintura)\n\nSe espaço insuficiente: contactar Enf. gestor para aumentar espaço disponível ou reduzir artigos/quantidades." },
      { id: "3.5", title: "Informar TAS para montagem de estantes no arquivo", role: ["TAS"], time: "2 horas",
        instructions: "TAS monta as estantes no arquivo conforme a planta do serviço.\n\nApós montagem: TAS coloca as caixas necessárias nas prateleiras conforme simulação (15 min).\n\nValidar as posições: verificar se as caixas cabem nas posições definidas." },
      { id: "3.6", title: "Carregamento de artigos no sistema Supermarket (Glintt)", role: ["SF","SL"], time: "~2 min/artigo",
        instructions: "1. Abrir template importar supermercado\n2. Atualizar consulta dinâmica\n3. Filtrar pelo código do serviço\n4. Corrigir os dados\n5. Exportar CSV com código do supermercado\n6. Confirmar 'Ok' e 'Sim'\n7. Abrir Supermarket → Importar Ficheiro → Confirmar\n\nCriação de supermercado:\n• Pórtico: 1 para HPH / 2 para ACES\n• Descrição: letras maiúsculas sem acentos\n• AKA: máx. 8 caracteres, sem pontos\n• Cores: seguir tabela de cores por polo/especialidade" },
    ],
  },
  {
    id: 4, code: "F04", color: "#f59f00", label: "Simulação", duration: "~2 dias",
    steps: [
      { id: "4.1", title: "Impressão e corte de kanbans provisórios (p/b)", role: ["TAS"], time: "10 min",
        instructions: "Imprimir kanbans em preto e branco para fase de simulação.\n\nNão usar cor — são provisórios para validação espacial." },
      { id: "4.2", title: "Colagem dos kanbans provisórios nas caixas", role: ["TAS"], time: "30 min",
        instructions: "Colar kanbans provisórios nas caixas correspondentes às posições da simulação." },
      { id: "4.3", title: "Convidar Enfermeiro para validar simulação no arquivo", role: ["SF"], time: "1 min", emailKey: "validacaosimulacao",
        instructions: "E-mail padrão a solicitar presença do Enf. gestor no arquivo do Serviço de Logística.\n\n⚠️ Ausência de resposta = aprovação tácita para avançar com produção definitiva." },
      { id: "4.4", title: "Validação física com Enfermeiro + TAS armazém", role: ["SC","TAS"], time: "1 hora",
        instructions: "Verificar:\n• Tamanho de caixas adequado a cada artigo\n• Posições fazem sentido para o utilizador\n• Organização por grupo funcional\n• Zona 'Kanbans para repor' adequada\n\nRegistar todas as alterações solicitadas." },
      { id: "4.5", title: "Ajuste de kanbans (físicos e informáticos) se necessário", role: ["SF","SL"], time: "30 min",
        instructions: "Atualizar no Supermarket as posições alteradas.\n\nReimprimir e recolocar kanbans provisórios nas posições corrigidas." },
      { id: "4.6", title: "Confirmação final da simulação por e-mail", role: ["SF"], time: "2 min", emailKey: "confirmacaosimulacao",
        instructions: "Solicitar confirmação escrita ao Enf. gestor sobre a simulação aprovada.\n\nAnexar listagem da disposição dos artigos." },
    ],
  },
  {
    id: 5, code: "F05", color: "#e03131", label: "Montagem", duration: "~1 semana",
    steps: [
      { id: "5.1", title: "Impressão definitiva de kanbans, costas, frentes, posições", role: ["SF","SL"], time: "5 min",
        instructions: "Impressão a cores na impressora a cores.\n\nPlastificar → Cortar com guilhotina laser → Fita dupla face TESA → Inserir dentro das caixas ou colar por fora.\n\nRetirar etiqueta do papel de transporte das caixas." },
      { id: "5.2", title: "Colocação das etiquetas nas caixas (normas de colagem)", role: ["TAS"], time: "8 horas",
        instructions: "Processo de colagem:\n1. Plastificar as etiquetas\n2. Cortar\n3. Colocar fita dupla face (TESA)\n4. Colocar dentro das caixas\n5. Colar na caixa exterior\n6. Colocar caixas nas posições definitivas" },
      { id: "5.3", title: "Marcar posições nas prateleiras (fita preta + etiquetas de posição)", role: ["TAS"], time: "30 min",
        instructions: "Estantes standard: colocar fita cola preta para marcar posições + etiquetas de posição nas prateleiras.\n\nArmários de enfermaria: marcação com fita cola preta e etiquetas de posição feita no serviço clínico (não no arquivo)." },
      { id: "5.4", title: "Colagem de etiquetas LASA e HIGH ALERT (TSDT Farmácia)", role: ["TSDT"], time: "10 min",
        instructions: "Apenas para medicamentos farmacêuticos.\n\nLASA (Look Alike Sound Alike): assinalar na caixa e na etiqueta.\n\nHIGH ALERT: requer confirmação por 2 operadores na utilização." },
      { id: "5.5", title: "Validar data de montagem com Enfermeiro chefe", role: ["SF"], time: "1 min", emailKey: "datamontagem",
        instructions: "Comunicar data prevista ao Enf. gestor.\n\nSolicitar higienização prévia do espaço se necessário.\n\nSe a data causar perturbação, aguardar sugestão alternativa." },
      { id: "5.6", title: "Deslocação e montagem no serviço clínico", role: ["TAS","SF"], time: "1 dia",
        instructions: "Estantes:\n• Montar estantes\n• Caixas na posição certa\n• Colar etiqueta de posição\n\nArmários:\n• Fita cola preta para marcar posições\n• Caixas na posição certa\n\nTransferência:\n• Medicação/materiais antigos → novas caixas\n• Sem stock → virar caixa de baixo para baixo\n• Stock para 1 caixa → colocar e virar a outra\n\nVerificar prazos de validade e condições.\n\nAfixar:\n• Número prateleira/letra armário\n• Index (porta do armário ou sala)\n• Normas de picking (Anexo V)\n• Indicadores visuais (Anexo IV)\n\nCaixas sem stock → zona 'Kanbans para repor' (Anexo VI)" },
      { id: "5.7", title: "Impressão de tags RFID em lote e saída pelo pórtico", role: ["SF","SL"], time: "10 min",
        instructions: "⚠️ Só imprimir depois de validado o stock e posições no serviço.\n\nImpressão Etiquetas → Caixa → selecionar supermercado → aumentar itens por página → filtrar → Localização → Selecionar todos → Imprimir Etiquetas → Sim\n\nAs tags geradas precisam de sair pelo pórtico para serem ativadas." },
      { id: "5.8", title: "Colagem de tags RFID e validação pelo responsável", role: ["TAS"], time: "2 horas",
        instructions: "Normas de colagem RFID:\n• Verificar número da etiqueta com posição da caixa\n• Para superfícies rugosas (envelopes, tubos): aplicar fita dupla face antes\n• Quando só existe uma caixa: colocar tag com número mais baixo\n• Quando há 2 caixas: cada uma tem a sua tag" },
      { id: "5.9", title: "Inventário das tags RFID para validar existências", role: ["TAS"], time: "15 min",
        instructions: "OPL de inventário RFID.\n\nSempre precedido e sucedido por inventário ao:\n• Criar novas tags\n• Inativar tags\n• Eliminar tags\n\nGarantir que todas as tags criadas estão fisicamente no serviço." },
      { id: "5.10", title: "Afixar normas de utilização e indicadores visuais", role: ["TAS"], time: "2 min",
        instructions: "Afixar no local:\n• Anexo IV — Indicadores Visuais\n• Anexo V — Norma de Picking no Supermercado\n\nGarantir que estão visíveis e acessíveis para todos os utilizadores." },
    ],
  },
  {
    id: 6, code: "F06", color: "#0ca678", label: "Comunicação Final & Devolução", duration: "~2 dias",
    steps: [
      { id: "6.1", title: "E-mail de conclusão ao serviço clínico", role: ["SF","SL"], time: "1 min", emailKey: "conclusaoSC",
        instructions: "Informar:\n• Rotas e designações dos supermercados\n• Cores das caixas (stock vs SGICM)\n• Organização do stock por zonas\n• Zonas de consolidação (triângulo amarelo na planta)\n• Esquema de reposição farmacêutica\n• Regras RFID: exclusividade TAS/SL, pórticos piso -1\n\nAnexar Index em PDF." },
      { id: "6.2", title: "E-mail de conclusão aos SF e SL", role: ["SF","SL"], time: "1 min", emailKey: "conclusaoSFSL",
        instructions: "Para: TSDT + farmacêuticos.\n\nInformar:\n• Rotas, designações, cores\n• Procedimento RSA por PDA (não satisfação de pedidos)\n• Responsáveis para reporte de problemas\n• Index disponível em TEAMS: Geral > Ficheiros > STOCKS Serviços (pasta vermelha)" },
      { id: "6.3", title: "Devolução de material excedente e limpeza de caixas/estantes", role: ["TAS"], time: "7 horas",
        instructions: "Artigos excedentes ou retirados → devolver aos armazéns respetivos (SF ou SL).\n\nArtigos com prazo expirado ou sem condições → inutilizar.\n\nRegistar no template de Devoluções (Registo de devolução de artigos do SC ao armazém):\n• Excesso de stock\n• Fora do prazo / sem condições" },
      { id: "6.4", title: "E-mail com resultados finais (devoluções e validades)", role: ["SF","SL"], time: "1 min", emailKey: "resultadosfinais",
        instructions: "Enviar dados consolidados das devoluções:\n• Quantidade e custo de artigos por excesso de stock\n• Quantidade e custo de artigos por prazo expirado\n\nReforçar responsabilidades do SC na gestão de validades e armazenamento." },
    ],
  },
  {
    id: 7, code: "F07", color: "#ae3ec9", label: "Formação & Auditoria", duration: "contínuo",
    steps: [
      { id: "7.1", title: "Formação aos intervenientes do serviço clínico", role: ["SF","SL"], time: "40–60 min",
        instructions: "Apresentação em PowerPoint com:\n• Funcionamento do sistema dupla caixa\n• Normas de utilização (picking, kanbans para repor)\n• Regras RFID\n• Casos práticos\n\nServiço preenche formulário de formação interna.\n\nEnviar questionário de avaliação (Office Forms):\nhttps://forms.office.com/Pages/ResponsePage.aspx?id=CEbIIh3wxUaAJGPMli5fUbQH0K98ewFHk-G3-YoM3Z5UMUw3OVZaRFNXSkFIMTRET1U4WkI5UTdMVy4u" },
      { id: "7.2", title: "Auditorias periódicas — verificação 5S", role: ["SF","SL"], time: "periódico", emailKey: "auditoria",
        instructions: "Análise de cumprimento das normas do stock dupla caixa.\n\nVerificar:\n• Manutenção (SF/SL)\n• Reposição (TAS SL)\n• Utilização (SC)\n• Responsabilidades Partilhadas\n\nEnviar relatório com grelha de verificação ao Enf. gestor e chefias.\n\nNão conformidades detetadas:\n1. Contactar responsáveis dos intervenientes\n2. Definir ações corretivas\n3. Acompanhar implementação\n4. Registar na próxima auditoria" },
    ],
  },
];

const TEAM = ["Ana Correia", "Andreia", "Rafaela", "Marta Figueiredo", "Flávia", "Joaquim", "TAS Logística"];

const STATUS_CFG = {
  ok:      { label: "No prazo",  dot: "#69db7c", bg: "rgba(45,140,78,.18)",   border: "rgba(45,140,78,.45)"   },
  warning: { label: "Em risco",  dot: "#fcc419", bg: "rgba(245,159,0,.18)",   border: "rgba(245,159,0,.45)"   },
  late:    { label: "Atrasado",  dot: "#fa5252", bg: "rgba(224,49,49,.18)",   border: "rgba(224,49,49,.45)"   },
  done:    { label: "Concluído", dot: "#38d9a9", bg: "rgba(12,166,120,.15)",  border: "rgba(12,166,120,.4)"   },
  paused:  { label: "Em pausa", dot: "#7d8590", bg: "rgba(125,133,144,.12)", border: "rgba(125,133,144,.35)" },
};

const ROLE_COLORS = { SF:"#4dabf7", SL:"#69db7c", SC:"#fcc419", TAS:"#fa5252", TSDT:"#da77f2" };

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const SKEY = "ulsm-integrated-v1";
async function loadData() {
  try { const r = await window.storage.get(SKEY, true); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
}
async function saveData(list) {
  try { await window.storage.set(SKEY, JSON.stringify(list), true); } catch(e) { console.error(e); }
}

const EDITOR_PIN_HASH = (window.__ULSM_EDITOR_PIN_HASH || "").trim().toLowerCase();

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map(n => n.toString(16).padStart(2, "0"))
    .join("");
}

async function canUnlockEditor(pin) {
  if(!pin || !EDITOR_PIN_HASH) return false;
  const hash = await sha256Hex(pin);
  return hash === EDITOR_PIN_HASH;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function daysUntil(d) { if(!d) return null; return Math.round((new Date(d)-new Date())/86400000); }
function fmtDate(iso) { if(!iso) return "—"; return new Date(iso).toLocaleDateString("pt-PT",{day:"2-digit",month:"short",year:"numeric"}); }
function fmtDateTime(iso) { if(!iso) return "—"; return new Date(iso).toLocaleDateString("pt-PT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}); }

function totalSteps() { return PHASES.reduce((a,p)=>a+p.steps.length,0); }
function completedSteps(proc) {
  const donePhaseSteps = PHASES.slice(0, proc.currentPhase-1).reduce((a,p)=>a+p.steps.length,0);
  return donePhaseSteps + (proc.currentStep||0);
}
function totalPct(proc) { return Math.round((completedSteps(proc)/totalSteps())*100); }

function EMPTY_PROC() {
  return { id: Date.now(), service:"", costCenter:"", responsible:"", coResponsible:"",
    startDate: new Date().toISOString().slice(0,10), targetDate:"",
    currentPhase:1, currentStep:0, status:"ok", notes:"",
    emailLog:[], history:[{ ts: new Date().toISOString(), action:"Processo criado" }],
    createdAt: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const IS = { background:"#0d1117", border:"1px solid #30363d", borderRadius:6, color:"#e6edf3",
  padding:"8px 12px", fontSize:13, width:"100%", fontFamily:"inherit", outline:"none" };
const LS = { fontSize:10, color:"#7d8590", fontFamily:"'IBM Plex Mono',monospace", marginBottom:4,
  display:"block", letterSpacing:"0.06em", textTransform:"uppercase" };

function RoleBadge({role}) {
  const c = ROLE_COLORS[role]||"#7d8590";
  return <span style={{background:c+"22",border:`1px solid ${c}55`,color:c,borderRadius:4,
    padding:"1px 6px",fontSize:10,fontFamily:"monospace",fontWeight:700,marginRight:3}}>{role}</span>;
}

function ProgressBar({value,color,h=4}) {
  return <div style={{background:"rgba(255,255,255,.07)",borderRadius:99,height:h,overflow:"hidden"}}>
    <div style={{width:`${value}%`,height:"100%",borderRadius:99,background:color,transition:"width .4s"}} />
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP DETAIL DRAWER (instructions + email template + mark done)
// ─────────────────────────────────────────────────────────────────────────────
function StepDrawer({ step, phaseColor, procService, onMarkDone, isDone, isCurrent, onClose }) {
  const [copied, setCopied] = useState(false);
  const email = step.emailKey ? EMAIL_TEMPLATES[step.emailKey] : null;

  const copyEmail = () => {
    if(!email) return;
    const text = `Assunto: ${email.assunto}\n\nPara: ${email.para}\nCC: ${email.cc}\n\n${email.body}`;
    navigator.clipboard.writeText(text).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2200); });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", backdropFilter:"blur(5px)",
      zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#161b22", border:`1px solid ${phaseColor}44`, borderRadius:14,
        width:"100%", maxWidth:640, maxHeight:"90vh", display:"flex", flexDirection:"column",
        boxShadow:`0 0 60px ${phaseColor}22, 0 24px 60px rgba(0,0,0,.7)`,
        animation:"fadeUp .18s ease" }}>

        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #21262d",
          display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontFamily:"monospace", fontSize:11, color:phaseColor, fontWeight:700 }}>{step.id}</span>
              {step.role?.map(r=><RoleBadge key={r} role={r}/>)}
              <span style={{ fontFamily:"monospace", fontSize:10, color:"#555" }}>{step.time}</span>
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:"#e6edf3", lineHeight:1.3 }}>{step.title}</div>
          </div>
          <button onClick={onClose} style={{ background:"#21262d", border:"1px solid #30363d",
            color:"#7d8590", borderRadius:6, padding:"6px 10px", cursor:"pointer", flexShrink:0 }}>✕</button>
        </div>

        <div style={{ overflowY:"auto", flex:1, padding:"20px" }}>
          {/* Instructions */}
          <div style={{ fontSize:11, color:"#7d8590", fontFamily:"monospace", marginBottom:8 }}>INSTRUÇÕES</div>
          <div style={{ background:"#0d1117", border:"1px solid #21262d", borderRadius:8,
            padding:"14px 16px", fontSize:13, lineHeight:1.8, color:"#c9d1d9",
            whiteSpace:"pre-wrap", marginBottom: email ? 20 : 0, fontFamily:"inherit" }}>
            {step.instructions}
          </div>

          {/* Email template */}
          {email && (
            <div>
              <div style={{ fontSize:11, color:"#7d8590", fontFamily:"monospace", marginBottom:10 }}>TEMPLATE DE E-MAIL</div>
              <div style={{ background:"#0d1117", border:"1px solid #21262d", borderRadius:8, overflow:"hidden" }}>
                <div style={{ padding:"10px 14px", borderBottom:"1px solid #21262d",
                  display:"flex", flexDirection:"column", gap:4 }}>
                  {[["De", email.rem],["Para", email.para],["CC", email.cc],["Assunto", email.assunto]].map(([l,v])=>(
                    v && v !== "—" && <div key={l} style={{ display:"flex", gap:8, fontSize:11 }}>
                      <span style={{ color:"#555", fontFamily:"monospace", minWidth:54 }}>{l}:</span>
                      <span style={{ color:"#8b949e" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding:"14px 16px", fontSize:13, lineHeight:1.8, color:"#c9d1d9",
                  whiteSpace:"pre-wrap", fontFamily:"inherit", maxHeight:220, overflowY:"auto" }}>
                  {email.body}
                </div>
              </div>
              <button onClick={copyEmail} style={{
                marginTop:10, width:"100%", padding:"9px 0",
                background: copied ? "rgba(45,140,78,.2)" : "rgba(29,125,210,.15)",
                border: `1px solid ${copied ? "rgba(45,140,78,.5)" : "rgba(29,125,210,.4)"}`,
                color: copied ? "#69db7c" : "#4dabf7",
                borderRadius:8, fontSize:12, fontFamily:"monospace", cursor:"pointer", fontWeight:700,
                transition:"all .2s",
              }}>{copied ? "✓ Texto copiado!" : "📋 Copiar texto do e-mail"}</button>
            </div>
          )}
        </div>

        {/* Footer action */}
        <div style={{ padding:"14px 20px", borderTop:"1px solid #21262d", flexShrink:0 }}>
          {isDone ? (
            <div style={{ textAlign:"center", fontSize:13, color:"#38d9a9", fontFamily:"monospace", fontWeight:700 }}>
              ✓ Passo concluído
            </div>
          ) : isCurrent ? (
            <button onClick={onMarkDone} style={{
              width:"100%", padding:"11px 0",
              background: phaseColor+"22", border:`1px solid ${phaseColor}66`,
              color: phaseColor, borderRadius:8, fontSize:13, fontFamily:"monospace",
              cursor:"pointer", fontWeight:700, transition:"all .2s",
            }}>✓ Marcar como concluído e avançar</button>
          ) : (
            <div style={{ textAlign:"center", fontSize:12, color:"#555", fontFamily:"monospace" }}>
              Este passo ainda não está ativo no processo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS DETAIL PANEL
// ─────────────────────────────────────────────────────────────────────────────
function ProcessDetail({ proc, onClose, onSave, onDelete, isEditor }) {
  const [draft, setDraft] = useState(()=>JSON.parse(JSON.stringify(proc)));
  const [tab, setTab] = useState("steps");
  const [activeStep, setActiveStep] = useState(null);
  const [newNote, setNewNote] = useState("");
  const upd = (f,v) => setDraft(d=>({...d,[f]:v}));

  const phase = PHASES[draft.currentPhase-1];
  const pct = totalPct(draft);

  const openStep = (phaseIdx, stepIdx) => {
    setActiveStep({ phaseIdx, stepIdx });
  };

  const markDone = () => {
    const ph = PHASES[draft.currentPhase-1];
    let updated = { ...draft };
    if (draft.currentStep < ph.steps.length - 1) {
      const nextStep = ph.steps[draft.currentStep + 1];
      updated.currentStep = draft.currentStep + 1;
      updated.history = [...(updated.history||[]), { ts: new Date().toISOString(),
        action: `✓ Concluído: ${ph.steps[draft.currentStep].title} → Em curso: ${nextStep.title}` }];
    } else if (draft.currentPhase < PHASES.length) {
      const nextPhase = PHASES[draft.currentPhase];
      updated.currentPhase = draft.currentPhase + 1;
      updated.currentStep = 0;
      updated.history = [...(updated.history||[]), { ts: new Date().toISOString(),
        action: `✓ Concluída ${ph.code} — ${ph.label} → Iniciado ${nextPhase.code} — ${nextPhase.label}` }];
    } else {
      updated.status = "done";
      updated.history = [...(updated.history||[]), { ts: new Date().toISOString(), action: "🏁 Processo concluído!" }];
    }
    setDraft(updated);
    setActiveStep(null);
    if(isEditor) onSave(updated);
  };

  const addNote = () => {
    if(!newNote.trim()) return;
    const updated = { ...draft, history: [...(draft.history||[]),
      { ts: new Date().toISOString(), action: `📝 ${newNote.trim()}`, isNote:true }] };
    setDraft(updated);
    setNewNote("");
    if(isEditor) onSave(updated);
  };

  const activeStepData = activeStep
    ? { step: PHASES[activeStep.phaseIdx].steps[activeStep.stepIdx], phaseColor: PHASES[activeStep.phaseIdx].color }
    : null;

  const isStepDone = (phaseId, stepIdx) =>
    phaseId < draft.currentPhase || (phaseId === draft.currentPhase && stepIdx < draft.currentStep);
  const isStepCurrent = (phaseId, stepIdx) =>
    phaseId === draft.currentPhase && stepIdx === draft.currentStep;

  const days = daysUntil(draft.targetDate);
  const cfg = STATUS_CFG[draft.status];

  return (
    <>
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", backdropFilter:"blur(6px)",
      zIndex:200, display:"flex", alignItems:"stretch", justifyContent:"flex-end" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#161b22", borderLeft:`3px solid ${phase.color}`,
        width:"100%", maxWidth:720, display:"flex", flexDirection:"column",
        boxShadow:"-16px 0 60px rgba(0,0,0,.6)", animation:"slideIn .2s ease",
        overflowY:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #21262d", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <span style={{ width:10, height:10, borderRadius:"50%", background:cfg.dot,
                  boxShadow:`0 0 8px ${cfg.dot}`, flexShrink:0 }} />
                <span style={{ fontSize:18, fontWeight:700, color:"#e6edf3" }}>
                  {draft.service||"Serviço sem nome"}
                </span>
                <span style={{ padding:"2px 8px", background:phase.color+"22", border:`1px solid ${phase.color}44`,
                  color:phase.color, borderRadius:4, fontSize:10, fontFamily:"monospace", fontWeight:700 }}>
                  {phase.code}
                </span>
              </div>
              <div style={{ display:"flex", gap:16, fontSize:11, color:"#7d8590", fontFamily:"monospace" }}>
                {draft.responsible && <span>👤 {draft.responsible}</span>}
                {draft.targetDate && <span style={{ color: days===null?"#7d8590":days<0?"#fa5252":days<=7?"#fcc419":"#69db7c" }}>
                  📅 {days===null?"":days<0?`${Math.abs(days)}d atraso`:days===0?"hoje!`":`${days}d`} · alvo: {fmtDate(draft.targetDate)}
                </span>}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, flexShrink:0 }}>
              {isEditor && <button onClick={()=>onDelete(draft.id)} style={{ background:"rgba(224,49,49,.12)",
                border:"1px solid rgba(224,49,49,.3)", color:"#fa5252", borderRadius:6,
                padding:"6px 10px", fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>Eliminar</button>}
              <button onClick={onClose} style={{ background:"#21262d", border:"1px solid #30363d",
                color:"#7d8590", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontSize:13 }}>✕</button>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginTop:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:11, color:"#7d8590", fontFamily:"monospace" }}>PROGRESSO GERAL</span>
              <span style={{ fontSize:11, color:"#e6edf3", fontFamily:"monospace", fontWeight:700 }}>{pct}% · {completedSteps(draft)}/{totalSteps()} passos</span>
            </div>
            <ProgressBar value={pct} color={phase.color} h={6}/>
          </div>

          {/* Phase timeline mini */}
          <div style={{ display:"flex", gap:3, marginTop:12, overflowX:"auto" }}>
            {PHASES.map(ph=>{
              const done = ph.id < draft.currentPhase;
              const cur = ph.id === draft.currentPhase;
              return <div key={ph.id} onClick={()=>setTab("steps")} title={ph.label}
                style={{ flex:1, height:5, borderRadius:99, cursor:"pointer", minWidth:20,
                  background: done ? ph.color : cur ? ph.color+"88" : "rgba(255,255,255,.07)",
                  border: cur ? `1px solid ${ph.color}` : "1px solid transparent",
                  transition:"all .2s" }} />;
            })}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", padding:"0 24px", borderBottom:"1px solid #21262d", flexShrink:0 }}>
          {[["steps","📋 Passos"],["info","✏️ Detalhes"],["history","🕐 Histórico"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{ padding:"10px 16px", fontSize:12,
              fontFamily:"monospace", cursor:"pointer", border:"none",
              borderBottom:`2px solid ${tab===k?phase.color:"transparent"}`,
              background:"transparent", color:tab===k?"#e6edf3":"#7d8590",
              fontWeight:tab===k?700:400, transition:"all .15s" }}>{l}</button>
          ))}
        </div>

        {/* Tab body */}
        <div style={{ overflowY:"auto", flex:1, padding:"20px 24px" }}>

          {/* ── STEPS ── */}
          {tab==="steps" && (
            <div>
              {PHASES.map((ph, phIdx)=>{
                const isCurrentPhase = ph.id === draft.currentPhase;
                const isPastPhase = ph.id < draft.currentPhase;
                const isFuturePhase = ph.id > draft.currentPhase;
                return (
                  <div key={ph.id} style={{ marginBottom:16 }}>
                    {/* Phase header */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8,
                      opacity: isFuturePhase ? .4 : 1 }}>
                      <div style={{ width:22, height:22, borderRadius:"50%", flexShrink:0,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        background: isPastPhase ? ph.color+"33" : isCurrentPhase ? ph.color+"22" : "rgba(255,255,255,.04)",
                        border:`2px solid ${isPastPhase||isCurrentPhase ? ph.color : "rgba(255,255,255,.1)"}`,
                        fontSize:9, fontWeight:700, color: isPastPhase||isCurrentPhase ? ph.color : "#555" }}>
                        {isPastPhase ? "✓" : ph.id}
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color: isCurrentPhase?"#e6edf3":isPastPhase?"#7d8590":"#444" }}>
                        {ph.code} · {ph.label}
                      </span>
                      <span style={{ fontSize:10, color:"#555", fontFamily:"monospace", marginLeft:"auto" }}>{ph.duration}</span>
                    </div>

                    {/* Steps */}
                    <div style={{ paddingLeft:16, borderLeft:`2px solid ${isCurrentPhase?ph.color+"55":"rgba(255,255,255,.05)"}` }}>
                      {ph.steps.map((step, sIdx)=>{
                        const done = isStepDone(ph.id, sIdx);
                        const cur = isStepCurrent(ph.id, sIdx);
                        const future = !done && !cur;
                        return (
                          <div key={step.id}
                            onClick={()=>openStep(phIdx, sIdx)}
                            style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 10px",
                              borderRadius:7, marginBottom:3, cursor:"pointer", transition:"all .15s",
                              background: cur ? ph.color+"14" : "transparent",
                              border: cur ? `1px solid ${ph.color}33` : "1px solid transparent",
                              opacity: future&&!isCurrentPhase&&!isPastPhase ? .35 : 1,
                            }}
                            onMouseEnter={e=>{ e.currentTarget.style.background=cur?ph.color+"1a":"rgba(255,255,255,.04)"; }}
                            onMouseLeave={e=>{ e.currentTarget.style.background=cur?ph.color+"14":"transparent"; }}>
                            {/* Status icon */}
                            <div style={{ width:18, height:18, borderRadius:"50%", flexShrink:0,
                              display:"flex", alignItems:"center", justifyContent:"center", fontSize:9,
                              background: done?ph.color+"33":cur?ph.color+"22":"rgba(255,255,255,.05)",
                              border:`1.5px solid ${done?ph.color:cur?ph.color+"88":"rgba(255,255,255,.08)"}`,
                              color: done?ph.color:cur?"#e6edf3":"#444", fontWeight:700 }}>
                              {done?"✓":sIdx+1}
                            </div>
                            <span style={{ fontSize:12, flex:1,
                              color: done?"#555":cur?"#e6edf3":"#7d8590",
                              textDecoration: done?"line-through":"none" }}>
                              {step.title}
                            </span>
                            <div style={{ display:"flex", gap:3, alignItems:"center" }}>
                              {step.emailKey && <span title="Tem template de e-mail" style={{ fontSize:11, opacity:.6 }}>✉</span>}
                              {cur && <span style={{ fontSize:9, color:ph.color, fontFamily:"monospace", fontWeight:700, whiteSpace:"nowrap" }}>EM CURSO ›</span>}
                              {!done && !cur && <span style={{ fontSize:10, color:"#333" }}>›</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── INFO ── */}
          {tab==="info" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {[["service","NOME DO SERVIÇO","text"],["costCenter","CENTRO DE CUSTO","text"]].map(([f,l,t])=>(
                <div key={f}><label style={LS}>{l}</label>
                  <input type={t} value={draft[f]} onChange={e=>isEditor&&upd(f,e.target.value)} readOnly={!isEditor} style={IS}/></div>
              ))}
              {[["responsible","RESPONSÁVEL"],["coResponsible","CO-RESPONSÁVEL"]].map(([f,l])=>(
                <div key={f}><label style={LS}>{l}</label>
                  <select value={draft[f]} onChange={e=>isEditor&&upd(f,e.target.value)} disabled={!isEditor}
                    style={{...IS,cursor:isEditor?"pointer":"default"}}>
                    <option value="">— selecionar —</option>
                    {TEAM.map(t=><option key={t} value={t}>{t}</option>)}
                  </select></div>
              ))}
              {[["startDate","DATA DE INÍCIO","date"],["targetDate","DATA ALVO","date"]].map(([f,l,t])=>(
                <div key={f}><label style={LS}>{l}</label>
                  <input type={t} value={draft[f]} onChange={e=>isEditor&&upd(f,e.target.value)} readOnly={!isEditor} style={IS}/></div>
              ))}
              <div style={{gridColumn:"1/-1"}}>
                <label style={LS}>ESTADO</label>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {Object.entries(STATUS_CFG).map(([k,v])=>(
                    <button key={k} onClick={()=>isEditor&&upd("status",k)} style={{
                      padding:"5px 12px", borderRadius:20, cursor:isEditor?"pointer":"default",
                      border:`1px solid ${draft.status===k?v.dot+"88":"rgba(255,255,255,.1)"}`,
                      background:draft.status===k?v.bg:"transparent",
                      color:draft.status===k?v.dot:"#7d8590", fontSize:11, fontFamily:"monospace", fontWeight:600,
                    }}>{v.label}</button>
                  ))}
                </div>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={LS}>NOTAS</label>
                <textarea value={draft.notes} onChange={e=>isEditor&&upd("notes",e.target.value)}
                  readOnly={!isEditor} rows={3}
                  placeholder="Observações, condicionantes, contexto específico…"
                  style={{...IS,resize:"vertical",lineHeight:1.6}}/>
              </div>
              {isEditor && (
                <div style={{gridColumn:"1/-1"}}>
                  <button onClick={()=>onSave(draft)} style={{
                    width:"100%", padding:"10px 0", background:"rgba(45,140,78,.2)",
                    border:"1px solid rgba(45,140,78,.5)", color:"#69db7c",
                    borderRadius:8, fontSize:13, fontFamily:"monospace", cursor:"pointer", fontWeight:700 }}>
                    💾 Guardar alterações
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY ── */}
          {tab==="history" && (
            <div>
              <div style={{ display:"flex", gap:8, marginBottom:20 }}>
                <input value={newNote} onChange={e=>setNewNote(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addNote()}
                  placeholder="Adicionar nota ao histórico…"
                  style={{...IS,flex:1}} disabled={!isEditor}/>
                <button onClick={addNote} disabled={!isEditor} style={{
                  background:"rgba(255,255,255,.06)", border:"1px solid #30363d",
                  color:"#e6edf3", borderRadius:6, padding:"8px 14px",
                  fontSize:12, cursor:isEditor?"pointer":"default", fontFamily:"monospace",
                  opacity:isEditor?1:.4 }}>+ Nota</button>
              </div>
              {(draft.history||[]).length===0 ? (
                <div style={{textAlign:"center",color:"#555",padding:32,fontSize:13}}>Histórico vazio.</div>
              ) : (
                <div style={{ position:"relative" }}>
                  <div style={{ position:"absolute",left:8,top:0,bottom:0,width:1,background:"#21262d" }}/>
                  {[...(draft.history||[])].reverse().map((h,i)=>(
                    <div key={i} style={{ display:"flex", gap:14, marginBottom:12, paddingLeft:26, position:"relative" }}>
                      <div style={{ position:"absolute",left:4,top:5,width:9,height:9,borderRadius:"50%",
                        background:h.isNote?"#fcc419":"#4dabf7",border:"2px solid #161b22" }}/>
                      <div>
                        <div style={{ fontSize:12, color:"#c9d1d9" }}>{h.action}</div>
                        <div style={{ fontSize:10, color:"#555", fontFamily:"monospace", marginTop:2 }}>{fmtDateTime(h.ts)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Step drawer */}
    {activeStepData && (
      <StepDrawer
        step={activeStepData.step}
        phaseColor={activeStepData.phaseColor}
        procService={draft.service}
        isDone={isStepDone(PHASES[activeStep.phaseIdx].id, activeStep.stepIdx)}
        isCurrent={isStepCurrent(PHASES[activeStep.phaseIdx].id, activeStep.stepIdx)}
        onMarkDone={markDone}
        onClose={()=>setActiveStep(null)}
      />
    )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS CARD
// ─────────────────────────────────────────────────────────────────────────────
function ProcessCard({ proc, onClick }) {
  const phase = PHASES[proc.currentPhase-1];
  const pct = totalPct(proc);
  const cfg = STATUS_CFG[proc.status];
  const days = daysUntil(proc.targetDate);
  const nextStep = phase?.steps[proc.currentStep];

  return (
    <div onClick={()=>onClick(proc)}
      style={{ background:"#161b22", border:`1px solid ${cfg.border}`, borderRadius:10,
        padding:"18px 20px", cursor:"pointer", transition:"all .2s", position:"relative", overflow:"hidden" }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,.4)`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
      <div style={{ position:"absolute",left:0,top:0,bottom:0,width:3,background:phase?.color,borderRadius:"10px 0 0 10px" }}/>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ flex:1, paddingRight:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ width:8,height:8,borderRadius:"50%",background:cfg.dot,
              boxShadow:`0 0 6px ${cfg.dot}88`,flexShrink:0 }}/>
            <span style={{ fontWeight:700, fontSize:14, color:"#e6edf3" }}>{proc.service||"Serviço sem nome"}</span>
          </div>
          <div style={{ fontSize:11, color:"#7d8590", fontFamily:"monospace" }}>
            {proc.costCenter&&`CC ${proc.costCenter} · `}{proc.responsible&&`👤 ${proc.responsible}`}
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:20,fontWeight:700,fontFamily:"monospace",
            color:pct===100?"#38d9a9":"#e6edf3",lineHeight:1 }}>
            {pct}<span style={{fontSize:11,color:"#7d8590"}}>%</span>
          </div>
        </div>
      </div>

      <ProgressBar value={pct} color={phase?.color||"#333"} h={4}/>

      <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, gap:8, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:9,color:"#555",fontFamily:"monospace",marginBottom:3 }}>FASE</div>
          <span style={{ background:phase?.color+"22",border:`1px solid ${phase?.color}44`,
            color:phase?.color,borderRadius:4,padding:"2px 8px",fontSize:10,fontFamily:"monospace",fontWeight:700 }}>
            {phase?.code} · {phase?.label}
          </span>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:9,color:"#555",fontFamily:"monospace",marginBottom:3 }}>PRÓXIMO PASSO</div>
          <div style={{ fontSize:11,color:"#8b949e",maxWidth:180,textAlign:"right",lineHeight:1.3 }}>{nextStep?.title||"Concluído"}</div>
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
        <div style={{ fontSize:10,color:"#555",fontFamily:"monospace" }}>{fmtDate(proc.startDate)}</div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {proc.targetDate&&<span style={{ fontSize:10,fontFamily:"monospace",
            color:days===null?"#555":days<0?"#fa5252":days<=7?"#fcc419":"#69db7c" }}>
            {days===null?"":days<0?`${Math.abs(days)}d atraso`:days===0?"hoje":days<=7?`${days}d`:""}
          </span>}
          <span style={{ fontSize:10,fontFamily:"monospace",padding:"2px 8px",borderRadius:99,
            background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.dot }}>{cfg.label}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW PROCESS MODAL
// ─────────────────────────────────────────────────────────────────────────────
function NewProcessModal({ onClose, onCreate }) {
  const [form, setForm] = useState({service:"",costCenter:"",responsible:"",targetDate:""});
  const upd = (f,v) => setForm(d=>({...d,[f]:v}));
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(6px)",
      zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#161b22",border:"1px solid #30363d",borderRadius:12,
        padding:28,width:"100%",maxWidth:460,boxShadow:"0 24px 60px rgba(0,0,0,.7)",animation:"fadeUp .18s ease" }}>
        <div style={{ fontSize:15,fontWeight:700,color:"#e6edf3",marginBottom:20 }}>Novo Processo de Revisão</div>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div><label style={LS}>NOME DO SERVIÇO *</label>
            <input value={form.service} onChange={e=>upd("service",e.target.value)}
              placeholder="Ex: UCIP, Ortopedia, CE Oftalmo…" style={IS}
              onKeyDown={e=>e.key==="Enter"&&form.service.trim()&&onCreate({...EMPTY_PROC(),...form,history:[{ts:new Date().toISOString(),action:"Processo criado"}]})} /></div>
          <div><label style={LS}>CENTRO DE CUSTO</label>
            <input value={form.costCenter} onChange={e=>upd("costCenter",e.target.value)} placeholder="Código CC" style={IS}/></div>
          <div><label style={LS}>RESPONSÁVEL</label>
            <select value={form.responsible} onChange={e=>upd("responsible",e.target.value)} style={{...IS,cursor:"pointer"}}>
              <option value="">— selecionar —</option>
              {TEAM.map(t=><option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label style={LS}>DATA ALVO DE CONCLUSÃO</label>
            <input type="date" value={form.targetDate} onChange={e=>upd("targetDate",e.target.value)} style={IS}/></div>
        </div>
        <div style={{ display:"flex",gap:10,marginTop:20 }}>
          <button onClick={()=>form.service.trim()&&onCreate({...EMPTY_PROC(),...form,history:[{ts:new Date().toISOString(),action:"Processo criado"}]})}
            style={{ flex:1,background:"rgba(45,140,78,.2)",border:"1px solid rgba(45,140,78,.5)",
              color:"#69db7c",borderRadius:8,padding:"10px 0",fontSize:13,fontFamily:"monospace",cursor:"pointer",fontWeight:700 }}>
            Criar processo
          </button>
          <button onClick={onClose} style={{ background:"#21262d",border:"1px solid #30363d",
            color:"#7d8590",borderRadius:8,padding:"10px 18px",fontSize:13,cursor:"pointer" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [procs, setProcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [pin, setPin] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(()=>{ loadData().then(d=>{ setProcs(d); setLoading(false); }); },[]);

  const persist = useCallback(async(list)=>{ setProcs(list); await saveData(list); },[]);

  const handleSave = async(updated) => {
    const list = procs.map(p=>p.id===updated.id?updated:p);
    await persist(list);
    setSelected(updated);
  };
  const handleCreate = async(p) => { await persist([...procs,p]); setShowNew(false); setSelected(p); };
  const handleDelete = async(id) => {
    if(!confirm("Eliminar este processo?")) return;
    await persist(procs.filter(p=>p.id!==id));
    setSelected(null);
  };

  const filtered = procs.filter(p=>{
    if(filterStatus!=="all"&&p.status!==filterStatus) return false;
    if(search&&!p.service.toLowerCase().includes(search.toLowerCase())&&
       !(p.responsible||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: procs.length,
    active: procs.filter(p=>p.status!=="done"&&p.status!=="paused").length,
    late: procs.filter(p=>{ const d=daysUntil(p.targetDate); return d!==null&&d<0&&p.status!=="done"; }).length,
    done: procs.filter(p=>p.status==="done"||totalPct(p)===100).length,
  };

  const handleEditorLogin = async() => {
    if(!EDITOR_PIN_HASH) {
      setAuthError("Modo editor desativado: hash não configurado.");
      return;
    }
    setAuthBusy(true);
    const ok = await canUnlockEditor(pin);
    if(ok) {
      setIsEditor(true);
      setPin("");
      setAuthError("");
    } else {
      setPin("");
      setAuthError("PIN inválido.");
    }
    setAuthBusy(false);
  };

  return (
    <div style={{ background:"#0d1117", minHeight:"100vh", fontFamily:"'IBM Plex Sans',sans-serif", color:"#e6edf3" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;600;700&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:none;} }
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#30363d;border-radius:99px;}
        select option{background:#1c2128;}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.5);}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ borderBottom:"1px solid #21262d", padding:"14px 28px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        background:"#161b22", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:14 }}>
          <div>
            <div style={{ fontSize:10,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:".15em",
              color:"#7d8590",marginBottom:1 }}>ULSM · GESTÃO DE SUPERMERCADOS</div>
            <div style={{ fontSize:16,fontWeight:700,letterSpacing:"-.02em" }}>Tracking de Revisões</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {!isEditor ? (
            <>
              <input type="password" placeholder="PIN editor…" value={pin} onChange={e=>setPin(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!authBusy&&void handleEditorLogin()}
                style={{ background:"#0d1117",border:"1px solid #30363d",borderRadius:6,
                  color:"#e6edf3",padding:"6px 10px",fontSize:12,width:120,outline:"none",fontFamily:"monospace" }}/>
              <button onClick={handleEditorLogin} disabled={authBusy||!EDITOR_PIN_HASH}
                style={{ background:"rgba(29,125,210,.2)",border:"1px solid rgba(29,125,210,.4)",
                  color:"#4dabf7",borderRadius:6,padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"monospace",
                  opacity: authBusy||!EDITOR_PIN_HASH ? .5 : 1 }}>
                {authBusy ? "A validar…" : "Entrar"}
              </button>
              {authError && <span style={{ fontSize:11,color:"#fa5252",fontFamily:"monospace" }}>{authError}</span>}
            </>
          ) : (
            <>
              <span style={{ fontSize:11,color:"#69db7c",fontFamily:"monospace" }}>✓ EDITOR</span>
              <button onClick={()=>setIsEditor(false)} style={{ background:"rgba(224,49,49,.12)",
                border:"1px solid rgba(224,49,49,.3)",color:"#fa5252",borderRadius:6,
                padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"monospace" }}>Sair</button>
              <button onClick={()=>setShowNew(true)} style={{ background:"rgba(45,140,78,.2)",
                border:"1px solid rgba(45,140,78,.5)",color:"#69db7c",borderRadius:6,
                padding:"7px 16px",fontSize:12,cursor:"pointer",fontFamily:"monospace",fontWeight:700 }}>
                + Novo processo
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding:"24px 28px", maxWidth:1200, margin:"0 auto" }}>

        {/* ── KPIs ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
          {[["TOTAL",stats.total,"#4dabf7"],["EM CURSO",stats.active,"#fcc419"],
            ["ATRASADOS",stats.late,"#fa5252"],["CONCLUÍDOS",stats.done,"#38d9a9"]].map(([l,v,c])=>(
            <div key={l} style={{ background:"#161b22",border:"1px solid #21262d",borderRadius:10,padding:"14px 18px" }}>
              <div style={{ fontSize:9,color:"#7d8590",fontFamily:"monospace",letterSpacing:".12em",marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:26,fontWeight:700,fontFamily:"monospace",color:c,lineHeight:1 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* ── FILTERS ── */}
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Pesquisar serviço ou responsável…"
            style={{ background:"#161b22",border:"1px solid #30363d",borderRadius:8,
              color:"#e6edf3",padding:"8px 14px",fontSize:13,flex:1,minWidth:200,
              outline:"none",fontFamily:"inherit" }}/>
          <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
            {[["all","Todos","#4dabf7"],...Object.entries(STATUS_CFG).map(([k,v])=>[k,v.label,v.dot])].map(([k,l,c])=>(
              <button key={k} onClick={()=>setFilterStatus(k)} style={{
                padding:"5px 12px",borderRadius:20,cursor:"pointer",
                border:`1px solid ${filterStatus===k?c+"88":"rgba(255,255,255,.08)"}`,
                background:filterStatus===k?c+"22":"transparent",
                color:filterStatus===k?c:"#7d8590",fontSize:11,fontFamily:"monospace",fontWeight:600,
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* ── CARDS ── */}
        {loading ? (
          <div style={{ textAlign:"center",padding:60,color:"#7d8590",fontFamily:"monospace" }}>A carregar…</div>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:"center",padding:60 }}>
            <div style={{ fontSize:36,marginBottom:12 }}>📋</div>
            <div style={{ fontSize:13,color:"#7d8590" }}>
              {procs.length===0
                ? isEditor?"Sem processos. Clique em «+ Novo processo» para começar.":"Sem processos. Um editor deve criar o primeiro processo."
                : "Nenhum processo corresponde aos filtros."}
            </div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))", gap:14 }}>
            {filtered.map(p=><ProcessCard key={p.id} proc={p} onClick={setSelected}/>)}
          </div>
        )}

        {/* ── PHASE DISTRIBUTION BAR ── */}
        {procs.length>0&&(
          <div style={{ marginTop:28,background:"#161b22",border:"1px solid #21262d",borderRadius:10,padding:"14px 18px" }}>
            <div style={{ fontSize:9,color:"#7d8590",fontFamily:"monospace",letterSpacing:".12em",marginBottom:10 }}>DISTRIBUIÇÃO POR FASE</div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {PHASES.map(ph=>{
                const count = procs.filter(p=>p.currentPhase===ph.id&&p.status!=="done").length;
                return (
                  <div key={ph.id} onClick={()=>setFilterStatus("all")}
                    style={{ display:"flex",alignItems:"center",gap:7,padding:"5px 10px",
                      borderRadius:6,cursor:"pointer",transition:"all .15s",
                      background:count>0?ph.color+"15":"rgba(255,255,255,.02)",
                      border:`1px solid ${count>0?ph.color+"44":"#21262d"}` }}>
                    <span style={{ width:7,height:7,borderRadius:"50%",background:count>0?ph.color:"#333" }}/>
                    <span style={{ fontSize:10,fontFamily:"monospace",color:count>0?"#c9d1d9":"#444" }}>{ph.code}</span>
                    {count>0&&<span style={{ fontSize:11,fontWeight:700,color:ph.color,fontFamily:"monospace" }}>{count}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {selected&&<ProcessDetail proc={selected} onClose={()=>setSelected(null)}
        onSave={handleSave} onDelete={handleDelete} isEditor={isEditor}/>}
      {showNew&&<NewProcessModal onClose={()=>setShowNew(false)} onCreate={handleCreate}/>}
    </div>
  );
}
