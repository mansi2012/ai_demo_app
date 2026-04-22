import readline from "node:readline";

export function askYesNo(question, defaultValue = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const suffix = defaultValue ? " (Y/n) " : " (y/N) ";
    rl.question(question + suffix, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === "") return resolve(defaultValue);
      resolve(a === "y" || a === "yes");
    });
  });
}

export function askText(question, defaultValue = "") {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const suffix = defaultValue ? ` [${defaultValue}] ` : " ";
    rl.question(question + suffix, (answer) => {
      rl.close();
      const a = answer.trim();
      resolve(a === "" ? defaultValue : a);
    });
  });
}

const CHOICE_LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/**
 * Ask a multiple-choice question. Shows each option as (a), (b), (c), (d) plus
 * (o) Other for a free-text fallback. Returns the chosen option text or the
 * user's custom input. Always resolves to a non-empty string.
 */
export function askChoice(question, options = []) {
  const bounded = Array.isArray(options)
    ? options.filter((o) => typeof o === "string" && o.trim() !== "").slice(0, CHOICE_LETTERS.length)
    : [];

  const lines = [`\n${question}`];
  bounded.forEach((opt, i) => lines.push(`  (${CHOICE_LETTERS[i]}) ${opt}`));
  lines.push(`  (o) Other — type your own answer`);
  const prompt = lines.join("\n") + "\nYour choice: ";

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer) => {
      const a = answer.trim().toLowerCase();
      const idx = CHOICE_LETTERS.indexOf(a);
      if (idx >= 0 && idx < bounded.length) {
        rl.close();
        return resolve(bounded[idx]);
      }
      // "o", empty, or anything unrecognised → ask for free text on the SAME rl
      rl.question("  Please type your answer: ", (custom) => {
        rl.close();
        resolve(custom.trim() || "(no answer provided)");
      });
    });
  });
}

/**
 * Ask a yes/no question with an (o) Other escape hatch. Returns "Yes", "No",
 * or the user's typed response.
 */
export function askYesNoOther(question) {
  const prompt =
    `\n${question}\n` +
    `  (y) Yes\n` +
    `  (n) No\n` +
    `  (o) Other — type your own answer\n` +
    `Your choice: `;

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer) => {
      const a = answer.trim().toLowerCase();
      if (a === "y" || a === "yes") {
        rl.close();
        return resolve("Yes");
      }
      if (a === "n" || a === "no") {
        rl.close();
        return resolve("No");
      }
      rl.question("  Please type your answer: ", (custom) => {
        rl.close();
        resolve(custom.trim() || "(no answer provided)");
      });
    });
  });
}
