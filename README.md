# sweet-commit

[![npm version](https://img.shields.io/npm/v/sweet-commit)](https://www.npmjs.com/package/sweet-commit)

commit messages that just work. One command, perfect commits, every time.

> [!WARNING]
> If you already use `scom` and update to the latest version, your existing config may break.
> Re-run `scom setup` to migrate or recreate your configuration.

## Installation

## via npm

Install globally (recommended) or run with `npx`:

```bash
npm install -g sweet-commit
# or
npx sweet-commit
```

## manually

```bash
## clone the repo :
git clone https://github.com/h3yng/sweet-commit.git

## intall dependencies
npm i

## link the package globally
npm link
```
Keep your API keys ready for cloud providers.  
If you use Ollama locally, no API key is required.
The fallback is used only if the primary provider fails.

Recommended free/accessible providers:

- Groq: https://console.groq.com/
- Gemini: https://aistudio.google.com/
- Ollama (local): https://ollama.ai/ — run local models without API keys. `scom` can automatically discover installed Ollama models from your local server.

Run the interactive setup:

```bash
scom setup
```

You will be asked to choose a primary agent and an optional fallback agent.

## Usage
 
Make some changes in your project, stage the files you want to include, and run:

```bash
scom
```

`scom` reads the staged diff, generates a commit message, and then lets you confirm or regenerate before it commits.

You can also control the output style when you run it:

- `scom -s` or `scom --short` for a short commit message
- `scom -a` or `scom --adaptive` for adaptive output
- `scom -d` or `scom --detailed` for a detailed commit message

## Config file

Setup writes a simple key=value config file named `.scom.conf`.

<details>
<summary>Config file path</summary>

Default locations for the config file:

- Linux/macOS (XDG): `$XDG_CONFIG_HOME/sweet-commit/.scom.conf` or `~/.config/sweet-commit/.scom.conf`
- macOS (fallback): `~/Library/Application Support/sweet-commit/.scom.conf`
- Windows: `%APPDATA%\sweet-commit\.scom.conf`

You can override the location with environment variables:

- `SCOM_CONFIG=/absolute/path/to/.scom.conf` (use a full file path)
- `SCOM_CONFIG_DIR=/absolute/path/to/config-dir` (writes `.scom.conf` in that directory)

</details>

Default settings written by the setup:

- `humanLikeCommit`: `true`
- `defaultCommitStyle`: `adaptive`

Available commit styles:

- `short`
- `detailed`
- `adaptive`

## Available commands

- `scom` — generate a commit message from staged changes and commit
- `scom setup` — interactive setup for providers and keys
- `scom config` — show active config path and values
- `scom update` — update sweet-commit to the latest version
- `scom --agent <name>` — run using a specific configured agent
- `scom --short` / `-s` — force short one-line commit
- `scom --detailed` / `-d` — force detailed commit
- `scom --adaptive` / `-a` — adaptive style (default)
- `scom --version` / `-v` — show version

## Changing models

Run `scom model` to open the interactive model chooser.

This command updates your global primary and fallback models, then saves them back to your config file.
It uses the API keys already stored in your config when available.

If you want to change the keys, you can edit the config file directly or re-run `scom setup`.

When using Ollama, no API key is required. `scom` uses the default local Ollama endpoint unless `BASE_URL` is overridden.

During generation, if the configured Ollama model is unavailable locally, `scom` can automatically fall back to an installed local model.

## Example config (.scom.conf)

The setup writes a `.scom.conf` file in key=value format. If you run a local Ollama server, set `BASE_URL` to its base URL (for example `http://localhost:11434`). Example content:

```ini
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
DEEPSEEK_API_KEY=your-deepseek-key
DEFAULT_MODEL=gemini-2.5-flash
FALLBACK_MODEL=
BASE_URL=
humanLikeCommit=true
defaultCommitStyle=adaptive
```

## Feature requests

Please open feature requests or bug reports on the project's GitHub repository (create a new issue with a clear title and reproduction steps).