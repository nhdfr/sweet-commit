#!/usr/bin/env node
import fs from "fs"
import { fileURLToPath } from "url"
import * as p from "@clack/prompts"
import {
    getAllProviderKeys,
    getConfigLocation,
    getProviderApiUrl,
    loadConfig,
    MODEL_CATALOG,
} from "./utils.js"

const API_KEY_PROVIDERS = ["gemini", "groq", "deepseek"]

async function selectModel(message, allowNone = false) {
    const options = []
    if (allowNone) {
        options.push({
            value: "__none__",
            label: "None",
            hint: "Do not configure a fallback model",
        })
    }

    options.push(
        ...MODEL_CATALOG.map((entry) => ({
            value: `${entry.provider}:${entry.model}`,
            label: `${entry.provider} | ${entry.model}`,
            hint: "free model",
        })),
    )

    options.push({
        value: "__custom__",
        label: "Custom model",
        hint: "Enter model name manually",
    })

    const choice = await p.select({ message, options })
    if (p.isCancel(choice)) {
        p.cancel("Operation cancelled.")
        process.exit(0)
    }

    if (choice === "__none__") {
        return null
    }

    if (choice === "__custom__") {
        const customModel = await p.text({
            message: "Enter model name",
            placeholder: "gemini-2.5-flash",
            validate: (value) =>
                String(value || "").trim().length > 0
                    ? undefined
                    : "Model is required",
        })
        if (p.isCancel(customModel)) {
            p.cancel("Operation cancelled.")
            process.exit(0)
        }

        const provider = await p.select({
            message: "Select provider for this model",
            options: API_KEY_PROVIDERS.map((name) => ({
                value: name,
                label: name,
            })),
        })
        if (p.isCancel(provider)) {
            p.cancel("Operation cancelled.")
            process.exit(0)
        }

        return {
            provider: String(provider),
            model: String(customModel).trim(),
        }
    }

    const [provider, ...modelParts] = String(choice).split(":")
    return {
        provider,
        model: modelParts.join(":").trim(),
    }
}

async function askApiKey(provider, existingValue = "") {
    const apiKey = await p.password({
        message: `${provider.toUpperCase()} API key\nGet your API key here: ${getProviderApiUrl(provider)}`,
        validate: (value) =>
            String(value || "").trim() || existingValue
                ? undefined
                : "API key is required",
    })

    if (p.isCancel(apiKey)) {
        p.cancel("Operation cancelled.")
        process.exit(0)
    }

    const trimmed = String(apiKey).trim()
    return trimmed || existingValue
}

async function main() {
    p.intro("sweet-commit setup")

    const { configDir, configFile } = getConfigLocation()
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
    }

    const existingConfig = await loadConfig()
    const apiKeys = getAllProviderKeys(existingConfig)

    const primary = await selectModel("Select primary model")
    apiKeys[primary.provider] =
        primary.provider === "ollama"
            ? ""
            : await askApiKey(primary.provider, apiKeys[primary.provider])

    const fallback = await selectModel("Select fallback model", true)
    const fallbackModel = fallback ? fallback.model : ""
    if (fallback) {
        apiKeys[fallback.provider] =
            fallback.provider === "ollama"
                ? ""
                : await askApiKey(fallback.provider, apiKeys[fallback.provider])
    }

    for (const provider of API_KEY_PROVIDERS) {
        if (typeof apiKeys[provider] !== "string") {
            apiKeys[provider] = ""
        }
    }

    const humanLikeCommit =
        existingConfig.humanLikeCommit === undefined
            ? "true"
            : String(existingConfig.humanLikeCommit)
    const defaultCommitStyle = existingConfig.defaultCommitStyle || "adaptive"

    const config = `GEMINI_API_KEY=${apiKeys.gemini || ""}
GROQ_API_KEY=${apiKeys.groq || ""}
DEEPSEEK_API_KEY=${apiKeys.deepseek || ""}
provider=${primary.provider}
fallbackProvider=${fallback ? fallback.provider : ""}
DEFAULT_MODEL=${primary.model}
FALLBACK_MODEL=${fallbackModel}
BASE_URL=
humanLikeCommit=${humanLikeCommit}
defaultCommitStyle=${defaultCommitStyle}
`

    fs.writeFileSync(configFile, config, "utf8")
    p.outro(`Config file updated at ${configFile}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main()
}

export default main
