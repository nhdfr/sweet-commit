# sweet-commit

[![npm version](https://img.shields.io/npm/v/sweet-commit)](https://www.npmjs.com/package/sweet-commit)

AI-powered commit messages that just work. One command, perfect commits, every time.

## Installation

```bash
npm install -g sweet-commit
```

## Usage

1. Stage your changes:
   ```bash
   git add .
   ```

2. Generate and commit:
   ```bash
   scom
   ```

The tool will analyze your staged changes, generate a conventional commit message using AI, show it to you, and commit after confirmation.

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

- Automatic analysis of staged git changes
- Generates conventional commit messages following best practices
- Uses Gemini AI for intelligent commit message creation
- Clean, minimal interface with no unnecessary output
- Zero configuration required after API key setup
- Supports both environment variables and .env files

## Dependencies

- @clack/prompts - Clean CLI interface
- @google/genai - Gemini AI integration

## Requirements

- Node.js 20 or later
- Git repository with staged changes
- Gemini API key
