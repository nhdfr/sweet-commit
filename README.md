# sweet-commit
[![npm version](https://img.shields.io/npm/v/sweet-commit)](https://www.npmjs.com/package/sweet-commit)
[![npm downloads](https://img.shields.io/npm/dm/sweet-commit)](https://www.npmjs.com/package/sweet-commit)

A command-line tool to help you create sweet and conventional commits with ease.

## Installation

You can install `sweet-commit` globally using npm or pnpm:

```bash
npm install -g sweet-commit
```

or

```bash
pnpm install -g sweet-commit
```

## Usage

Once installed, you can use the `scom` command in your terminal to start the interactive commit process.

```bash
git add . (stage your changes)
scom
```

The tool will guide you through the following steps:

1.  **Select the type of change:** Choose from a list of conventional commit types (e.g., `feat`, `fix`, `docs`, `refactor`).
2.  **Enter the scope of the changes:** Specify the scope of your changes (e.g., a component or file name).
3.  **Write a short description:** Provide a short, imperative tense description of the change.
4.  **Provide a longer description:** Add a more detailed description of the change, with each line separated by `|`.
5.  **Indicate breaking changes:** Confirm if there are any breaking changes and describe them.
6.  **Link to open issues:** Add references to any open issues that this commit addresses.

After you've provided all the necessary information, `sweet-commit` will generate a commit message and ask for your confirmation before committing.

## Features

*   Interactive and user-friendly interface.
*   Enforces conventional commit standards.
*   Supports breaking change descriptions.
*   Allows linking to multiple issues.
*   Previews the generated commit message before committing.

## Planned Features
*   AI assistance for writing commit messages.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.
