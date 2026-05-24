import {
    DEFAULT_PROVIDER,
    MODEL_CATALOG,
    PROVIDER_API_URLS,
    PROVIDER_DEFAULTS,
    PROVIDER_KEY_PREFIX,
} from "./constants.js"
import { getValue } from "./loader.js"

export function normalizeProvider(value) {
    const provider = String(value || DEFAULT_PROVIDER)
        .trim()
        .toLowerCase()
    return PROVIDER_DEFAULTS[provider] ? provider : DEFAULT_PROVIDER
}

export function providerToConfigPrefix(provider) {
    return (
        PROVIDER_KEY_PREFIX[normalizeProvider(provider)] ||
        PROVIDER_KEY_PREFIX[DEFAULT_PROVIDER]
    )
}

export function getProviderApiUrl(provider) {
    return PROVIDER_API_URLS[normalizeProvider(provider)] || ""
}

export function getProviderApiKeyField(provider) {
    return `${providerToConfigPrefix(provider)}_API_KEY`
}

export function getProviderApiKey(config, provider) {
    return getValue(config, [getProviderApiKeyField(provider)], "")
}

export function getModelProvider(model) {
    const entry = MODEL_CATALOG.find((item) => item.model === model)
    return entry ? entry.provider : null
}

export function getAllProviderKeys(config) {
    return {
        gemini: getProviderApiKey(config, "gemini"),
        groq: getProviderApiKey(config, "groq"),
        deepseek: getProviderApiKey(config, "deepseek"),
        ollama: "" /* Ollama doesn't use API keys */,
    }
}
