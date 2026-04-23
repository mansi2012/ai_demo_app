import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { orchestrate } from './orchestrator.js';

async function main() {
  const provider = (process.env.LLM_PROVIDER ?? 'claude').toLowerCase();
  const requiredKey = {
    gemini: 'GEMINI_API_KEY',
    claude: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    ollama: null,
  }[provider];

  if (requiredKey === undefined) {
    console.error(`Error: Unsupported LLM_PROVIDER=${provider}.`);
    process.exit(1);
  }

  if (requiredKey && !process.env[requiredKey]) {
    console.error(`Error: ${requiredKey} is not set for LLM_PROVIDER=${provider}. Add it to .env.`);
    process.exit(1);
  }

  // Task can come from CLI arg or TASK env var
  const task = process.argv[2] ?? process.env.TASK;

  if (!task) {
    console.error('Usage: node index.js "<task description>"');
    console.error('   or: TASK="..." node index.js');
    process.exit(1);
  }

  console.log(`\n Task: ${task}\n`);

  try {
    const { formatted, plan } = await orchestrate(task);

    // Print to console
    console.log('\n' + formatted);

    // Save to file
    const outDir = './outputs';
    fs.mkdirSync(outDir, { recursive: true });

    const label = task.replace(/\s+/g, '_').slice(0, 50);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFile = path.join(outDir, `${label}-${timestamp}.json`);
    const mdFile = path.join(outDir, `${label}-${timestamp}.md`);

    fs.writeFileSync(jsonFile, JSON.stringify(plan, null, 2), 'utf-8');
    fs.writeFileSync(mdFile, formatted, 'utf-8');

    console.log(`\nOutputs saved:`);
    console.log(`  JSON plan → ${jsonFile}`);
    console.log(`  Markdown  → ${mdFile}\n`);
  } catch (err) {
    console.error('\n[error]', err.message ?? err);
    process.exit(1);
  }
}

main();
