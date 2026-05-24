import { DEFAULT_PROVIDER, PROVIDER_DEFAULTS } from "./constants.js"
import { getValue } from "./loader.js"
import { getGlobalModelPreferences } from "./models.js"
import {
    getModelProvider,
    getProviderApiKey,
    normalizeProvider,
} from "./providers.js"

export function resolveAiAgents(config) {
    const { defaultModel, fallbackModel } = getGlobalModelPreferences(config)
    const requestedProvider = normalizeProvider(config.provider)
    const requestedFallbackProvider = String(
        getValue(config, ["FALLBACK_PROVIDER", "fallbackProvider"], ""),
    )
        .trim()
        .toLowerCase()
    const baseUrlOverride = getValue(config, ["BASE_URL", "baseUrl"], "")

    const primaryModel =
        defaultModel ||
        PROVIDER_DEFAULTS[requestedProvider]?.model ||
        PROVIDER_DEFAULTS[DEFAULT_PROVIDER].model

    const primaryProvider = getModelProvider(primaryModel) || requestedProvider
    const primaryApiKey =
        getProviderApiKey(config, primaryProvider) ||
        getValue(config, ["apiKey"], "")

    const fallbackProvider = fallbackModel
        ? requestedFallbackProvider ||
          getModelProvider(fallbackModel) ||
          primaryProvider
        : ""

    const rawFallbackApiKey = fallbackModel
        ? getProviderApiKey(config, fallbackProvider) || primaryApiKey
        : ""

    const canUseFallback =
        Boolean(fallbackModel) &&
        (fallbackProvider === primaryProvider ||
            Boolean(getProviderApiKey(config, fallbackProvider)) ||
            Boolean(rawFallbackApiKey))

    const effectiveFallbackModel = canUseFallback ? fallbackModel : ""
    const fallbackApiKey = canUseFallback ? rawFallbackApiKey : ""

    const primaryDefaults =
        PROVIDER_DEFAULTS[primaryProvider] ||
        PROVIDER_DEFAULTS[DEFAULT_PROVIDER]
    const fallbackDefaults = fallbackProvider
        ? PROVIDER_DEFAULTS[fallbackProvider] ||
          PROVIDER_DEFAULTS[DEFAULT_PROVIDER]
        : null

    const agents = [
        {
            name: "primary",
            provider: primaryProvider,
            apiKey: primaryApiKey,
            model: primaryModel,
            fallbackModel: effectiveFallbackModel,
            fallbackProvider: fallbackProvider || primaryProvider,
            fallbackApiKey,
            fallbackBaseUrl: fallbackDefaults ? fallbackDefaults.baseUrl : "",
            baseUrl: baseUrlOverride || primaryDefaults.baseUrl,
            enabled: true,
        },
    ]

    return {
        agents: agents.filter(
            (agent) => agent.provider === "ollama" || agent.apiKey,
        ),
        defaultAgentName: "primary",
        providerDefaults: PROVIDER_DEFAULTS,
    }
}
