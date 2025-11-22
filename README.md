# sweet-commit

[![npm version](https://img.shields.io/npm/v/sweet-commit)](https://www.npmjs.com/package/sweet-commit)

AI-powered commit messages that just work. One command, perfect commits, every time.

## Installation

```bash
npm install -g sweet-commit
```

## Update

To update to the latest version:

```bash
npm update -g sweet-commit
```

Check your current version:
```bash
npm list -g sweet-commit
```

## Usage

1. Generate and commit (will prompt to stage if needed):
   ```bash
   scom
   ```

The tool will:
- Check for unstaged changes and offer to stage them automatically
- Analyze your changes using AI
- Generate 3 different commit message options with colored headings
- Let you choose your preferred message
- Commit after confirmation

## Setup

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey) and configure it:

**Option 1: .env file (Recommended)**
Create a `.env` file in your project:
```
GEMINI_API_KEY=your-api-key-here
```

**Option 2: Environment variable**
```bash
export GEMINI_API_KEY="your-api-key-here"
```

**Option 3: Permanent setup (Not recommended)**
Add to your shell profile for system-wide access:

For bash users:
```bash
echo 'export GEMINI_API_KEY="your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

For zsh users:
```bash
echo 'export GEMINI_API_KEY="your-api-key-here"' >> ~/.zshrc
source ~/.zshrc
```

**Warning:** This stores your API key permanently in your shell profile. Only use this if you understand the security implications and are on a personal, secure machine.

## Features

- **Multiple commit message options**: Generate 3 variations with different perspectives and detail levels
- **Auto-stage prompt**: Automatically offers to stage unstaged changes
- **Intelligent message generation**: Comprehensive bodies for complex changes, concise for simple ones
- **Automatic analysis**: Analyzes staged git changes with smart optimization for large changesets
- **Conventional commits**: Follows best practices and conventional commit format
- **Gemini AI powered**: Uses latest Gemini AI for intelligent commit message creation
- **Clean interface**: Minimal, beautiful CLI with no unnecessary output
- **Zero configuration**: Works immediately after API key setup
- **Flexible setup**: Supports environment variables and .env files

## Dependencies

- @clack/prompts - Clean CLI interface
- @google/genai - Gemini AI integration

## Requirements

- Node.js 20 or later
- Git repository with staged changes
- Gemini API key
