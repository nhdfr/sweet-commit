import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import * as p from "@clack/prompts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getGitDiff() {
  const spinner = p.spinner();
  spinner.start("Getting staged changes...");
  try {
    const { stdout } = await execPromise("git diff --cached");
    if (!stdout) {
      spinner.stop("No staged changes found.");
      p.cancel(
        "No staged changes found. Please stage your changes before generating a commit message.",
      );
      return null;
    }
    spinner.stop("Staged changes retrieved.");
    return stdout;
  } catch (error) {
    spinner.stop("Failed to get staged changes.");
    p.cancel(`Failed to get git diff: ${error.message}`);
    return null;
  }
}

async function generateCommitMessage(apiKey, diff) {
  const spinner = p.spinner();
  spinner.start("Generating commit message with AI...");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Generate a conventional commit message based on the following git diff.
  The commit message should follow the Conventional Commits specification (https://www.conventionalcommits.org/en/v1.0.0/).
  It should start with a type (e.g., feat, fix, docs, style, refactor, test, chore, perf, ci, build), followed by an optional scope, a colon and a space, and then a short, imperative mood description (max 50 chars).
  The body of the message should provide additional contextual information about the code changes, presented as a bulleted list. Each bullet point should start with a hyphen (-).
  If there are breaking changes, include a "BREAKING CHANGE:" footer.
  If the commit closes an issue, include "Closes #ISSUE_NUMBER" in the body or footer.

  Git Diff:
  
${diff}

Commit Message:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    spinner.stop("Commit message generated.");

    text = text.replace(/\r\n/g, "\n");
    text = text.replace(/^```(?:[a-z]+)?\n?([\s\S]*?)\n?```$/, "$1");
    text = text.replace(/\n{2,}/g, "\n");
    text = text.trim();

    return text;
  } catch (error) {
    spinner.stop("Failed to generate commit message.");
    p.cancel(`Failed to generate commit message from AI: ${error.message}`);
    return null;
  }
}

async function applyCommit(message) {
  const spinner = p.spinner();
  spinner.start("Applying commit...");
  try {
    const tempFilePath = path.join(
      os.tmpdir(),
      `scom-commit-msg-${Date.now()}.txt`,
    );
    await fs.writeFile(tempFilePath, message, "utf8");

    const { stdout, stderr } = await execPromise(
      `git commit -F "${tempFilePath}"`,
    );
    if (stderr) {
      spinner.stop("Commit failed!");
      p.cancel(`Error applying commit: ${stderr}`);
      return false;
    }
    spinner.stop("Commit applied successfully!");
    p.note(stdout, "Git Output");
    return true;
  } catch (error) {
    spinner.stop("Commit failed!");
    p.cancel(`Failed to apply commit: ${error.message}`);
    return false;
  } finally {
    try {
      await fs.unlink(tempFilePath);
    } catch (e) {}
  }
}

export async function aiMain() {
  p.intro("sweet-commit: AI Powered");

  const projectRoot = process.cwd();
  const envPath = path.join(projectRoot, ".env");

  dotenv.config({ path: envPath, debug: false });

  let geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    p.log.error("GEMINI_API_KEY not found.");
    p.log.info("Set GEMINI_API_KEY environment variable or add to .env file.");
    p.log.info("Get your key from: https://aistudio.google.com/app/apikey");
    p.outro("Operation cancelled.");
    return;
  }

  const diff = await getGitDiff();
  if (!diff) {
    p.outro("Operation cancelled.");
    return;
  }

  let commitMessage = await generateCommitMessage(geminiApiKey, diff);
  if (!commitMessage) {
    p.outro("Operation cancelled.");
    return;
  }

  const lines = commitMessage.split("\n").filter((line) => line.trim() !== "");
  const subject = lines[0];
  const bodyLines = lines.slice(1);

  const wrapText = (text, maxLength, indent = "") => {
    let result = "";
    let currentLine = "";
    const words = text.split(" ");

    for (const word of words) {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine === indent ? "" : " ") + word;
      } else {
        result += currentLine + "\n";
        currentLine = indent + word;
      }
    }
    result += currentLine;
    return result;
  };

  let wrappedBody = "";
  if (bodyLines.length > 0) {
    const bulletPoints = bodyLines
      .join("\n")
      .split(/^- /m)
      .filter((item) => item.trim() !== ""); // Split by bullet points
    const wrappedBulletPoints = bulletPoints
      .map((point) => {
        const trimmedPoint = point.trim();
        if (trimmedPoint) {
          return "- " + wrapText(trimmedPoint, 72 - 2, "  ");
        }
        return "";
      })
      .filter((item) => item !== "");

    wrappedBody = wrappedBulletPoints.join("\n");
  }

  const displayMessage = subject + (wrappedBody ? "\n\n" + wrappedBody : "");

  p.note(displayMessage, "Generated Commit Message");

  const action = await p.select({
    message: "Choose an action:",
    options: [
      {
        value: "commit",
        label: "Commit Directly",
        hint: "Use generated message as is",
      },
      {
        value: "edit",
        label: "Edit Manually",
        hint: "Get instructions to commit manually",
      },
      { value: "cancel", label: "Cancel", hint: "Discard message and exit" },
    ],
  });

  if (action === "cancel") {
    p.cancel("Operation cancelled.");
    p.outro("Operation cancelled.");
    return;
  }

  if (action === "edit") {
    p.note(displayMessage, "Generated Commit Message (for manual commit)");
    p.log.info("To commit manually, copy the message above and use:");
    p.log.info(`git commit -m "${subject}" -m "${wrappedBody}"`);
    p.outro("Operation finished. Please commit manually.");
    return;
  }

  const confirmCommit = await p.confirm({
    message: "Confirm commit?",
    initialValue: true,
  });

  if (confirmCommit) {
    await applyCommit(commitMessage);
    p.outro("Commit process finished.");
  } else {
    p.cancel("Commit operation cancelled.");
    p.outro("Operation cancelled.");
  }
}

