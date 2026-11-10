#!/usr/bin/env node

import { parseArgs } from "../src/args.js";
import { addExpense, listExpenses } from "../src/expenses.js";
import { load, save } from "../src/store.js";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

function printHelp() {
  console.log(`Expense Tracker

Usage:
  node bin/expense.js add --amount 2500 --category food --note "lunch" [--date YYYY-MM-DD]
  node bin/expense.js list [--category food] [--month YYYY-MM]
  node bin/expense.js help`);
}

function rejectUnknownOptions(options, allowed) {
  const unknown = Object.keys(options).filter((option) => !allowed.includes(option));
  if (unknown.length > 0) {
    throw new Error(`Unknown option${unknown.length > 1 ? "s" : ""}: ${unknown.map((name) => `--${name}`).join(", ")}`);
  }
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === "help") {
    printHelp();
    return;
  }

  if (command === "add") {
    rejectUnknownOptions(options, ["amount", "category", "note", "date"]);
    const expenses = await load();
    const updated = addExpense(expenses, {
      ...options,
      date: options.date ?? new Date().toISOString().slice(0, 10),
    });
    await save(updated);
    const expense = updated[updated.length - 1];
    console.log(`Added ${currency.format(expense.amount)} for ${expense.category} on ${expense.date}.`);
    return;
  }

  if (command === "list") {
    rejectUnknownOptions(options, ["category", "month"]);
    const expenses = listExpenses(await load(), options);
    console.table(
      expenses.map(({ id, date, category, note, amount }) => ({
        ID: id,
        Date: date,
        Category: category,
        Note: note,
        Amount: currency.format(amount),
      })),
    );
    return;
  }

  throw new Error(`Unknown command: ${command}. Run "node bin/expense.js help" for usage.`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
