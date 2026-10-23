// Fetches the logos of the AI engines the Process map offers from the published @lobehub/icons-static-svg package (MIT,
// pinned version) and writes src/components/sites/affectui-agent-tree/ai-marks.generated.ts. Static SVG only: markup is
// checked (drawing elements only, no scripting or links), gradient ids are made unique per use, and nothing is drawn by hand.
// Usage: node scripts/forensics/agent-tree-ai-marks.mjs
import fs from 'node:fs/promises';

const version = '1.95.1';
// our id -> file in the package. The colored variant is used where the package has one, the single-color mark otherwise.
const marks = {
  // the engines the Process map first offered
  kimi: 'kimi-color', codex: 'codex-color', claudecode: 'claudecode-color', qwen: 'qwen-color', deepseek: 'deepseek-color',
  mistral: 'mistral-color', ollama: 'ollama', hermes: 'hermesagent',
  // coding agents
  cursor: 'cursor', githubcopilot: 'githubcopilot', copilot: 'copilot-color', windsurf: 'windsurf', cline: 'cline', roocode: 'roocode',
  kilocode: 'kilocode', devin: 'devin-color', openhands: 'openhands-color', goose: 'goose', amp: 'amp-color', junie: 'junie-color',
  kiro: 'kiro-color', trae: 'trae-color', qoder: 'qoder-color', antigravity: 'antigravity-color', geminicli: 'geminicli-color',
  opencode: 'opencode', openclaw: 'openclaw-color', manus: 'manus', codebuddy: 'codebuddy-color', zencoder: 'zencoder-color',
  replit: 'replit-color', lovable: 'lovable-color', v0: 'v0', codegeex: 'codegeex-color',
  // agent frameworks and builders
  langchain: 'langchain-color', langgraph: 'langgraph-color', crewai: 'crewai-color', mastra: 'mastra', pydanticai: 'pydanticai-color',
  metagpt: 'metagpt', llamaindex: 'llamaindex-color', n8n: 'n8n-color', dify: 'dify-color', coze: 'coze', openwebui: 'openwebui', phidata: 'phidata-color',
  // hosted and open models
  grok: 'grok', meta: 'meta-color', cohere: 'cohere-color', perplexity: 'perplexity-color', zhipu: 'zhipu-color', zai: 'zai',
  minimax: 'minimax-color', doubao: 'doubao-color', yi: 'yi-color', baichuan: 'baichuan-color', stepfun: 'stepfun-color',
  hunyuan: 'hunyuan-color', wenxin: 'wenxin-color', spark: 'spark-color', internlm: 'internlm-color', nvidia: 'nvidia-color',
  microsoft: 'microsoft-color', ai21: 'ai21', reka: 'reka', nousresearch: 'nousresearch', gemma: 'gemma-color', moonshot: 'moonshot',
  deepmind: 'deepmind-color', poe: 'poe-color', inflection: 'inflection',
  // runtimes, routers and clouds
  lmstudio: 'lmstudio', vllm: 'vllm-color', huggingface: 'huggingface-color', groq: 'groq', openrouter: 'openrouter', together: 'together-color',
  fireworks: 'fireworks-color', cerebras: 'cerebras-color', sambanova: 'sambanova-color', deepinfra: 'deepinfra-color', replicate: 'replicate',
  bedrock: 'bedrock-color', vertexai: 'vertexai-color', azure: 'azureai-color', workersai: 'workersai-color', xinference: 'xinference-color', unsloth: 'unsloth-color',
};
const whiteInk = new Set(['kimi']);
const target = 'src/components/sites/affectui-agent-tree/ai-marks.generated.ts';
// Drawing elements, gradients, clip paths, masks and filters that only refer to ids inside the same SVG (no <use>, <image>, <a>, <script>, <style>).
const allowed = new Set(['path', 'g', 'defs', 'lineargradient', 'radialgradient', 'stop', 'rect', 'circle', 'ellipse', 'clippath', 'mask', 'polygon', 'polyline', 'line', 'filter', 'fegaussianblur', 'feoffset', 'feblend', 'fecolormatrix', 'feflood', 'fecomposite', 'femerge', 'femergenode']);

const meta = await (await fetch(`https://registry.npmjs.org/@lobehub/icons-static-svg/${version}`)).json();
if (meta.license !== 'MIT') throw new Error(`Unexpected license ${meta.license}`);

const entries = [];
for (const [id, file] of Object.entries(marks)) {
  const url = `https://unpkg.com/@lobehub/icons-static-svg@${version}/icons/${file}.svg`;
  const response = await fetch(url);
  if (!response.ok) { console.warn(`skipped ${id}: ${url} -> ${response.status}`); delete marks[id]; continue; }
  const svg = await response.text();
  const root = svg.match(/<svg\b([^>]*)>/)?.[1] ?? '';
  const viewBox = root.match(/viewBox="([^"]+)"/)?.[1];
  const title = svg.match(/<title>([^<]+)<\/title>/)?.[1];
  let body = svg.replace(/^[\s\S]*?<title>[^<]*<\/title>/, '').replace(/<\/svg>\s*$/, '');
  const unexpected = [...body.matchAll(/<\s*([a-zA-Z][\w-]*)/g)].map(match => match[1]).find(tag => !allowed.has(tag.toLowerCase()));
  const problem = !viewBox || !title || !body.includes('<path') ? 'unexpected markup'
    : unexpected ? `unexpected <${unexpected}>`
    : /\bon\w+\s*=|javascript:|href\s*=|<script|style\s*=/i.test(body) ? 'scripting, links or styles in SVG' : '';
  if (problem) { console.warn(`skipped ${id} (${file}): ${problem}`); delete marks[id]; continue; }
  // A gradient id has to be unique in the document, and one logo can appear many times: the renderer swaps this token for a per-use id.
  for (const [, gradient] of body.matchAll(/\bid="([^"]+)"/g)) body = body.replaceAll(`id="${gradient}"`, `id="__uid__-${gradient}"`).replaceAll(`url(#${gradient})`, `url(#__uid__-${gradient})`);
  // The color variant of these logos draws their ink in white, which is meant for a dark card: here it follows the text color instead.
  if (whiteInk.has(id)) body = body.replaceAll('fill="#fff"', 'fill="currentColor"');
  const fill = root.match(/\bfill="([^"]+)"/)?.[1] ?? null;
  const fillRule = root.match(/fill-rule="([^"]+)"/)?.[1] ?? null;
  entries.push(`  ${id}: { title: ${JSON.stringify(title)}, viewBox: ${JSON.stringify(viewBox)}, fill: ${JSON.stringify(fill)}, fillRule: ${JSON.stringify(fillRule)}, mono: ${fill === 'currentColor' || whiteInk.has(id)}, html: ${JSON.stringify(body)} },`);
}

await fs.writeFile(target, `// Generated by scripts/forensics/agent-tree-ai-marks.mjs. Do not edit by hand.
// Source: @lobehub/icons-static-svg@${version} (MIT, https://github.com/lobehub/lobe-icons). \`mono\` marks the single-color logos that follow
// the text color (white in dark mode); the others keep their brand colors. \`__uid__\` in a gradient id is replaced by a per-use id.
export type AiMarkId = ${Object.keys(marks).map(id => JSON.stringify(id)).join(' | ')};
export interface AiMark { title: string; viewBox: string; fill: string | null; fillRule: string | null; mono: boolean; html: string }
export const aiMarks: Record<AiMarkId, AiMark> = {
${entries.join('\n')}
};
`);
console.log(`Wrote ${entries.length} marks to ${target}`);
