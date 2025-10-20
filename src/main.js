import fs from "fs/promises";
import path from "path";
import os from "os";
import * as p from "@clack/prompts";
import { GoogleGenAI } from "@google/genai";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

async function checkStagedChanges() {
  try {
    const { stdout } = await execPromise("git status --porcelain");
    const hasStagedChanges = stdout.split('\n').some(line => 
      line.startsWith('A ') || line.startsWith('M ') || line.startsWith('D ') || line.startsWith('R ')
    );
    
    if (!hasStagedChanges) {
      p.cancel("No staged changes found. Stage your changes first with: git add .");
      process.exit(1);
    }
  } catch (error) {
    p.cancel("Failed to check git status. Make sure you're in a git repository.");
    process.exit(1);
  }
}

async function getStagedDiff() {
  try {
    const { stdout } = await execPromise("git diff --cached");
    return stdout;
  } catch (error) {
    p.cancel(`Failed to get staged changes: ${error.message}`);
    process.exit(1);
  }
}

async function generateCommitMessage(apiKey, diff) {
  const spinner = p.spinner();
  spinner.start("Generating commit message...");
  
  try {
    const client = new GoogleGenAI({ apiKey });
    
    const prompt = `Generate a conventional commit message based on this git diff.

Rules:
- Use conventional commit format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- Keep description under 50 characters
- Use imperative mood (add, fix, update, not added, fixed, updated)
- Add a body with bullet points if needed, max 72 chars per line
- No markdown formatting, just plain text

Git diff:
${diff}

Return only the commit message, nothing else.`;

    const result = await client.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: prompt,
    });
    
    let message = result.text.trim();
    
    message = message.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '');
    message = message.replace(/\*\*(.*?)\*\*/g, '$1');
    
    spinner.stop("Commit message generated!");
    return message;
  } catch (error) {
    spinner.stop("Failed to generate commit message.");
    p.cancel(`AI generation failed: ${error.message}`);
    process.exit(1);
  }
}

async function commitChanges(message) {
  const spinner = p.spinner();
  spinner.start("Committing changes...");
  
  try {
    const tempFile = path.join(os.tmpdir(), `scom-${Date.now()}.txt`);
    await fs.writeFile(tempFile, message, "utf8");
    
    await execPromise(`git commit -F "${tempFile}"`);
    await fs.unlink(tempFile);
    
    spinner.stop("✓ Committed successfully!");
  } catch (error) {
    spinner.stop("Commit failed!");
    p.cancel(`Failed to commit: ${error.message}`);
    process.exit(1);
  }
}

async function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["'](.*)["']$/, '$1');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
  }
}

export async function main() {
  p.intro("sweet-commit");
  
  await loadEnvFile();
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    p.cancel("GEMINI_API_KEY not found. Get your key from: https://aistudio.google.com/app/apikey");
    process.exit(1);
  }
  
  await checkStagedChanges();
  
  const diff = await getStagedDiff();
  
  const message = await generateCommitMessage(apiKey, diff);
  
  p.note(message, "Generated commit message");
  
  const shouldCommit = await p.confirm({
    message: "Commit with this message?",
    initialValue: true,
  });
  
  if (shouldCommit) {
    await commitChanges(message);
    p.outro("Done!");
  } else {
    p.cancel("Commit cancelled.");
  }
}
