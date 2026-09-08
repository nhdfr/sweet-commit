import { p } from "./prompts.js"
import {
    getAllProviderKeys,
    getConfiguredModelList,
    getGlobalModelPreferences,
    getModelProvider,
    loadConfig,
    resolveAiAgents,
    upsertConfigEntries,
} from "./utils.js"
import { buildProvidersByModel } from "./model/options.js"
import { selectProviderApiKey } from "./model/selector.js"
import { selectFallbackModel, selectPrimaryModel } from "./model/selection.js"

function printCurrentSettings(agents, defaultModel, fallbackModel) {
    const agentLines = agents.length
        ? agents
              .map(
                  (agent) =>
                      `- ${agent.name} (${agent.provider})\n  primary: ${agent.model}${
                          agent.fallbackModel
                              ? `\n  fallback: ${agent.fallbackModel}`
                              : ""
                      }`,
              )
              .join("\n")
        : "- no configured agents with API keys"

    p.note(
        `Current global primary: ${defaultModel || "(not set)"}\n` +
            `Current global fallback: ${fallbackModel || "(not set)"}\n\n` +
            `Configured agents:\n${agentLines}`,
        "Current Model Settings",
    )
}

function normalizeSelectedModels(primarySelection, fallbackSelection) {
    const normalized = {
        primaryModel: primarySelection.model,
        primaryProvider:
            primarySelection.provider ||
            getModelProvider(primarySelection.model) ||
            "",
        fallbackModel: fallbackSelection.model,
        fallbackProvider: fallbackSelection.provider || "",
    }

    if (normalized.fallbackModel && !normalized.fallbackProvider) {
        normalized.fallbackProvider =
            getModelProvider(normalized.fallbackModel) || ""
    }

    if (
        normalized.fallbackModel &&
        normalized.fallbackModel === normalized.primaryModel
    ) {
        p.note(
            "Fallback model matches primary model, so fallback was cleared.",
            "Fallback Normalized",
        )
        normalized.fallbackModel = ""
        normalized.fallbackProvider = ""
    }

    return normalized
}

export async function runModelCommand(subcommand = "") {
    const normalizedSubcommand = String(subcommand || "")
        .trim()
        .toLowerCase()
    if (normalizedSubcommand && normalizedSubcommand !== "show") {
        console.error(`Unknown subcommand for model: ${subcommand}`)
        console.log("Usage: scom model")
        console.log("       scom model show")
        process.exit(1)
    }

    const config = await loadConfig()
    const { agents } = resolveAiAgents(config)
    const { defaultModel, fallbackModel } = getGlobalModelPreferences(config)
    const providersByModel = buildProvidersByModel(agents)
    const storedKeys = getAllProviderKeys(config)
    const discoveredModels = getConfiguredModelList(config, agents).sort(
        (a, b) => a.localeCompare(b),
    )

    p.intro("sweet-commit model")
    printCurrentSettings(agents, defaultModel, fallbackModel)

    if (!discoveredModels.length) {
        p.cancel(
            "No models found in config yet. Add provider keys/models first, then run this again.",
        )
        process.exit(1)
    }

    const primarySelection = await selectPrimaryModel(
        discoveredModels,
        defaultModel,
        providersByModel,
    )
    const fallbackSelection = await selectFallbackModel(
        discoveredModels,
        fallbackModel,
        primarySelection.model,
        providersByModel,
    )
    const {
        primaryModel,
        primaryProvider,
        fallbackModel: nextFallback,
        fallbackProvider,
    } = normalizeSelectedModels(primarySelection, fallbackSelection)

    await selectProviderApiKey(primaryProvider, storedKeys)
    await selectProviderApiKey(fallbackProvider, storedKeys)

    const { configFile } = await upsertConfigEntries({
        DEFAULT_MODEL: primaryModel,
        FALLBACK_MODEL: nextFallback,
        GEMINI_API_KEY: storedKeys.gemini || "",
        GROQ_API_KEY: storedKeys.groq || "",
        DEEPSEEK_API_KEY: storedKeys.deepseek || "",
    })

    p.outro(
        `Saved model settings to ${configFile}\nPrimary: ${primaryModel}\nFallback: ${nextFallback || "(none)"}`,
    )
}
