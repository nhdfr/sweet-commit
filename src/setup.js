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
import {
    selectModelFromCatalog,
    selectProviderApiKey,
} from "./model/selector.js"

const API_KEY_PROVIDERS = ["gemini", "groq", "deepseek"]

async function main() {
    p.intro("sweet-commit setup")

    const { configDir, configFile } = getConfigLocation()
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
    }

    const existingConfig = await loadConfig()
    const apiKeys = getAllProviderKeys(existingConfig)
    const providersByModel = new Map()

    const primary = await selectModelFromCatalog({
        message: "Select primary model",
        allowNone: false,
        providersByModel,
    })
    apiKeys[primary.provider] = await selectProviderApiKey(
        primary.provider,
        apiKeys[primary.provider],
    )

    const fallback = await selectModelFromCatalog({
        message: "Select fallback model",
        allowNone: true,
        providersByModel,
    })
    const fallbackModel = fallback ? fallback.model : ""
    if (fallback) {
        apiKeys[fallback.provider] = await selectProviderApiKey(
            fallback.provider,
            apiKeys[fallback.provider],
        )
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
