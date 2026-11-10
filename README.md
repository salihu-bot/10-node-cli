# Expense Tracker CLI

A dependency-free expense tracker for Node.js 20+ using ES modules and JSON files in `data/`.

## Setup

```sh
npm test
node bin/expense.js help
```

Expense data and budget settings are created on demand in `data/expenses.json` and `data/settings.json`. The `data/` directory is ignored by Git.

## Commands

### `add`

Add an expense. Amount must be positive; date defaults to today.

```sh
node bin/expense.js add --amount 2500 --category food --note "lunch"
node bin/expense.js add --amount 2500 --category food --date 2026-11-03
```

### `list`

List expenses, optionally filtering by category and/or month.

```sh
node bin/expense.js list
node bin/expense.js list --category food --month 2026-11
```

### `edit`

Edit one or more expense fields. Use the displayed 8-character ID prefix; longer prefixes are accepted if needed to identify an expense uniquely.

```sh
node bin/expense.js edit --id 6c1f56b0 --amount 3000
node bin/expense.js edit --id 6c1f56b0 --category dining --note "Dinner"
```

### `delete`

Delete an expense by its displayed ID prefix.

```sh
node bin/expense.js delete --id 6c1f56b0
```

### `summary`

Show spending total, per-category text bars, the biggest expense, and any configured budget warning. Without `--month`, the current month is used.

```sh
node bin/expense.js summary
node bin/expense.js summary --month 2026-11
```

### `budget`

Set the monthly spending budget. The budget is stored in `data/settings.json`.

```sh
node bin/expense.js budget --set 50000
```

The summary warns at 80% of the budget and when spending reaches or exceeds it.

### `export`

Export all expenses as CSV. CSV values containing commas, quotes, or newlines are escaped.

```sh
node bin/expense.js export --format csv --out expenses.csv
```

### `import`

Import a CSV with `amount` and `category` header columns. Optional columns are `date` and `note`. Rows with invalid values are skipped and reported with their source line numbers.

```sh
node bin/expense.js import --file sample-bank.csv
node bin/expense.js import --file bank.csv
```

The importer uses `fs.createReadStream` with `readline` to process the file incrementally rather than first reading the entire source file into memory. This avoids a large extra memory allocation for big bank exports.

`sample-bank.csv` includes valid and invalid rows for trying the importer and covers comma, quote, and newline escaping.

### `help`

Print the command synopsis.

```sh
node bin/expense.js help
```

### `--no-color`

Disable ANSI colors for a command. Colors are emitted only when standard output is a TTY.

```sh
node bin/expense.js list --no-color
```

For detailed error stacks, set `DEBUG=1` in the environment. The CLI sets `process.exitCode` on failure so Node can finish flushing output and completing pending asynchronous work before exiting.

## Tests

Tests use Node's built-in `node:test` and `node:assert/strict`; no packages need to be installed.

```sh
npm test
```

`test()` defines a test case. `describe()` groups related cases, and `it()` is a readable alias for `test()` used inside those groups. Node reports each case and the final pass/fail totals.

## Run `expense` from any folder with `npm link`

From the project directory, run:

```sh
npm link
```

This creates a global link to this local package and installs the `expense` executable declared in `package.json`'s `bin` field. npm puts a platform-appropriate command shim on your `PATH`; the `#!/usr/bin/env node` shebang identifies Node.js as the script interpreter (and npm's Windows shim also launches it with Node). You can then run commands from any folder:

```sh
expense add --amount 2500 --category food --note "lunch"
expense summary
```

Use `npm unlink -g node-cli-expense-tracker` to remove the global link.
