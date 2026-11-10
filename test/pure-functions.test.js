import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArgs } from "../src/args.js";
import { addExpense, deleteExpense, editExpense, listExpenses } from "../src/expenses.js";
import { summarizeExpenses, toCsv } from "../src/report.js";

const expenseInput = {
  id: "uuid-1",
  amount: "2500",
  category: " food ",
  note: " lunch ",
  date: "2026-11-03",
};

const sampleExpenses = [
  { id: "one", amount: 2500, category: "food", note: "Lunch", date: "2026-11-03" },
  { id: "two", amount: 5000, category: "rent", note: "Monthly", date: "2026-11-05" },
  { id: "three", amount: 1500, category: "food", note: "Snack", date: "2026-10-29" },
];

describe("parseArgs", () => {
  it("parses a command and separate option values", () => {
    assert.deepEqual(parseArgs(["add", "--amount", "2500", "--category", "food"]), {
      command: "add",
      options: { amount: "2500", category: "food" },
    });
  });

  it("parses equals-form options", () => {
    assert.deepEqual(parseArgs(["list", "--month=2026-11"]), {
      command: "list",
      options: { month: "2026-11" },
    });
  });

  it("parses --no-color as a valueless flag", () => {
    assert.deepEqual(parseArgs(["list", "--no-color"]), {
      command: "list",
      options: { "no-color": true },
    });
  });

  it("rejects a missing command", () => {
    assert.throws(() => parseArgs([]), /Missing command/);
  });

  it("rejects an option without a value", () => {
    assert.throws(() => parseArgs(["add", "--amount"]), /requires a value/);
  });

  it("rejects a duplicate option", () => {
    assert.throws(() => parseArgs(["add", "--amount", "1", "--amount", "2"]), /more than once/);
  });
});

describe("addExpense", () => {
  it("adds a normalized expense without mutating the input list", () => {
    const original = [];
    const result = addExpense(original, expenseInput);

    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      id: "uuid-1",
      amount: 2500,
      category: "food",
      note: "lunch",
      date: "2026-11-03",
    });
    assert.deepEqual(original, []);
  });

  it("rejects zero, negative, and non-numeric amounts", () => {
    for (const amount of ["0", "-1", "nope"]) {
      assert.throws(() => addExpense([], { ...expenseInput, amount }), /positive number/);
    }
  });

  it("rejects an empty category", () => {
    assert.throws(() => addExpense([], { ...expenseInput, category: " " }), /Category is required/);
  });

  it("rejects an invalid calendar date", () => {
    assert.throws(() => addExpense([], { ...expenseInput, date: "2026-02-30" }), /valid calendar date/);
  });

  it("rejects a missing or duplicate ID", () => {
    const { id, ...withoutId } = expenseInput;
    assert.throws(() => addExpense([], withoutId), /ID is required/);
    assert.throws(() => addExpense([{ id }], expenseInput), /ID must be unique/);
  });
});

describe("listExpenses", () => {
  it("returns all expenses when no filters are given", () => {
    assert.deepEqual(listExpenses(sampleExpenses), sampleExpenses);
  });

  it("filters category without case sensitivity", () => {
    assert.deepEqual(listExpenses(sampleExpenses, { category: "FOOD" }), [
      sampleExpenses[0],
      sampleExpenses[2],
    ]);
  });

  it("filters by month", () => {
    assert.deepEqual(listExpenses(sampleExpenses, { month: "2026-11" }), [
      sampleExpenses[0],
      sampleExpenses[1],
    ]);
  });

  it("combines category and month filters", () => {
    assert.deepEqual(listExpenses(sampleExpenses, { category: "food", month: "2026-11" }), [
      sampleExpenses[0],
    ]);
  });

  it("rejects an invalid month filter", () => {
    assert.throws(() => listExpenses(sampleExpenses, { month: "2026-13" }), /YYYY-MM/);
  });
});

describe("editExpense and deleteExpense", () => {
  it("edits an expense by ID prefix without mutating the original list", () => {
    const result = editExpense(sampleExpenses, "on", { amount: "3000", note: " Updated " });

    assert.deepEqual(result[0], { ...sampleExpenses[0], amount: 3000, note: "Updated" });
    assert.deepEqual(sampleExpenses[0], {
      id: "one",
      amount: 2500,
      category: "food",
      note: "Lunch",
      date: "2026-11-03",
    });
  });

  it("rejects ambiguous and missing expense IDs", () => {
    assert.throws(() => editExpense(sampleExpenses, "t", { amount: 1 }), /ambiguous/);
    assert.throws(() => deleteExpense(sampleExpenses, "missing"), /No expense found/);
  });

  it("rejects invalid edits and empty update sets", () => {
    assert.throws(() => editExpense(sampleExpenses, "one", { amount: 0 }), /positive number/);
    assert.throws(() => editExpense(sampleExpenses, "one", {}), /at least one field/);
  });

  it("deletes only the matching expense without mutating the original list", () => {
    assert.deepEqual(deleteExpense(sampleExpenses, "tw"), [sampleExpenses[0], sampleExpenses[2]]);
    assert.equal(sampleExpenses.length, 3);
  });
});

describe("summarizeExpenses", () => {
  it("calculates monthly total, category totals, bars, and biggest expense", () => {
    const summary = summarizeExpenses(sampleExpenses, { month: "2026-11", budget: 10000 });

    assert.equal(summary.total, 7500);
    assert.equal(summary.biggest.id, "two");
    assert.deepEqual(
      summary.categories.map(({ category, amount }) => ({ category, amount })),
      [
        { category: "rent", amount: 5000 },
        { category: "food", amount: 2500 },
      ],
    );
    assert.equal(summary.categories[0].bar.length, 30);
    assert.equal(summary.categories[1].bar.length, 15);
    assert.equal(summary.budgetStatus, null);
  });

  it("flags 80 percent budget use and budget overrun", () => {
    assert.equal(summarizeExpenses(sampleExpenses, { month: "2026-11", budget: 9000 }).budgetStatus, "warning");
    assert.equal(summarizeExpenses(sampleExpenses, { month: "2026-11", budget: 7000 }).budgetStatus, "exceeded");
  });

  it("returns an empty summary for a month with no expenses", () => {
    const summary = summarizeExpenses(sampleExpenses, { month: "2025-01" });

    assert.equal(summary.total, 0);
    assert.deepEqual(summary.categories, []);
    assert.equal(summary.biggest, null);
  });

  it("rejects an invalid budget", () => {
    assert.throws(() => summarizeExpenses(sampleExpenses, { budget: 0 }), /positive number/);
  });
});

describe("toCsv", () => {
  it("serializes headers and a basic expense", () => {
    assert.equal(
      toCsv([{ id: "one", amount: 2500, category: "food", note: "lunch", date: "2026-11-03" }]),
      "id,amount,category,note,date\r\none,2500,food,lunch,2026-11-03\r\n",
    );
  });

  it("quotes fields containing commas", () => {
    const csv = toCsv([{ id: "one", amount: 2500, category: "food, drinks", note: "", date: "2026-11-03" }]);
    assert.match(csv, /"food, drinks"/);
  });

  it("doubles embedded quotes inside quoted fields", () => {
    const csv = toCsv([{ id: "one", amount: 2500, category: "food", note: 'said "thanks"', date: "2026-11-03" }]);
    assert.match(csv, /"said ""thanks"""/);
  });

  it("quotes fields containing newlines and preserves their contents", () => {
    const note = "first line\nsecond line";
    const csv = toCsv([{ id: "one", amount: 2500, category: "food", note, date: "2026-11-03" }]);
    assert.ok(csv.includes('"first line\nsecond line"'));
  });
});
