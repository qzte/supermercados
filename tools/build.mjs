#!/usr/bin/env node
/**
 * Build da aplicação ULSM · Gestão de Supermercados.
 *
 *   src/index.src.html  ──build──>  index.html
 *                                   ulsm_supermercados_<versão>.html
 *
 * O ficheiro-fonte contém JSX e carrega o Babel no browser, o que o mantém
 * directamente abrível para desenvolvimento. Este build faz a tradução do JSX
 * uma vez, em vez de a repetir em cada carregamento de página de cada
 * utilizador, e remove o Babel (2,8 MB / 589 KB comprimidos) do que é servido.
 *
 * Uso:
 *   node tools/build.mjs           gera os ficheiros
 *   node tools/build.mjs --check   apenas verifica se estão actualizados (CI)
 */

import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { transformAsync } from '@babel/core';
import presetReact from '@babel/preset-react';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src', 'index.src.html');
const OUT = join(ROOT, 'index.html');
const CHECK = process.argv.includes('--check');

/** Falha com uma mensagem accionável em vez de produzir silenciosamente lixo. */
function need(condition, message) {
  if (!condition) {
    console.error('\n✗ build falhou: ' + message + '\n');
    process.exit(1);
  }
}

/** Substitui uma única ocorrência, garantindo que o padrão existe e é único. */
function replaceOnce(html, pattern, replacement, label) {
  const matches = html.match(new RegExp(pattern.source, pattern.flags.replace('g', '') + 'g'));
  need(matches && matches.length === 1,
    `esperava exactamente 1 ocorrência de ${label}, encontrei ${matches ? matches.length : 0}. ` +
    `O ficheiro-fonte mudou de forma incompatível com o build.`);
  return html.replace(pattern, replacement);
}

const source = await readFile(SRC, 'utf8');

// ── 1. Versão ────────────────────────────────────────────────────────────────
// A versão é a que está no código; o nome do ficheiro arquivado deriva dela,
// evitando que os dois divirjam como já aconteceu manualmente.
const versionMatch = source.match(/const APP_VERSION = "([\d.]+)";/);
need(versionMatch, 'não encontrei `const APP_VERSION = "x.y.z";` no ficheiro-fonte.');
const version = versionMatch[1];
const archiveName = `ulsm_supermercados_${version.replace(/\./g, '_')}.html`;

const badgeMatch = source.match(/id="app-version-badge"[^>]*>v([\d.]+)</);
need(badgeMatch, 'não encontrei o badge de versão no cabeçalho.');
need(badgeMatch[1] === version,
  `a versão no badge (v${badgeMatch[1]}) e em APP_VERSION (${version}) não coincidem.`);

// ── 1b. Validar o workflow publicado ─────────────────────────────────────────
// O workflow-default.json já esteve em esquema legado (fases sem id, passos sem
// emailKey/instructions) durante meses. Nesse estado o loadWorkflow ignora-o em
// silêncio e a app usa o workflow embutido — ou seja, o ficheiro parecia estar a
// ser servido mas não era. Esta verificação faz o build falhar em vez de deixar
// isso repetir-se sem ninguém dar por ela.
const workflowPath = join(ROOT, 'workflow-default.json');
const workflowRaw = await readFile(workflowPath, 'utf8').catch(() => null);
need(workflowRaw !== null, 'workflow-default.json não existe.');

let workflow;
try {
  workflow = JSON.parse(workflowRaw);
} catch (e) {
  need(false, `workflow-default.json não é JSON válido: ${e.message}`);
}

need(Array.isArray(workflow.phases) && workflow.phases.length > 0,
  'workflow-default.json não tem fases.');

// Mesma regra de detecção que o loadWorkflow e o ecrã de arranque aplicam.
const workflowIsFullFormat = workflow.phases.some(ph =>
  Number.isInteger(ph.id) ||
  (ph.steps || []).some(st => st.emailKey !== undefined || st.instructions !== undefined));
need(workflowIsFullFormat,
  'workflow-default.json está em esquema legado (fases sem `id`, passos sem `emailKey`/`instructions`). ' +
  'A aplicação ignora-o nesse estado e usa o workflow embutido — o ficheiro seria servido mas nunca lido. ' +
  'Exportar uma versão actual a partir do editor de workflow.');

const workflowSteps = workflow.phases.reduce((n, ph) => n + (ph.steps || []).length, 0);
need(workflowSteps > 0, 'workflow-default.json não tem passos.');

// ── 2. Compilar o bloco JSX ──────────────────────────────────────────────────
const jsxBlock = /<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/;
const jsxMatch = source.match(jsxBlock);
need(jsxMatch, 'não encontrei o bloco <script type="text/babel">.');

const compiled = await transformAsync(jsxMatch[1], {
  presets: [[presetReact, {}]],
  babelrc: false,
  configFile: false,
  compact: false,
  sourceType: 'script',
  filename: 'index.src.html.jsx',
});
need(compiled && compiled.code, 'o Babel não devolveu código compilado.');

// `</script>` dentro de uma string do código compilado fecharia a tag mais cedo.
const safeCode = compiled.code.replace(/<\/script>/gi, '<\\/script>');

let html = replaceOnce(source, jsxBlock, () => `<script>\n${safeCode}\n</script>`, 'bloco JSX');

// ── 3. Remover o Babel do que é servido ──────────────────────────────────────
html = replaceOnce(
  html,
  /^<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/babel-standalone[^"]*"[^>]*><\/script>\n/m,
  '',
  'tag <script> do Babel',
);

// O guarda de arranque deixa de poder exigir window.Babel, que já não existe.
html = replaceOnce(
  html,
  /if \(!window\.React \|\| !window\.ReactDOM \|\| !window\.Babel\) \{/,
  'if (!window.React || !window.ReactDOM) {',
  'verificação de bibliotecas no watchdog',
);
html = replaceOnce(
  html,
  /'Não foi possível carregar as bibliotecas externas \(React\/Babel\)\. '/,
  "'Não foi possível carregar as bibliotecas externas (React). '",
  'mensagem de erro do watchdog',
);

// ── 4. Marca de proveniência ─────────────────────────────────────────────────
html = replaceOnce(
  html,
  /<!DOCTYPE html>\n/,
  '<!DOCTYPE html>\n<!-- GERADO AUTOMATICAMENTE por tools/build.mjs a partir de src/index.src.html.\n' +
  '     NÃO EDITAR ESTE FICHEIRO À MÃO — as alterações são perdidas no próximo build. -->\n',
  'DOCTYPE',
);

// ── 5. Escrever ou verificar ─────────────────────────────────────────────────
const existingArchives = (await readdir(ROOT))
  .filter(f => /^ulsm_supermercados_\d+_\d+_\d+\.html$/.test(f));
const staleArchives = existingArchives.filter(f => f !== archiveName);

if (CHECK) {
  const current = await readFile(OUT, 'utf8').catch(() => null);
  need(current !== null, 'index.html não existe. Corre `npm run build`.');
  need(current === html,
    'index.html está desactualizado face a src/index.src.html. Corre `npm run build` e faz commit.');
  const archive = await readFile(join(ROOT, archiveName), 'utf8').catch(() => null);
  need(archive === html, `${archiveName} não corresponde ao index.html. Corre \`npm run build\`.`);
  need(staleArchives.length === 0,
    `ficheiros de versões antigas por remover: ${staleArchives.join(', ')}. Corre \`npm run build\`.`);
  console.log(`✓ ficheiros gerados estão actualizados (v${version}); ` +
    `workflow-default.json com ${workflow.phases.length} fases · ${workflowSteps} passos`);
} else {
  await writeFile(OUT, html);
  await writeFile(join(ROOT, archiveName), html);
  for (const stale of staleArchives) await unlink(join(ROOT, stale));

  const kb = n => (n / 1024).toFixed(0) + ' KB';
  console.log(`✓ v${version}`);
  console.log(`  JSX compilado   ${kb(jsxMatch[1].length)} → ${kb(safeCode.length)}`);
  console.log(`  index.html      ${kb(source.length)} → ${kb(html.length)} (Babel removido do runtime)`);
  console.log(`  arquivo         ${archiveName}`);
  console.log(`  workflow        ${workflow.phases.length} fases · ${workflowSteps} passos (esquema actual)`);
  if (staleArchives.length) console.log(`  removido        ${staleArchives.join(', ')}`);
}
