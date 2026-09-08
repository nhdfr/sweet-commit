import { GoogleGenAI } from "@google/genai"

const SYSTEM_PROMPT =
    "You are an expert engineer writing conventional commit messages from git diffs. Always return plain text commit message output only."

const PROVIDER_CONFIG = {
    groq: {
        temperature: 0.3,
        maxTokens: 1024,
    },
    deepseek: {
        temperature: 0.2,
        maxTokens: 1024,
    },
}

async function generateWithGemini(agent, prompt) {
    const ai = new GoogleGenAI({ apiKey: agent.apiKey })
    const result = await ai.models.generateContent({
        model: agent.model,
        contents: prompt,
    })
    return result.text
}

async function generateWithOpenAICompatible(agent, prompt) {
    const endpoint = `${agent.baseUrl.replace(/\/$/, "")}/chat/completions`
    const headers = {
        Authorization: `Bearer ${agent.apiKey}`,
        "Content-Type": "application/json",
    }

    const providerConfig = PROVIDER_CONFIG[agent.provider] || {
        temperature: 0.2,
        maxTokens: 1024,
    }

    const body = {
        model: agent.model,
        temperature: providerConfig.temperature,
        max_tokens: providerConfig.maxTokens,
        messages: [
            {
                role: "system",
                content: SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: prompt,
            },
        ],
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers,
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

export async function generateFromModel(agent, model, prompt) {
    const modelAgent = { ...agent, model }
    const provider = String(modelAgent.provider || "gemini").toLowerCase()
    if (provider === "gemini") {
        return generateWithGemini(modelAgent, prompt)
    }
    return generateWithOpenAICompatible(modelAgent, prompt)
}
