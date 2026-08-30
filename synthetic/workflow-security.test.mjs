import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const SYNTHETIC_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_DIRECTORY = join(SYNTHETIC_DIRECTORY, "..", ".github", "workflows");
const IMMUTABLE_ACTION = /^[\w.-]+\/[\w.-]+@[a-f0-9]{40}(?:\s+#\s+[^\r\n]+)?$/u;

async function workflows() {
  const names = (await readdir(WORKFLOW_DIRECTORY))
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .sort();
  return Promise.all(names.map(async (name) => ({
    name,
    source: await readFile(join(WORKFLOW_DIRECTORY, name), "utf8"),
  })));
}

test("every third-party workflow action is pinned to an immutable commit", async () => {
  const failures = [];
  for (const workflow of await workflows()) {
    for (const [index, line] of workflow.source.split(/\r?\n/u).entries()) {
      const match = line.match(/^\s*-?\s*uses:\s*(.+?)\s*$/u);
      if (match && !IMMUTABLE_ACTION.test(match[1])) {
        failures.push(`${workflow.name}:${index + 1}: ${match[1]}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("the locked monitor contract runs when any workflow changes", async () => {
  const source = await readFile(
    join(WORKFLOW_DIRECTORY, "core-beta-synthetic-contract.yml"),
    "utf8",
  );
  assert.match(source, /- "\.github\/workflows\/\*\*"/u);
});

test("every workflow declares a deny-by-default token policy", async () => {
  const failures = (await workflows())
    .filter(({ source }) => !/\npermissions: \{\}\n/u.test(source))
    .map(({ name }) => name);
  assert.deepEqual(failures, []);
});

test("every workflow job opts into an explicit token policy", async () => {
  const failures = [];
  for (const { name, source } of await workflows()) {
    const jobs = source.split(/\njobs:\n/u)[1];
    assert.ok(jobs, `${name} must declare jobs`);
    const headers = [...jobs.matchAll(/^  ([\w-]+):\n/gmu)];
    for (const [index, match] of headers.entries()) {
      const block = jobs.slice(match.index, headers[index + 1]?.index ?? jobs.length);
      if (!/^    permissions:/mu.test(block)) {
        failures.push(`${name}:${match[1]}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("the isolated monitor contains no PAT-bearing or template-rewriting jobs", async () => {
  const values = await workflows();
  assert.deepEqual(values.map(({ name }) => name), [
    "alert-drill.yml",
    "core-beta-synthetic-contract.yml",
    "core-beta-synthetic.yml",
  ]);
  for (const { name, source } of values) {
    assert.doesNotMatch(source, /GH_PAT|upptime|update-template/iu, name);
  }
});
