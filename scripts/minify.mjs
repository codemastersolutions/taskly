import { build } from "esbuild";
import { promises as fs } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../dist/", import.meta.url));

async function listFilesRec(dir) {
  const files = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else files.push(p);
    }
  }
  return files;
}

async function minifyFile(absPath, { sourcemap }) {
  await build({
    entryPoints: [absPath],
    outfile: absPath,
    minify: true,
    bundle: false,
    platform: "node",
    format: "esm",
    target: ["node20"],
    sourcemap,
    legalComments: "none",
    allowOverwrite: true,
  });
}

async function removeAllSourceMaps(allFiles) {
  const maps = allFiles.filter((f) => f.endsWith(".map"));
  for (const m of maps) {
    try {
      await fs.rm(m, { force: true });
    } catch (err) {
      console.error(
        `[minify] Failed to remove map ${relative(distDir, m)}:`,
        err
      );
      process.exitCode = 1;
    }
  }
}

async function main() {
  const preserveMaps = process.argv.includes("--preserve-maps");
  const allFiles = await listFilesRec(distDir);
  const jsFiles = allFiles.filter((f) => f.endsWith(".js"));
  for (const f of jsFiles) {
    const rel = relative(distDir, f);
    try {
      await minifyFile(f, { sourcemap: preserveMaps });
    } catch (err) {
      console.error(`[minify] Failed for ${rel}:`, err);
      process.exitCode = 1;
    }
  }
  if (!preserveMaps) {
    await removeAllSourceMaps(allFiles);
  }
}

main();
