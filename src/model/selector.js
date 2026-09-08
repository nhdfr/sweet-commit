import { p } from "../prompts.js"
import {
    MODEL_CATALOG,
    PROVIDER_DEFAULTS,
    KEY_SUPPORTED_PROVIDERS,
} from "../config/constants.js"
import { getModelProvider, getProviderApiUrl } from "../config/providers.js"
import { buildProvidersByModel, toSelectOptions } from "./options.js"

export async function selectModelFromCatalog(options = {}) {
    const {
        message = "Select model",
        allowNone = false,
        initialValue,
        discoveredModels = [],
        providersByModel = new Map(),
    } = options

    const catalogModels = MODEL_CATALOG.map(
        (entry) => `${entry.provider}:${entry.model}`,
    )
    const allModels = [
        ...new Set([...discoveredModels, ...catalogModels]),
    ].sort((a, b) => a.localeCompare(b))

    const selectOptions = [
        ...(allowNone
            ? [
                  {
                      value: "__none__",
                      label: "None",
                      hint: "Do not configure a fallback model",
                  },
              ]
            : []),
        ...toSelectOptions(allModels, providersByModel),
        {
            value: "__custom__",
            label: "Custom model...",
            hint: "Enter any model name manually",
        },
    ]

    const choice = await p.select({
        message,
        initialValue,
        options: selectOptions,
    })

    if (p.isCancel(choice)) {
        p.cancel("Operation cancelled.")
        process.exit(0)
    }

    if (choice === "__none__") {
        return null
    }

    if (choice === "__custom__") {
        return selectCustomModel()
    }

    const [provider, ...modelParts] = String(choice).split(":")
    return {
        provider: String(provider).trim(),
        model: modelParts.join(":").trim(),
    }
}

async function selectCustomModel() {
    const typed = await p.text({
        message: "Enter model name",
        placeholder: "gemini-2.5-flash",
        validate: (value) =>
            String(value || "").trim().length > 0
                ? undefined
                : "Model is required",
    })

    if (p.isCancel(typed)) {
        p.cancel("Operation cancelled.")
        process.exit(0)
    }

    const providerChoice = await p.select({
        message: "Select provider",
        options: KEY_SUPPORTED_PROVIDERS.map((provider) => ({
            value: provider,
            label: provider,
        })),
    })

    if (p.isCancel(providerChoice)) {
        p.cancel("Operation cancelled.")
        process.exit(0)
    }

    return {
        model: String(typed).trim(),
        provider: String(providerChoice).trim(),
    }
}

export async function selectProviderApiKey(provider, existingValue = "") {
    if (!provider || !KEY_SUPPORTED_PROVIDERS.includes(provider)) {
        return existingValue
    }

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

export function getDefaultModelForProvider(provider) {
    const normalized = String(provider || "").toLowerCase()
    return (
        PROVIDER_DEFAULTS[normalized]?.model || PROVIDER_DEFAULTS.gemini.model
    )
}

export function getKnownProvidersForModel(model) {
    const entry = MODEL_CATALOG.find((item) => item.model === model)
    return entry ? [entry.provider] : []
}
