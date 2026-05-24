export const DEFAULT_PROVIDER = "gemini"

export const PROVIDER_DEFAULTS = {
    gemini: {
        model: "gemini-2.5-flash",
        baseUrl: "",
    },
    groq: {
        model: "llama-3.3-70b-versatile",
        baseUrl: "https://api.groq.com/openai/v1",
    },
    deepseek: {
        model: "deepseek-chat",
        baseUrl: "https://api.deepseek.com/v1",
    },
    ollama: {
        model: "qwen2.5",
        baseUrl: "http://localhost:11434",
    },
}

export const MODEL_CATALOG = [
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "gemini", model: "gemini-2.0-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "groq", model: "llama-3.1-8b-instant" },
    { provider: "deepseek", model: "deepseek-chat" },
    { provider: "deepseek", model: "deepseek-reasoner" },
    { provider: "ollama", model: "qwen-2.5" },
]

export const PROVIDER_KEY_PREFIX = {
    gemini: "GEMINI",
    groq: "GROQ",
    deepseek: "DEEPSEEK",
    ollama: "OLLAMA",
}

export const PROVIDER_API_URLS = {
    gemini: "https://aistudio.google.com/app/apikey",
    groq: "https://console.groq.com/keys",
    deepseek: "https://platform.deepseek.com/api_keys",
    ollama: "" /* Ollama doesn't use API keys */,
}
