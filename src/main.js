import fs from "fs/promises";
import path from "path";
import os from "os";
import * as p from "@clack/prompts";
import { GoogleGenAI } from "@google/genai";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

const DIFF_CONFIG = {
  maxTokens: 4000,
  maxContextLines: 10,
  maxContextLineLength: 200,
  maxFilesInSummary: 50,
  maxBuffer: 50 * 1024 * 1024,
};

async function execGit(command, options = {}) {
  try {
    const { stdout } = await execPromise(command, {
      maxBuffer: DIFF_CONFIG.maxBuffer,
      ...options,
    });
    return stdout;
  } catch (error) {
    if (error.message.includes("maxBuffer length exceeded")) {
      throw new Error(
        `The changeset is extremely large (>50MB). Consider committing files in smaller batches.`,
      );
    }
    throw error;
  }
}

async function checkStagedChanges() {
  try {
    const stdout = await execGit("git status --porcelain");
    const hasStagedChanges = stdout
      .split("\n")
      .some(
        (line) =>
          line.startsWith("A ") ||
          line.startsWith("M ") ||
          line.startsWith("D ") ||
          line.startsWith("R "),
      );

    if (!hasStagedChanges) {
      p.cancel(
        "No staged changes found. Stage your changes first with: git add .",
      );
      process.exit(1);
    }
  } catch (error) {
    p.cancel(`Unable to check git status: ${error.message}`);
    process.exit(1);
  }
}

async function getFileStats() {
  try {
    const stdout = await execGit("git diff --cached --name-status");
    const files = stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [status, ...pathParts] = line.split("\t");
        return { status, path: pathParts.join("\t") };
      });
    return files;
  } catch (error) {
    p.cancel(`Unable to analyze changed files: ${error.message}`);
    process.exit(1);
  }
}

async function getStagedDiff() {
  try {
    const stdout = await execGit("git diff --cached");
    return stdout;
  } catch (error) {
    if (error.message.includes("extremely large")) {
      p.note(error.message, "Large Changeset Warning");

      try {
        const stats = await execGit("git diff --cached --stat");
        const numstat = await execGit("git diff --cached --numstat");

        return `LARGE_CHANGESET_SUMMARY\n\nStatistics:\n${stats}\n\nDetailed changes:\n${numstat}`;
      } catch (fallbackError) {
        p.cancel(
          "Unable to process this changeset - it's too large even for statistical analysis. Try committing files in smaller batches.",
        );
        process.exit(1);
      }
    } else {
      p.cancel(`Unable to get staged changes: ${error.message}`);
      process.exit(1);
    }
  }
}

function analyzeDiffContent(diff) {
  const lines = diff.split("\n");
  const analysis = {
    files: [],
    totalAdditions: 0,
    totalDeletions: 0,
    summary: [],
  };

  let currentFile = null;
  let additions = 0;
  let deletions = 0;
  let contextLines = [];

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      if (currentFile) {
        analysis.files.push({
          ...currentFile,
          additions,
          deletions,
          context: contextLines.slice(-DIFF_CONFIG.maxContextLines),
        });
      }

      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      currentFile = {
        path: match ? match[1] : "unknown",
        type: "modified",
      };
      additions = 0;
      deletions = 0;
      contextLines = [];
    } else if (line.startsWith("new file mode")) {
      if (currentFile) currentFile.type = "added";
    } else if (line.startsWith("deleted file mode")) {
      if (currentFile) currentFile.type = "deleted";
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
      analysis.totalAdditions++;
      if (line.length < DIFF_CONFIG.maxContextLineLength) {
        contextLines.push(line);
      }
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
      analysis.totalDeletions++;
      if (line.length < DIFF_CONFIG.maxContextLineLength) {
        contextLines.push(line);
      }
    } else if (line.startsWith("@@")) {
      contextLines.push(line);
    }
  }

  if (currentFile) {
    analysis.files.push({
      ...currentFile,
      additions,
      deletions,
      context: contextLines.slice(-DIFF_CONFIG.maxContextLines),
    });
  }

  return analysis;
}

function createOptimizedDiff(originalDiff) {
  if (originalDiff.startsWith("LARGE_CHANGESET_SUMMARY")) {
    return originalDiff.replace(
      "LARGE_CHANGESET_SUMMARY\n\n",
      "Extremely large changeset - statistical summary:\n\n",
    );
  }

  if (originalDiff.length < DIFF_CONFIG.maxTokens) {
    return originalDiff;
  }

  const analysis = analyzeDiffContent(originalDiff);

  let optimizedDiff = `Files changed: ${analysis.files.length}\n`;
  optimizedDiff += `Total additions: +${analysis.totalAdditions}, deletions: -${analysis.totalDeletions}\n\n`;

  const filesToShow = analysis.files.slice(0, DIFF_CONFIG.maxFilesInSummary);

  for (const file of filesToShow) {
    optimizedDiff += `File: ${file.path} (${file.type})\n`;
    optimizedDiff += `Changes: +${file.additions} -${file.deletions}\n`;

    if (file.context.length > 0) {
      optimizedDiff += `Key changes:\n`;
      file.context.slice(0, 5).forEach((line) => {
        optimizedDiff += `  ${line}\n`;
      });
    }
    optimizedDiff += "\n";

    if (optimizedDiff.length > DIFF_CONFIG.maxTokens * 0.8) break;
  }

  if (analysis.files.length > filesToShow.length) {
    optimizedDiff += `... and ${analysis.files.length - filesToShow.length} more files\n\n`;
  }

  if (optimizedDiff.length > DIFF_CONFIG.maxTokens) {
    const fileTypes = {};
    analysis.files.forEach((f) => {
      const ext = f.path.split(".").pop() || "other";
      if (!fileTypes[ext])
        fileTypes[ext] = { count: 0, additions: 0, deletions: 0, files: [] };
      fileTypes[ext].count++;
      fileTypes[ext].additions += f.additions;
      fileTypes[ext].deletions += f.deletions;
      fileTypes[ext].files.push(f.path);
    });

    optimizedDiff = `Large changeset summary:\n`;
    optimizedDiff += `Total files: ${analysis.files.length}\n`;
    optimizedDiff += `Total changes: +${analysis.totalAdditions} -${analysis.totalDeletions} lines\n\n`;

    optimizedDiff += `File types affected:\n`;
    Object.entries(fileTypes).forEach(([type, info]) => {
      optimizedDiff += `  ${type}: ${info.count} files (+${info.additions}/-${info.deletions})\n`;
      if (info.files.length <= 3) {
        optimizedDiff += `    Files: ${info.files.join(", ")}\n`;
      } else {
        optimizedDiff += `    Files: ${info.files.slice(0, 2).join(", ")}, ...and ${info.files.length - 2} more\n`;
      }
    });

    const significantFiles = analysis.files
      .filter((f) => f.additions + f.deletions > 5)
      .slice(0, 3);

    if (significantFiles.length > 0) {
      optimizedDiff += `\nMajor changes:\n`;
      significantFiles.forEach((file) => {
        optimizedDiff += `  ${file.path}: ${file.type} (+${file.additions}/-${file.deletions})\n`;
      });
    }
  }

  return optimizedDiff;
}

async function generateCommitMessage(apiKey, diff) {
  const spinner = p.spinner();
  spinner.start("Analyzing changes and generating commit message...");

  try {
    const client = new GoogleGenAI({ apiKey });

    const optimizedDiff = createOptimizedDiff(diff);
    const isOptimized = optimizedDiff !== diff;

    if (isOptimized) {
      spinner.message("Large changeset detected, using optimized analysis...");
    }

    const prompt = `Generate a conventional commit message based on this git ${isOptimized ? "change summary" : "diff"}.

Rules:
- Use conventional commit format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- Keep description under 50 characters
- Use imperative mood (add, fix, update, not added, fixed, updated)
- Add a body with bullet points if needed, max 72 chars per line
- No markdown formatting, just plain text
${isOptimized ? "- This is a summarized view of a large changeset, focus on the overall impact" : ""}

${isOptimized ? "Change summary" : "Git diff"}:
${optimizedDiff}

Return only the commit message, nothing else.`;

    const result = await client.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: prompt,
    });

    let message = result.text.trim();

    message = message.replace(/^```[\s\S]*?\n/, "").replace(/\n```$/, "");
    message = message.replace(/\*\*(.*?)\*\*/g, "$1");

    spinner.stop("Commit message generated!");
    return message;
  } catch (error) {
    spinner.stop("Failed to generate commit message.");

    let userFriendlyMessage = "Unable to generate commit message";

    if (error.message.includes("API key")) {
      userFriendlyMessage =
        "Invalid API key. Please check your GEMINI_API_KEY.";
    } else if (
      error.message.includes("quota") ||
      error.message.includes("limit")
    ) {
      userFriendlyMessage =
        "API quota exceeded. Please try again later or check your Gemini API usage.";
    } else if (
      error.message.includes("network") ||
      error.message.includes("fetch")
    ) {
      userFriendlyMessage =
        "Network error. Please check your internet connection and try again.";
    } else if (error.message.includes("token")) {
      userFriendlyMessage =
        "Changeset too complex for AI analysis. Try breaking it into smaller commits.";
    } else {
      userFriendlyMessage = `AI service error: ${error.message}`;
    }

    p.cancel(userFriendlyMessage);
    process.exit(1);
  }
}

async function commitChanges(message) {
  if (!message || message.trim().length === 0) {
    p.cancel("Cannot commit with empty message.");
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start("Committing changes...");

  let tempFile;
  try {
    tempFile = path.join(os.tmpdir(), `scom-${Date.now()}.txt`);
    await fs.writeFile(tempFile, message, "utf8");

    await execGit(`git commit -F "${tempFile}"`);
    await fs.unlink(tempFile);

    spinner.stop("Committed successfully!");
  } catch (error) {
    spinner.stop("Commit failed!");

    if (tempFile) {
      try {
        await fs.unlink(tempFile);
      } catch {}
    }

    p.cancel(`Unable to create commit: ${error.message}`);
    process.exit(1);
  }
}

async function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), ".env");
    const envContent = await fs.readFile(envPath, "utf8");

    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["'](.*)["']$/, "$1");
          process.env[key] = value;
        }
      }
    });
  } catch (error) {}
}

export async function main() {
  process.on("SIGINT", () => {
    p.cancel("Operation cancelled by user.");
    process.exit(130);
  });

  process.on("SIGTERM", () => {
    p.cancel("Operation terminated.");
    process.exit(143);
  });

  process.on("unhandledRejection", (reason, promise) => {
    p.cancel(`Unexpected error: ${reason}`);
    process.exit(1);
  });

  p.intro("sweet-commit");

  await loadEnvFile();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    p.cancel(
      "GEMINI_API_KEY not found. Get your key from: https://aistudio.google.com/app/apikey",
    );
    process.exit(1);
  }

  await checkStagedChanges();

  const fileStats = await getFileStats();

  const changesetSize = fileStats.length;
  let sizeDescription = "small";
  if (changesetSize > 50) sizeDescription = "very large";
  else if (changesetSize > 20) sizeDescription = "large";
  else if (changesetSize > 5) sizeDescription = "medium";

  p.note(
    `Analyzing ${sizeDescription} changeset with ${changesetSize} file${changesetSize === 1 ? "" : "s"}...\n` +
      `${fileStats.filter((f) => f.status === "A").length} added, ` +
      `${fileStats.filter((f) => f.status === "M").length} modified, ` +
      `${fileStats.filter((f) => f.status === "D").length} deleted`,
    "Changeset Overview",
  );

  const diff = await getStagedDiff();

  const needsOptimization =
    diff.length > DIFF_CONFIG.maxTokens ||
    diff.startsWith("LARGE_CHANGESET_SUMMARY");
  if (needsOptimization) {
    const sizeMB = Math.round((diff.length / 1024 / 1024) * 100) / 100;

    if (diff.startsWith("LARGE_CHANGESET_SUMMARY")) {
      p.note(
        `Extremely large changeset detected!\n` +
          `Using statistical analysis instead of full diff.\n` +
          `This ensures reliable commit message generation.`,
        "Smart Analysis",
      );
    } else {
      p.note(
        `Large changeset detected (${sizeMB}MB)\n` +
          `Using intelligent summarization to optimize for AI analysis.\n` +
          `Key changes and patterns will be preserved.`,
        "Optimization Active",
      );
    }
  }

  const message = await generateCommitMessage(apiKey, diff);

  p.note(message, "Generated commit message");

  let shouldCommit;
  try {
    shouldCommit = await p.confirm({
      message: "Commit with this message?",
      initialValue: true,
    });
  } catch (error) {
    p.cancel("Operation cancelled.");
    process.exit(130);
  }

  if (shouldCommit === true) {
    await commitChanges(message);
    p.outro("Done!");
  } else {
    p.cancel("Commit cancelled.");
    process.exit(0);
  }
}
