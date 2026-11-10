function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validateAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }
  return amount;
}

function findExpenseIndex(list, id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Expense ID is required.");
  }

  const matches = [];
  list.forEach((expense, index) => {
    if (String(expense.id).startsWith(id)) {
      matches.push(index);
    }
  });
  if (matches.length === 0) {
    throw new Error(`No expense found with ID ${id}.`);
  }
  if (matches.length > 1) {
    throw new Error(`Expense ID ${id} is ambiguous. Use more characters.`);
  }
  return matches[0];
}

export function addExpense(list, input) {
  if (!Array.isArray(list)) {
    throw new TypeError("Expenses must be an array.");
  }
  if (!input || typeof input !== "object") {
    throw new TypeError("Expense input must be an object.");
  }

  if (typeof input.id !== "string" || input.id.trim() === "") {
    throw new Error("Expense ID is required.");
  }
  if (list.some((expense) => expense.id === input.id)) {
    throw new Error("Expense ID must be unique.");
  }
  const amount = validateAmount(input.amount);

  if (typeof input.category !== "string" || input.category.trim() === "") {
    throw new Error("Category is required.");
  }

  if (!isValidDate(input.date)) {
    throw new Error("Date must be a valid calendar date in YYYY-MM-DD format.");
  }
  if (input.note !== undefined && typeof input.note !== "string") {
    throw new Error("Note must be text.");
  }

  const expense = {
    id: input.id,
    amount,
    category: input.category.trim(),
    note: (input.note ?? "").trim(),
    date: input.date,
  };

  return [...list, expense];
}

export function deleteExpense(list, id) {
  if (!Array.isArray(list)) {
    throw new TypeError("Expenses must be an array.");
  }
  const index = findExpenseIndex(list, id);
  return list.filter((_, expenseIndex) => expenseIndex !== index);
}

export function editExpense(list, id, updates) {
  if (!Array.isArray(list)) {
    throw new TypeError("Expenses must be an array.");
  }
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new TypeError("Expense updates must be an object.");
  }
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    throw new Error("Provide at least one field to update.");
  }
  const supportedFields = ["amount", "category", "note", "date"];
  const unknownFields = fields.filter((field) => !supportedFields.includes(field));
  if (unknownFields.length > 0) {
    throw new Error(`Unsupported expense field: ${unknownFields.join(", ")}.`);
  }

  const index = findExpenseIndex(list, id);
  const current = list[index];
  const updated = { ...current };

  if (Object.hasOwn(updates, "amount")) {
    updated.amount = validateAmount(updates.amount);
  }
  if (Object.hasOwn(updates, "category")) {
    if (typeof updates.category !== "string" || updates.category.trim() === "") {
      throw new Error("Category is required.");
    }
    updated.category = updates.category.trim();
  }
  if (Object.hasOwn(updates, "note")) {
    if (typeof updates.note !== "string") {
      throw new Error("Note must be text.");
    }
    updated.note = updates.note.trim();
  }
  if (Object.hasOwn(updates, "date")) {
    if (!isValidDate(updates.date)) {
      throw new Error("Date must be a valid calendar date in YYYY-MM-DD format.");
    }
    updated.date = updates.date;
  }

  return list.map((expense, expenseIndex) => expenseIndex === index ? updated : expense);
}

export function listExpenses(list, filters = {}) {
  if (!Array.isArray(list)) {
    throw new TypeError("Expenses must be an array.");
  }
  if (filters.category !== undefined && typeof filters.category !== "string") {
    throw new Error("Category filter must be text.");
  }
  if (filters.month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month)) {
    throw new Error("Month must be in YYYY-MM format.");
  }

  return list.filter((expense) => {
    const matchesCategory =
      filters.category === undefined ||
      expense.category.toLowerCase() === filters.category.toLowerCase();
    const matchesMonth =
      filters.month === undefined || expense.date.startsWith(filters.month);
    return matchesCategory && matchesMonth;
  });
}
