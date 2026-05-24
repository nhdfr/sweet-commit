import { getProviderApiUrl } from "../utils.js"
import { p } from "../prompts.js"
import { KEY_SUPPORTED_PROVIDERS } from "./selection.js"

export async function ensureProviderKey(provider, storedKeys) {
    if (
        !provider ||
        !KEY_SUPPORTED_PROVIDERS.includes(provider) ||
        provider === "ollama"
    ) {
        return
    }
    if (storedKeys[provider]) {
        return
    }

    const apiKey = await p.password({
        message: `${provider.toUpperCase()} API key\nGet your API key here: ${getProviderApiUrl(provider)}`,
        validate: (value) =>
            String(value || "").trim().length > 0
                ? undefined
                : "API key is required",
    })

    if (p.isCancel(apiKey)) {
        p.cancel("Operation cancelled.")
        process.exit(0)
    }

    storedKeys[provider] = String(apiKey).trim()
}
