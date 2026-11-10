import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dataFile = resolve(dirname(fileURLToPath(import.meta.url)), "../data/expenses.json");
const settingsFile = resolve(dirname(fileURLToPath(import.meta.url)), "../data/settings.json");

async function loadJson(file, defaultContents, description) {
  await mkdir(dirname(file), { recursive: true });

  let contents;
  try {
    contents = await readFile(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await writeFile(file, `${JSON.stringify(defaultContents, null, 2)}\n`, { flag: "wx" }).catch((writeError) => {
      if (writeError.code !== "EEXIST") {
        throw writeError;
      }
    });
    contents = await readFile(file, "utf8");
  }

  const value = JSON.parse(contents);
  if (description === "expense data" && !Array.isArray(value)) {
    throw new Error("Expense data must be a JSON array.");
  }
  if (description === "settings" && (typeof value !== "object" || value === null || Array.isArray(value))) {
    throw new Error("Settings data must be a JSON object.");
  }
  return value;
}

export async function load() {
  return loadJson(dataFile, [], "expense data");
}

export async function save(expenses) {
  if (!Array.isArray(expenses)) {
    throw new TypeError("Expenses must be an array.");
  }
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(expenses, null, 2)}\n`, "utf8");
}

export async function loadSettings() {
  return loadJson(settingsFile, {}, "settings");
}

export async function saveSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new TypeError("Settings must be an object.");
  }
  await mkdir(dirname(settingsFile), { recursive: true });
  await writeFile(settingsFile, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}
