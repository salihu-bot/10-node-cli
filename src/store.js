import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dataFile = resolve(dirname(fileURLToPath(import.meta.url)), "../data/expenses.json");

export async function load() {
  await mkdir(dirname(dataFile), { recursive: true });

  let contents;
  try {
    contents = await readFile(dataFile, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await writeFile(dataFile, "[]\n", { flag: "wx" }).catch((writeError) => {
      if (writeError.code !== "EEXIST") {
        throw writeError;
      }
    });
    contents = await readFile(dataFile, "utf8");
  }

  const expenses = JSON.parse(contents);
  if (!Array.isArray(expenses)) {
    throw new Error("Expense data must be a JSON array.");
  }
  return expenses;
}

export async function save(expenses) {
  if (!Array.isArray(expenses)) {
    throw new TypeError("Expenses must be an array.");
  }
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(expenses, null, 2)}\n`, "utf8");
}
