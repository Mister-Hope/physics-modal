// oxlint-disable no-console
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const TEMPLATE = join(ROOT, "index.html");

interface ProjectMeta {
  title: string;
  description: string;
}

const projects = readdirSync(ROOT, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)
  .filter((name) => existsSync(join(ROOT, name, "meta.json")))
  .map((dir): { dir: string; meta: ProjectMeta } => ({
    dir,
    meta: JSON.parse(readFileSync(join(ROOT, dir, "meta.json"), "utf-8")) as ProjectMeta,
  }));

console.log("Cleaning dist directory...");
rmSync(DIST, { recursive: true, force: true });

for (const { dir } of projects) {
  console.log(`Building ${dir}...`);
  execSync(`pnpm run ${dir}:build`, { stdio: "inherit" });
}

console.log("Combining build outputs...");
mkdirSync(DIST, { recursive: true });

for (const { dir } of projects) {
  const src = join(ROOT, dir, "dist");
  const dest = join(DIST, dir);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

console.log("Generating index.html...");
const template = readFileSync(TEMPLATE, "utf-8");
const listItems = projects
  .map(
    ({ dir, meta }) =>
      `        <li><a href="${dir}/index.html"><h2>${meta.title}</h2><p>${meta.description}</p></a></li>`,
  )
  .join("\n");
const result = template.replace("<!-- modal-list -->", `\n${listItems}\n      `);
writeFileSync(join(DIST, "index.html"), result);

console.log("Build complete!");
