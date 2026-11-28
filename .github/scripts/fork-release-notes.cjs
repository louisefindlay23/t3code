// Prints the "Fork changes" release-note section from `Release-Note: <Section>: <text>`
// trailers on fork commits not yet in upstream. Commits without the trailer (CI, fixes,
// fork-only plumbing) stay out of the notes. Usage: node fork-release-notes.cjs <base> [head]
const { execFileSync } = require("node:child_process");

const SECTIONS = ["Mobile", "Desktop", "Server"];

function parse(log) {
  const bySection = new Map();
  for (const line of log.split("\n").filter(Boolean)) {
    const match = /^(\w+): (.+)$/.exec(line);
    if (!match || !SECTIONS.includes(match[1])) continue;
    bySection.set(match[1], [...(bySection.get(match[1]) ?? []), match[2]]);
  }
  return SECTIONS.filter((name) => bySection.has(name))
    .map(
      (name) =>
        `### ${name}\n${bySection
          .get(name)
          .map((text) => `- ${text}`)
          .join("\n")}`,
    )
    .join("\n\n");
}

if (require.main === module) {
  const [base, head = "HEAD"] = process.argv.slice(2);
  const log = execFileSync(
    "git",
    [
      "log",
      "--no-merges",
      "--reverse",
      "--format=%(trailers:key=Release-Note,valueonly)",
      `${base}..${head}`,
    ],
    { encoding: "utf8" },
  );
  console.log(parse(log));
}

module.exports = { parse };
