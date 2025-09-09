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

### Manual Commit Generation

Once installed, you can use the `scom` command in your terminal to start the interactive commit process.

```bash
git add . (stage your changes)
scom
```

The tool will guide you through the following steps with clear and concise prompts:

1.  **Select commit type:** Choose from a list of conventional commit types (e.g., `feat`, `fix`, `docs`, `refactor`).
2.  **Scope (optional):** Specify the scope of your changes (e.g., a component or file name).
3.  **Short description:** Provide a short, imperative tense description of the change.
4.  **Longer description (optional):** Add a more detailed description of the change, using `|` to separate lines.
5.  **Breaking changes:** Confirm if there are any breaking changes and describe them.
6.  **Issue references (optional):** Add references to any open issues that this commit addresses.

After you've provided all the necessary information, `sweet-commit` will generate a commit message and display it with improved formatting for readability. You will then be asked for confirmation before committing.

### AI-Powered Commit Message Generation

`sweet-commit` can also generate commit messages for you using the Gemini API. To use this feature, run `scom` with the `-ai` flag:

```bash
git add . (stage your changes)
scom -ai
```

The tool will:

1.  **Get staged changes:** Automatically analyze your staged Git changes.
2.  **Generate message:** Use the Gemini AI to generate a conventional commit message.
3.  **Display and choose action:** Display the AI-generated message with clear formatting (subject and bulleted body) and ask you to choose an action:
    *   **Commit Directly:** Use the generated message as is and commit.
    *   **Edit Manually:** Get instructions on how to copy the message and commit it manually using `git commit`. This is useful if you prefer to fine-tune the message in your own editor.
    *   **Cancel:** Discard the message and exit.

### Setting up the Gemini API Key

To use the AI feature, you need to provide your Gemini API key. You can do this in two ways:

1.  **Using a `.env` file (recommended for project-specific keys):**
    *   In the root of your project (where you run `scom -ai`), create a file named `.env`.
    *   Add your API key to this file in the format:
        ```
        GEMINI_API_KEY="YOUR_API_KEY_HERE"
        ```
    *   Remember to add `.env` to your project's `.gitignore` file to prevent accidentally committing your key.

2.  **Using a system-wide environment variable:**
    *   Set `GEMINI_API_KEY` as an environment variable in your operating system. This makes the key available to `scom` from any directory.
    *   **Linux/macOS (add to `~/.bashrc`, `~/.zshrc`, etc.):**
        ```bash
        export GEMINI_API_KEY="YOUR_API_KEY_HERE"
        ```
    *   **Windows (Command Prompt):**
        ```cmd
        setx GEMINI_API_KEY "YOUR_API_KEY_HERE"
        ```
    *   **Windows (PowerShell):**
        ```powershell
        [System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY', 'YOUR_API_KEY_HERE', 'User')
        ```
    *   After setting, restart your terminal for changes to take effect.

You can obtain your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Features

*   Interactive and user-friendly interface with clear prompts and spinners.
*   Enforces conventional commit standards.
*   Supports breaking change descriptions.
*   Allows linking to multiple issues.
*   Previews the generated commit message with improved formatting.
*   **AI-powered commit message generation using Gemini API.**
*   **Flexible options for AI-generated messages: commit directly, edit manually, or cancel.**
*   **Supports both `.env` files and system-wide environment variables for API key management.**

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.