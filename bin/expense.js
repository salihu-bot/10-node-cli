#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "../src/args.js";
import { importCsvFile } from "../src/csv.js";
import { addExpense, deleteExpense, editExpense, listExpenses } from "../src/expenses.js";
import { summarizeExpenses, toCsv } from "../src/report.js";
import { load, loadSettings, save, saveSettings } from "../src/store.js";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

function printHelp() {
  console.log(`Expense Tracker

Usage:
  node bin/expense.js add --amount 2500 --category food --note "lunch" [--date YYYY-MM-DD]
  node bin/expense.js list [--category food] [--month YYYY-MM]
  node bin/expense.js edit --id <id> [--amount 3000] [--category food] [--note "dinner"] [--date YYYY-MM-DD]
  node bin/expense.js delete --id <id>
  node bin/expense.js summary [--month YYYY-MM] (defaults to the current month)
  node bin/expense.js budget --set 50000
  node bin/expense.js export --format csv --out expenses.csv
  node bin/expense.js import --file bank.csv
  node bin/expense.js list --no-color
  node bin/expense.js help`);
  console.log("\n--no-color disables ANSI colors. Colors are otherwise used only in TTY output.");
  console.log("CSV import streams rows instead of loading the whole file into memory, which helps with large files.");
}

const colorEnabled = Boolean(process.stdout.isTTY && !process.argv.includes("--no-color"));
const colors = {
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  red: "\u001b[31m",
  yellow: "\u001b[33m",
  reset: "\u001b[0m",
};

function paint(value, color) {
  const text = String(value);
  return colorEnabled ? `${colors[color]}${text}${colors.reset}` : text;
}

function requireId(options) {
  if (!options.id) {
    throw new Error("The --id option is required.");
  }
  return options.id;
}

function shortId(id) {
  return String(id).slice(0, 8);
}

function rejectUnknownOptions(options, allowed) {
  const unknown = Object.keys(options).filter((option) => !allowed.includes(option));
  if (unknown.length > 0) {
    throw new Error(`Unknown option${unknown.length > 1 ? "s" : ""}: ${unknown.map((name) => `--${name}`).join(", ")}`);
  }
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  delete options["no-color"];

  if (command === "help") {
    printHelp();
    return;
  }

  if (command === "add") {
    rejectUnknownOptions(options, ["amount", "category", "note", "date"]);
    const expenses = await load();
    const updated = addExpense(expenses, {
      ...options,
      id: randomUUID(),
      date: options.date ?? new Date().toISOString().slice(0, 10),
    });
    await save(updated);
    const expense = updated[updated.length - 1];
    console.log(paint(`Added ${currency.format(expense.amount)} for ${expense.category} on ${expense.date} (ID: ${shortId(expense.id)}).`, "green"));
    return;
  }

  if (command === "list") {
    rejectUnknownOptions(options, ["category", "month"]);
    const expenses = listExpenses(await load(), options);
    console.table(
      expenses.map(({ id, date, category, note, amount }) => ({
        ID: shortId(id),
        Date: date,
        Category: paint(category, "cyan"),
        Note: note,
        Amount: currency.format(amount),
      })),
    );
    return;
  }

  if (command === "delete") {
    rejectUnknownOptions(options, ["id"]);
    const id = requireId(options);
    const expenses = await load();
    const expense = expenses.find((entry) => String(entry.id).startsWith(id));
    const updated = deleteExpense(expenses, id);
    await save(updated);
    console.log(paint(`Deleted expense ${shortId(expense.id)}.`, "green"));
    return;
  }

  if (command === "edit") {
    rejectUnknownOptions(options, ["id", "amount", "category", "note", "date"]);
    const id = requireId(options);
    const expenses = await load();
    const expense = expenses.find((entry) => String(entry.id).startsWith(id));
    const updates = { ...options };
    delete updates.id;
    const updated = editExpense(expenses, id, updates);
    await save(updated);
    console.log(paint(`Updated expense ${shortId(expense.id)}.`, "green"));
    return;
  }

  if (command === "budget") {
    rejectUnknownOptions(options, ["set"]);
    if (options.set === undefined) {
      throw new Error("Use budget --set <amount> to set the monthly budget.");
    }
    const budget = Number(options.set);
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new Error("Budget must be a positive number.");
    }
    const settings = { ...(await loadSettings()), budget };
    await saveSettings(settings);
    console.log(paint(`Monthly budget set to ${currency.format(budget)}.`, "green"));
    return;
  }

  if (command === "summary") {
    rejectUnknownOptions(options, ["month"]);
    const settings = await loadSettings();
    const summary = summarizeExpenses(await load(), {
      month: options.month ?? new Date().toISOString().slice(0, 7),
      budget: settings.budget,
    });
    console.log(paint(`Expense Summary${summary.month ? ` (${summary.month})` : ""}`, "cyan"));
    console.log(`Total spent: ${currency.format(summary.total)}`);
    console.log("Spending by category:");
    if (summary.categories.length === 0) {
      console.log("  No expenses found.");
    } else {
      for (const category of summary.categories) {
        console.log(`  ${category.category}: ${paint(category.bar, "green")} ${currency.format(category.amount)}`);
      }
    }
    if (summary.biggest) {
      console.log(
        `Biggest expense: ${currency.format(summary.biggest.amount)} for ${summary.biggest.category} on ${summary.biggest.date} (ID: ${shortId(summary.biggest.id)})`,
      );
    } else {
      console.log("Biggest expense: None");
    }
    if (summary.budgetStatus === "warning") {
      console.log(paint(`Warning: spending has reached 80% of your ${currency.format(summary.budget)} budget.`, "yellow"));
    } else if (summary.budgetStatus === "exceeded") {
      console.log(paint(`Warning: spending has reached or exceeded your ${currency.format(summary.budget)} budget.`, "red"));
    }
    return;
  }

  if (command === "export") {
    rejectUnknownOptions(options, ["format", "out"]);
    if (options.format !== "csv") {
      throw new Error('Export format must be "csv".');
    }
    if (!options.out) {
      throw new Error("The --out option is required.");
    }
    await writeFile(options.out, toCsv(await load()), "utf8");
    console.log(paint(`Exported expenses to ${options.out}.`, "green"));
    return;
  }

  if (command === "import") {
    rejectUnknownOptions(options, ["file"]);
    if (!options.file) {
      throw new Error("The --file option is required.");
    }
    const expenses = await load();
    const { imported, skipped } = await importCsvFile(options.file);
    await save([...expenses, ...imported]);
    for (const row of skipped) {
      console.warn(paint(`Skipped CSV line ${row.line}: ${row.reason}`, "yellow"));
    }
    console.log(
      paint(
        `Imported ${imported.length} expense${imported.length === 1 ? "" : "s"}; skipped ${skipped.length} row${skipped.length === 1 ? "" : "s"}.`,
        skipped.length ? "yellow" : "green",
      ),
    );
    return;
  }

  throw new Error(`Unknown command: ${command}. Run "node bin/expense.js help" for usage.`);
}

main().catch((error) => {
  const message =
    error?.code === "ENOENT"
      ? `File not found: ${error.path ?? "requested path"}`
      : error instanceof SyntaxError
        ? "Could not read the data file. Check its JSON syntax."
        : error instanceof Error
          ? error.message
          : String(error);
  console.error(paint(`Error: ${message}`, "red"));
  if (process.env.DEBUG === "1" && error instanceof Error) {
    console.error(error.stack);
  }
  process.exitCode = 1;
});
