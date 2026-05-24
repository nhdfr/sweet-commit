import {
    checkStagedChanges,
    getFileStats,
    getStagedDiff,
    commitChanges,
} from "./git.js"
import { generateCommitMessage } from "./ai.js"
import { selectCommitStyle, selectAiAgent, p } from "./prompts.js"
import { loadConfig, resolveAiAgents } from "./utils.js"
import { createMessageHistory } from "./history.js"

export async function main() {
    process.on("SIGINT", () => {
        p.cancel("Operation cancelled by user.")
        process.exit(130)
    })
    process.on("SIGTERM", () => {
        p.cancel("Operation terminated.")
        process.exit(143)
    })
    process.on("unhandledRejection", (reason) => {
        p.cancel(`Unexpected error: ${reason}`)
        process.exit(1)
    })

    p.intro("sweet-commit")
    const config = await loadConfig()

    const { agents, defaultAgentName } = resolveAiAgents(config)
    if (agents.length === 0) {
        p.cancel(
            "No enabled AI agent found in config. Run 'scom setup' or add provider keys (for example GEMINI_API_KEY) or agent.<name>.apiKey entries to your .scom.conf.",
        )
        process.exit(1)
    }

    const humanLikeCommit =
        config.humanLikeCommit !== undefined ? config.humanLikeCommit : true
    let commitStyle = process.env.SCOM_STYLE || config.defaultCommitStyle
    let selectedAgentName = process.env.SCOM_AGENT || defaultAgentName

    if (!agents.find((agent) => agent.name === selectedAgentName)) {
        selectedAgentName = agents[0].name
    }

    if (!process.env.SCOM_AGENT && agents.length > 1 && !config.defaultAgent) {
        const picked = await selectAiAgent(agents, selectedAgentName)
        if (p.isCancel(picked)) {
            p.cancel("Operation cancelled.")
            process.exit(0)
        }
        selectedAgentName = picked
    }

    await checkStagedChanges(p)
    const fileStats = await getFileStats()
    const changesetSize = fileStats.length
    let sizeDescription = "small"
    if (changesetSize > 50) sizeDescription = "very large"
    else if (changesetSize > 20) sizeDescription = "large"
    else if (changesetSize > 5) sizeDescription = "medium"
    p.note(
        `Analyzing ${sizeDescription} changeset with ${changesetSize} file${changesetSize === 1 ? "" : "s"}...\n` +
            `${fileStats.filter((f) => f.status === "A").length} added, ` +
            `${fileStats.filter((f) => f.status === "M").length} modified, ` +
            `${fileStats.filter((f) => f.status === "D").length} deleted`,
        "Changeset Overview",
    )
    const diff = await getStagedDiff()

    // console.log("Staged diff:\n", diff)

    if (!commitStyle) {
        commitStyle = await selectCommitStyle()
        if (p.isCancel(commitStyle)) {
            p.cancel("Operation cancelled.")
            process.exit(0)
        }
    }

    const history = createMessageHistory()

    const generateAndPush = async (
        refinementNote = "",
        styleOverride = commitStyle,
    ) => {
        const selectedAgent = agents.find(
            (agent) => agent.name === selectedAgentName,
        )
        if (!selectedAgent) {
            p.cancel("Selected AI agent no longer exists in config.")
            process.exit(1)
        }

        const spinner = p.spinner()
        spinner.start(
            `Generating commit message with ${selectedAgent.name} (${selectedAgent.provider}/${selectedAgent.model})...`,
        )
        try {
            // console.log("Generating for the diff:\n", diff)
            const message = await generateCommitMessage(
                selectedAgent,
                diff,
                styleOverride,
                humanLikeCommit,
                refinementNote,
            )
            spinner.stop()
            history.push({ message, agent: selectedAgent })
        } catch (err) {
            spinner.stop("Failed to generate commit message.")
            p.cancel("Error generating commit message: " + err.message)
            process.exit(1)
        }
    }

    await generateAndPush()

    while (true) {
        const entry = history.current()
        const { index, total } = history.position()
        p.note(
            entry.message,
            `Commit message ${index}/${total} (${entry.agent.name}: ${entry.agent.provider}/${entry.agent.model})`,
        )

        const options = [
            { value: "okay", label: "Okay", hint: "Use this commit message" },
            {
                value: "again",
                label: "Generate Again",
                hint: "Regenerate message",
            },
            {
                value: "refine",
                label: "Refine with Note",
                hint: "Add optional guidance for the next generation",
            },
        ]
        if (history.hasPrev()) {
            options.push({
                value: "prev",
                label: "Previous",
                hint: "Show previous generated message",
            })
        }
        if (history.hasNext()) {
            options.push({
                value: "next",
                label: "Next",
                hint: "Show next generated message",
            })
        }
        if (agents.length > 1) {
            options.push({
                value: "switch-agent",
                label: "Switch AI Agent",
                hint: "Try a different provider/model",
            })
        }

        const action = await p.select({
            message: "What do you want to do?",
            options,
        })
        if (p.isCancel(action)) {
            p.cancel("Operation cancelled.")
            process.exit(0)
        }
        if (action === "okay") {
            await commitChanges(entry.message, p)
            p.outro("Done!")
            break
        }
        if (action === "again") {
            await generateAndPush()
            continue
        }
        if (action === "refine") {
            const refinementNote = await p.text({
                message: "Optional guidance for AI (leave empty to skip)",
                placeholder:
                    "example: this one focuses on config changes too much, try to focus more on the added feature",
            })
            if (p.isCancel(refinementNote)) {
                p.cancel("Operation cancelled.")
                process.exit(0)
            }
            await generateAndPush(
                String(refinementNote || "").trim(),
                commitStyle,
            )
            continue
        }
        if (action === "prev") {
            history.prev()
            continue
        }
        if (action === "next") {
            history.next()
            continue
        }
        if (action === "switch-agent") {
            const picked = await selectAiAgent(agents, selectedAgentName)
            if (p.isCancel(picked)) {
                p.cancel("Operation cancelled.")
                process.exit(0)
            }
            selectedAgentName = picked
            await generateAndPush()
            continue
        }
    }
}
