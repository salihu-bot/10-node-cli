export function parseArgs(argv) {
  if (!Array.isArray(argv)) {
    throw new TypeError("Arguments must be an array.");
  }

  let command;
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument.startsWith("--")) {
      const equalsIndex = argument.indexOf("=");
      const name = argument.slice(2, equalsIndex === -1 ? undefined : equalsIndex);
      if (!name) {
        throw new Error("Option names cannot be empty.");
      }

      if (name === "no-color") {
        if (equalsIndex !== -1) {
          throw new Error("--no-color does not take a value.");
        }
        if (Object.hasOwn(options, name)) {
          throw new Error("Option --no-color was provided more than once.");
        }
        options[name] = true;
        continue;
      }

      const value =
        equalsIndex === -1
          ? argv[++index]
          : argument.slice(equalsIndex + 1);
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Option --${name} requires a value.`);
      }
      if (Object.hasOwn(options, name)) {
        throw new Error(`Option --${name} was provided more than once.`);
      }
      options[name] = value;
      continue;
    }

    if (argument.startsWith("-") && argument !== "-") {
      throw new Error(`Short options are not supported: ${argument}`);
    }
    if (command !== undefined) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    command = argument;
  }

  if (!command) {
    throw new Error('Missing command. Run "node bin/expense.js help" for usage.');
  }

  return { command, options };
}
