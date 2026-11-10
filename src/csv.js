import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { addExpense } from "./expenses.js";

function parseCsvRecord(record) {
  const fields = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;

  for (let index = 0; index < record.length; index += 1) {
    const character = record[index];

    if (quoted) {
      if (character === '"') {
        if (record[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === ",") {
      fields.push(field);
      field = "";
      closedQuote = false;
    } else if (character === '"' && field === "") {
      quoted = true;
    } else if (character === '"') {
      throw new Error("Unexpected quote in an unquoted field.");
    } else if (closedQuote) {
      throw new Error("Unexpected character after a quoted field.");
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("Unterminated quoted field.");
  }

  fields.push(field);
  return fields;
}

function isBlankRecord(record) {
  return record.trim() === "";
}

export async function importCsvFile(filePath) {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  const imported = [];
  const skipped = [];
  let headers;
  let record = "";
  let recordStartLine = 0;
  let lineNumber = 0;

  function processRecord(sourceRecord) {
    const values = parseCsvRecord(sourceRecord);
    if (!headers) {
      const normalizedHeaders = values.map((value) =>
        value.trim().toLowerCase().replace(/^\uFEFF/, ""),
      );
      if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
        throw new Error("CSV header contains duplicate columns.");
      }
      if (!normalizedHeaders.includes("amount") || !normalizedHeaders.includes("category")) {
        throw new Error("CSV must include amount and category columns.");
      }
      headers = normalizedHeaders;
      return;
    }

    if (values.length !== headers.length) {
      throw new Error(`Expected ${headers.length} columns, received ${values.length}.`);
    }

    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    const expense = addExpense([], {
      id: randomUUID(),
      amount: row.amount,
      category: row.category,
      note: row.note ?? "",
      date: row.date || new Date().toISOString().slice(0, 10),
    })[0];
    imported.push(expense);
  }

  for await (const line of lines) {
    lineNumber += 1;
    if (record === "") {
      if (isBlankRecord(line)) {
        continue;
      }
      recordStartLine = lineNumber;
      record = line;
    } else {
      record += `\n${line}`;
    }

    try {
      processRecord(record);
      record = "";
    } catch (error) {
      if (error.message === "Unterminated quoted field.") {
        continue;
      }
      if (!headers) {
        throw new Error(`Invalid CSV header at line ${recordStartLine}: ${error.message}`, { cause: error });
      }
      skipped.push({ line: recordStartLine, reason: error.message });
      record = "";
    }
  }

  if (record !== "") {
    if (!headers) {
      throw new Error(`Invalid CSV header at line ${recordStartLine}: unterminated quoted field.`);
    }
    skipped.push({ line: recordStartLine, reason: "Unterminated quoted field." });
  }
  if (!headers) {
    throw new Error("CSV file is empty or has no header row.");
  }

  return { imported, skipped };
}
