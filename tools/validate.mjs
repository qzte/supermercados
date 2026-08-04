#!/usr/bin/env node
/**
 * Validação dos ficheiros servidos — ULSM · Gestão de Supermercados.
 *
 * O `build.mjs` já valida o que precisa para compilar: a coerência da versão, o
 * bloco JSX e o esquema do `workflow-default.json`. Este script cobre o resto —
 * os ficheiros que a aplicação vai buscar por `fetch()` em runtime e que, quando
 * estão errados, falham **em silêncio**: a app cai num fallback ou desiste sem
 * dizer nada, e o problema só aparece semanas depois.
 *
 * Cada verificação aqui corresponde a uma falha que já aconteceu neste
 * repositório ou que o código deixa acontecer sem aviso:
 *
 *   · `EMAIL-template.json` em maiúsculas → 404 no Pages (que é case-sensitive)
 *     e a app usa o fallback inline. Esteve assim no histórico.
 *   · `emailKey` a apontar para um template que não existe → `openEmail()` faz
 *     `if(!t) return;` e o botão "Ver template de e-mail" não faz nada.
 *   · Template sem `assunto`/`body` → modal de e-mail meio vazio.
 *   · Ícone do manifest em falta → instalação no ecrã inicial falha sem erro.
 *
 * Uso:
 *   node tools/validate.mjs
 */

import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CI = !!process.env.GITHUB_ACTIONS;

let failures = 0;
let warnings = 0;

/** Erro que faz falhar o CI. Em Actions sai anotado no ficheiro certo. */
function fail(message, file) {
  failures++;
  if (CI) console.log(`::error${file ? ` file=${file}` : ''}::${message}`);
  console.error(`  ✗ ${message}`);
}

/** Problema que merece atenção mas não justifica bloquear o merge. */
function warn(message, file) {
  warnings++;
  if (CI) console.log(`::warning${file ? ` file=${file}` : ''}::${message}`);
  console.warn(`  ! ${message}`);
}

function ok(message) {
  console.log(`  ✓ ${message}`);
}

/**
 * Resumo positivo que só é impresso se nada tiver falhado desde `mark`.
 * Sem isto, um "✓ 7 fases · ids únicos" aparecia logo a seguir ao erro que
 * dizia precisamente que havia ids duplicados.
 */
function mark() { return failures; }
function okUnless(since, message) { if (failures === since) ok(message); }

async function exists(name) {
  try { await access(join(ROOT, name)); return true; } catch { return false; }
}

/** Lê e faz parse de um JSON, devolvendo null (e registando o erro) se falhar. */
async function readJson(name) {
  let raw;
  try {
    raw = await readFile(join(ROOT, name), 'utf8');
  } catch {
    fail(`${name} não existe — a aplicação faz fetch deste ficheiro.`, name);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`${name} não é JSON válido: ${e.message}`, name);
    return null;
  }
}

// ── 1. Nomes exactos dos ficheiros servidos ──────────────────────────────────
// O GitHub Pages distingue maiúsculas de minúsculas e a app pede estes nomes
// literalmente. Um ficheiro com a caixa trocada devolve 404 e o fallback inline
// entra sem qualquer sinal visível de que o ficheiro publicado não está a ser lido.
console.log('\nFicheiros servidos');

const SERVED = ['workflow-default.json', 'email-template.json', 'ulsm_supermercados_backup.json'];
const rootEntries = await readdir(ROOT);

for (const name of SERVED) {
  if (rootEntries.includes(name)) {
    ok(`${name} presente com o nome exacto`);
    continue;
  }
  const variant = rootEntries.find(f => f.toLowerCase() === name.toLowerCase());
  if (variant) {
    fail(`${name} está no repositório como "${variant}". O Pages é case-sensitive: ` +
      `o fetch devolve 404 e a aplicação passa a usar o fallback inline sem avisar.`, variant);
  } else {
    fail(`${name} não existe — a aplicação faz fetch deste ficheiro.`);
  }
}

// ── 2. workflow-default.json ─────────────────────────────────────────────────
// O esquema base (fases, passos, formato actual) é validado pelo build.mjs.
// Aqui verifica-se a coerência interna, que o build não olha.
console.log('\nworkflow-default.json');

const workflow = await readJson('workflow-default.json');
const usedEmailKeys = new Set();
const wfMark = mark();

if (workflow) {
  const phaseIds = new Map();
  const stepIds = new Map();
  let stepCount = 0;

  (workflow.phases || []).forEach((ph, phIdx) => {
    const where = `fase ${phIdx + 1}`;

    if (ph.id !== undefined) {
      if (phaseIds.has(ph.id)) {
        fail(`id de fase duplicado (${ph.id}): ${where} e fase ${phaseIds.get(ph.id) + 1}.`,
          'workflow-default.json');
      }
      phaseIds.set(ph.id, phIdx);
    }

    if (!ph.label && !ph.title) {
      warn(`${where} não tem \`label\` — a aplicação mostra "Fase ${phIdx + 1}".`,
        'workflow-default.json');
    }

    (ph.steps || []).forEach((st, sIdx) => {
      stepCount++;
      const stepWhere = `${where}, passo ${sIdx + 1}`;

      if (st.id !== undefined) {
        if (stepIds.has(st.id)) {
          fail(`id de passo duplicado (${st.id}) em ${stepWhere}.`, 'workflow-default.json');
        }
        stepIds.set(st.id, stepWhere);
      }

      if (!st.title) fail(`${stepWhere} não tem \`title\`.`, 'workflow-default.json');
      if (st.emailKey) usedEmailKeys.add(st.emailKey);

      // O `replyDays` só é lido quando é finito (Number.isFinite em
      // buildPhasesFromData); um valor em texto é descartado sem erro.
      if (st.replyDays !== undefined && st.replyDays !== null && !Number.isFinite(st.replyDays)) {
        fail(`${stepWhere} tem \`replyDays\` não numérico (${JSON.stringify(st.replyDays)}) — ` +
          `a aplicação ignora-o e o prazo de resposta desaparece.`, 'workflow-default.json');
      }
    });
  });

  okUnless(wfMark, `${(workflow.phases || []).length} fases · ${stepCount} passos · ids únicos`);
}

// ── 3. email-template.json ───────────────────────────────────────────────────
console.log('\nemail-template.json');

const emailRaw = await readJson('email-template.json');

if (emailRaw) {
  // A app aceita os dois formatos: { "chave": {...} } e { "emailTemplates": {...} }.
  const templates = emailRaw.emailTemplates || emailRaw;
  const keys = Object.keys(templates || {});

  if (keys.length === 0) {
    fail('email-template.json não define nenhum template.', 'email-template.json');
  } else {
    // Campos que o openEmail() lê directamente. Em falta, o modal abre incompleto.
    const REQUIRED = ['title', 'rem', 'para', 'assunto', 'body'];
    const tplMark = mark();
    for (const key of keys) {
      const t = templates[key];
      if (typeof t !== 'object' || t === null) {
        fail(`template "${key}" não é um objecto.`, 'email-template.json');
        continue;
      }
      const missing = REQUIRED.filter(f => !t[f]);
      if (missing.length) {
        fail(`template "${key}" sem ${missing.map(m => `\`${m}\``).join(', ')} — ` +
          `o modal de e-mail abre com o campo vazio.`, 'email-template.json');
      }
    }
    okUnless(tplMark, `${keys.length} templates com os campos obrigatórios`);
  }

  // ── Referência cruzada workflow ↔ templates ──────────────────────────────
  // Um emailKey sem template correspondente não dá erro: o openEmail() faz
  // `const t = T[key]; if(!t) return;` e o botão fica sem efeito.
  const defined = new Set(Object.keys(templates || {}));
  const dangling = [...usedEmailKeys].filter(k => !defined.has(k));
  const orphans = [...defined].filter(k => !usedEmailKeys.has(k));

  if (dangling.length) {
    fail(`emailKey sem template correspondente: ${dangling.join(', ')}. ` +
      `O botão "Ver template de e-mail" desses passos não faz nada.`, 'workflow-default.json');
  } else if (usedEmailKeys.size) {
    ok(`${usedEmailKeys.size} emailKeys do workflow resolvem todos`);
  }

  if (orphans.length) {
    warn(`templates definidos mas não usados por nenhum passo: ${orphans.join(', ')}.`,
      'email-template.json');
  }
}

// ── 3b. Endereços de e-mail nominais ─────────────────────────────────────────
// Este repositório é público e indexável. Endereços nominais de pessoas reais,
// juntos com a estrutura do processo e os templates que acompanham cada etapa,
// dão a um atacante o material para phishing dirigido a uma unidade de saúde:
// consegue reproduzir a linguagem, os remetentes e o momento exacto em que cada
// mensagem é esperada. É também uma questão de minimização de dados.
//
// A convenção do repositório já é identificar destinatários por função
// ("Serviço Clínico: Enfermeiro(a) gestor(a)", "Diretor(a) SF · …"): 12 dos 13
// templates faziam-no e dois eram a excepção. Esta verificação impede que a
// excepção volte — o achado A5 do SECURITY_AUDIT.md.
//
// A lista abaixo é de **caixas de função**, não de pessoas. Acrescentar aqui um
// endereço nominal derrota o propósito da verificação; o caminho certo é usar a
// função ("Farmacêutico(a) da CCIRA") ou um campo <FILL> a preencher no envio.
console.log('\nEndereços de e-mail');

const FUNCTION_MAILBOXES = new Set([
  'gestao.supermercados@ulsm.min-saude.pt',
  'tsdt.farmacia@ulsm.min-saude.pt',
  'farmacêuticos_ulsm@ulsm.min-saude.pt',
]);

// Inclui acentuados: os endereços do domínio usam-nos.
const EMAIL_RE = /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}/gu;
const nominalFound = new Map();

for (const name of ['email-template.json', 'workflow-default.json']) {
  const raw = await readFile(join(ROOT, name), 'utf8').catch(() => null);
  if (raw === null) continue;
  for (const addr of raw.match(EMAIL_RE) || []) {
    if (FUNCTION_MAILBOXES.has(addr.toLowerCase())) continue;
    if (!nominalFound.has(addr)) nominalFound.set(addr, name);
  }
}

if (nominalFound.size) {
  for (const [addr, where] of nominalFound) {
    fail(`endereço de e-mail não reconhecido como caixa de função: ${addr}. ` +
      `Se é de uma pessoa, substituir pela função (é o que os outros templates fazem) ` +
      `ou por um campo <FILL>; se é mesmo uma caixa de função, acrescentar a ` +
      `FUNCTION_MAILBOXES em tools/validate.mjs.`, where);
  }
} else {
  ok(`só caixas de função (${FUNCTION_MAILBOXES.size} conhecidas), sem endereços nominais`);
}

// ── 4. ulsm_supermercados_backup.json ────────────────────────────────────────
console.log('\nulsm_supermercados_backup.json');

const backup = await readJson('ulsm_supermercados_backup.json');

if (backup) {
  // normalizeBackup() aceita um array solto ou um envelope com `data`; fora
  // disso devolve null e o arranque descarta o ficheiro em silêncio.
  const list = Array.isArray(backup) ? backup : (Array.isArray(backup.data) ? backup.data : null);

  if (list === null) {
    fail('formato irreconhecível — esperava um array ou um envelope `{ data: [...] }`. ' +
      'O normalizeBackup() devolve null e o ecrã de arranque descarta o ficheiro sem aviso.',
      'ulsm_supermercados_backup.json');
  } else {
    ok(`envelope válido · ${list.length} processo(s)`);
    // O repositório é público. Não é um erro publicar dados aqui — é o que o
    // ecrã de arranque oferece como versão "publicada" — mas convém que seja
    // uma decisão consciente e não um commit distraído.
    if (list.length > 0) {
      warn(`contém ${list.length} processo(s) e o repositório é público — ` +
        `confirmar que estes dados podem mesmo ser divulgados.`, 'ulsm_supermercados_backup.json');
    }
  }
}

// ── 5. manifest.webmanifest ──────────────────────────────────────────────────
// Um ícone em falta não dá erro visível: a instalação no ecrã inicial falha ou
// usa um genérico, e ninguém repara até tentar instalar.
console.log('\nmanifest.webmanifest');

const manifest = await readJson('manifest.webmanifest');

if (manifest) {
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  if (icons.length === 0) {
    fail('manifest sem ícones.', 'manifest.webmanifest');
  } else {
    const iconMark = mark();
    for (const icon of icons) {
      if (!icon.src) { fail('ícone sem `src` no manifest.', 'manifest.webmanifest'); continue; }
      if (!(await exists(icon.src))) {
        fail(`ícone referenciado no manifest não existe: ${icon.src}`, 'manifest.webmanifest');
      }
    }
    okUnless(iconMark, `${icons.length} ícones referenciados existem`);
  }
  if (!manifest.name || !manifest.start_url) {
    fail('manifest sem `name` ou `start_url`.', 'manifest.webmanifest');
  }
}

// Referenciado directamente no <head>, fora do manifest.
if (!(await exists('apple-touch-icon.png'))) {
  fail('apple-touch-icon.png não existe — está referenciado no <head> de index.html.');
}

// ── Resultado ────────────────────────────────────────────────────────────────
console.log('');
if (failures > 0) {
  console.error(`✗ validação falhou: ${failures} erro(s)` +
    (warnings ? `, ${warnings} aviso(s)` : '') + '\n');
  process.exit(1);
}
console.log(`✓ ficheiros servidos válidos` + (warnings ? ` (${warnings} aviso(s))` : '') + '\n');
