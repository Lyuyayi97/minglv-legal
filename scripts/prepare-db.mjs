import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

const gunzipAsync = promisify(gunzip);
const root = resolve(import.meta.dirname, "..");
const databasePath = resolve(root, "data", "legal.sqlite");
const compressedPath = resolve(root, "data", "legal.sqlite.gz");

try {
  await access(databasePath);
  console.log("Legal database already exists. Skipping unpack.");
  process.exit(0);
} catch {
  // Git deployments contain the compressed database, not the raw file.
}

const compressed = await readFile(compressedPath);
const database = await gunzipAsync(compressed);
await writeFile(databasePath, database);

console.log(
  `Prepared ${(database.length / 1024 / 1024).toFixed(1)} MB legal database.`,
);
