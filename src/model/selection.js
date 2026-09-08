import { getModelProvider } from "../utils.js"
import { p } from "../prompts.js"
import { KEY_SUPPORTED_PROVIDERS } from "../config/constants.js"
import { toSelectOptions } from "./options.js"

export { KEY_SUPPORTED_PROVIDERS }

function assertNotCancelled(value) {
    if (p.isCancel(value)) {
        p.cancel("Operation cancelled.")
        process.exit(0)
    }
}

export async function selectPrimaryModel(
    discoveredModels,
    defaultModel,
    providersByModel,
) {
    const primaryChoice = await p.select({
        message: "Select global primary model",
        initialValue:
            defaultModel && discoveredModels.includes(defaultModel)
                ? defaultModel
                : discoveredModels[0],
        options: [
            ...toSelectOptions(discoveredModels, providersByModel),
            {
                value: "__custom__",
                label: "Custom model...",
                hint: "Enter any model name manually",
            },
        ],
    })
    assertNotCancelled(primaryChoice)

    if (primaryChoice !== "__custom__") {
        const model = String(primaryChoice).trim()
        return {
            model,
            provider: getModelProvider(model) || "",
        }
    }

    return chooseCustomModel("Enter primary model name", "gemini-2.5-flash")
}

export async function selectFallbackModel(
    discoveredModels,
    fallbackModel,
    primaryModel,
    providersByModel,
) {
    const fallbackCandidates = [
        ...new Set([...discoveredModels, primaryModel]),
    ].sort((a, b) => a.localeCompare(b))

    const fallbackChoice = await p.select({
        message: "Select global fallback model",
        initialValue:
            fallbackModel && fallbackCandidates.includes(fallbackModel)
                ? fallbackModel
                : "__none__",
        options: [
            {
                value: "__none__",
                label: "None",
                hint: "Do not use fallback",
            },
            ...toSelectOptions(fallbackCandidates, providersByModel),
            {
                value: "__custom__",
                label: "Custom model...",
                hint: "Enter any model name manually",
            },
        ],
    })
    assertNotCancelled(fallbackChoice)

    if (fallbackChoice === "__none__") {
        return { model: "", provider: "" }
    }

    if (fallbackChoice !== "__custom__") {
        const model = String(fallbackChoice).trim()
        return {
            model,
            provider: getModelProvider(model) || "",
        }
    }

    return chooseCustomModel("Enter fallback model name", "deepseek-chat")
}

async function chooseCustomModel(promptMessage, placeholder) {
    const typed = await p.text({
        message: promptMessage,
        placeholder,
        validate: (value) =>
            String(value || "").trim().length > 0
                ? undefined
                : "Model is required",
    })
    assertNotCancelled(typed)

    const providerChoice = await p.select({
        message: "Select provider",
        options: KEY_SUPPORTED_PROVIDERS.map((provider) => ({
            value: provider,
            label: provider,
        })),
    })
    assertNotCancelled(providerChoice)

    return {
        model: String(typed).trim(),
        provider: String(providerChoice).trim(),
    }
}
