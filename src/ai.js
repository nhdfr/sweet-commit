import { buildPrompt } from "./ai/prompt.js"
import { cleanupModelResponse, enforceCommitMessageShape } from "./ai/format.js"
import { generateFromModel } from "./ai/providers.js"

export async function generateCommitMessage(
    agent,
    diff,
    style = "adaptive",
    humanLikeCommit = true,
    refinementNote = "",
) {
    if (!agent || (!agent.apiKey && agent.provider !== "ollama")) {
        throw new Error("No AI agent configured with a valid API key.")
    }

    const prompt = buildPrompt(diff, style, humanLikeCommit, refinementNote)
    const primaryModel = String(agent.model || "").trim()
    const fallbackModel = String(agent.fallbackModel || "").trim()

    try {
        const rawResponse = await generateFromModel(agent, primaryModel, prompt)
        const cleaned = cleanupModelResponse(rawResponse)
        return enforceCommitMessageShape(cleaned, style)
    } catch (primaryError) {
        if (fallbackModel && fallbackModel !== primaryModel) {
            const fallbackAgent = {
                ...agent,
                provider: agent.fallbackProvider || agent.provider,
                apiKey: agent.fallbackApiKey || agent.apiKey,
                baseUrl: agent.fallbackBaseUrl || agent.baseUrl,
            }
            const fallbackResponse = await generateFromModel(
                fallbackAgent,
                fallbackModel,
                prompt,
            )
            const cleaned = cleanupModelResponse(fallbackResponse)
            return enforceCommitMessageShape(cleaned, style)
        }
        throw primaryError
    }
}
