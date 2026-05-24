import { GoogleGenAI } from "@google/genai"

async function generateWithGemini(agent, prompt) {
    const ai = new GoogleGenAI({ apiKey: agent.apiKey })
    const result = await ai.models.generateContent({
        model: agent.model,
        contents: prompt,
        config: {
            temperature: 0,
            topP: 1,
        },
    })
    return result.text
}

async function generateWithOpenAICompatible(agent, prompt) {
    const endpoint = `${agent.baseUrl.replace(/\/$/, "")}/chat/completions`
    const headers = {
        Authorization: `Bearer ${agent.apiKey}`,
        "Content-Type": "application/json",
    }

    const body = {
        model: agent.model,
        temperature: 0.1,
        top_p: 1,
        messages: [
            {
                role: "system",
                content:
                    "Return only the commit message text requested by the user prompt.",
            },
            {
                role: "user",
                content: prompt,
            },
        ],
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers: agent.apiKey ? headers : {},
        body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
        const errorMessage =
            payload.error?.message || payload.message || response.statusText
        const rawProviderMessage = payload.error?.metadata?.raw
        const upstreamProvider = payload.error?.metadata?.provider_name
        const parts = [
            `${agent.provider} API error (${response.status}): ${errorMessage}`,
        ]

        if (upstreamProvider) {
            parts.push(`upstream provider: ${upstreamProvider}`)
        }
        if (rawProviderMessage) {
            parts.push(`details: ${rawProviderMessage}`)
        }
        if (response.status === 429) {
            parts.push(
                "tip: this is usually a temporary rate limit; retry, switch model, or use a fallback model/provider.",
            )
        }

        throw new Error(parts.join(" | "))
    }

    const content = payload.choices?.[0]?.message?.content
    if (typeof content === "string") {
        return content
    }
    if (Array.isArray(content)) {
        return content.map((part) => part.text || "").join("\n")
    }

    throw new Error(`Unexpected ${agent.provider} response format.`)
}

async function generateWithOllama(agent, prompt) {
    const baseUrl = agent.baseUrl.replace(/\/$/, "")
    const tagsResponse = await fetch(`${baseUrl}/api/tags`, {
        method: "GET",
    }).catch(() => null)
    if (!tagsResponse || !tagsResponse.ok) {
        throw new Error(
            `Ollama server is not running or not reachable at ${baseUrl}. Start Ollama and try again.`,
        )
    }

    const tagsPayload = await tagsResponse.json().catch(() => ({}))
    const availableModels = Array.isArray(tagsPayload.models)
        ? tagsPayload.models
        : []
    const requestedModel = String(agent.model || "").trim()
    const resolvedModel = availableModels.find((entry) => {
        const name = String(entry?.name || entry?.model || "").trim()
        return name === requestedModel
    })

    const selectedModel = resolvedModel
        ? String(
              resolvedModel.name || resolvedModel.model || requestedModel,
          ).trim()
        : String(
              availableModels[0]?.name || availableModels[0]?.model || "",
          ).trim()

    if (!selectedModel) {
        throw new Error(
            `Ollama is running at ${baseUrl}, but no installed models were returned from /api/tags. Pull a model with ollama pull <model> and try again.`,
        )
    }

    if (requestedModel && !resolvedModel) {
        console.error(
            `Ollama model not found: ${requestedModel}. Using ${selectedModel} instead.`,
        )
    }

    console.log(`Using Ollama model: ${selectedModel}`)

    const endpoint = `${baseUrl}/api/generate`
    const body = {
        model: selectedModel,
        prompt,
        stream: false,
        options: {
            context: [],
            temperature: 0.4,
            top_p: 0.9,
        },
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
        const errorMessage =
            payload.error || payload.message || response.statusText
        throw new Error(
            `${agent.provider} API error (${response.status}): ${errorMessage}`,
        )
    }

    if (typeof payload.response === "string") {
        return payload.response
    }

    throw new Error(`Unexpected ${agent.provider} response format.`)
}

export async function generateFromModel(agent, model, prompt) {
    const modelAgent = { ...agent, model }
    const provider = String(modelAgent.provider || "gemini").toLowerCase()
    if (provider === "gemini") {
        return generateWithGemini(modelAgent, prompt)
    }
    if (provider === "ollama") {
        return generateWithOllama(modelAgent, prompt)
    }
    return generateWithOpenAICompatible(modelAgent, prompt)
}
