import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const root = resolve(import.meta.dirname, "..");
const databasePath = resolve(root, "data", "legal.sqlite");
const compressedPath = resolve(root, "data", "legal.sqlite.gz");

const database = await readFile(databasePath);
const compressed = await gzipAsync(database, { level: 9 });
await writeFile(compressedPath, compressed);

console.log(
  `Packed ${(database.length / 1024 / 1024).toFixed(1)} MB database into ${(compressed.length / 1024 / 1024).toFixed(1)} MB.`,
);
