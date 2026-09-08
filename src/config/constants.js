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
}

export const MODEL_CATALOG = [
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "groq", model: "openai/gpt-oss-120b" },
    { provider: "groq", model: "openai/gpt-oss-20b" },
    { provider: "deepseek", model: "deepseek-chat" },
    { provider: "deepseek", model: "deepseek-reasoner" },
]

export const PROVIDER_KEY_PREFIX = {
    gemini: "GEMINI",
    groq: "GROQ",
    deepseek: "DEEPSEEK",
}

export const PROVIDER_API_URLS = {
    gemini: "https://aistudio.google.com/app/apikey",
    groq: "https://console.groq.com/keys",
    deepseek: "https://platform.deepseek.com/api_keys",
}

export const KEY_SUPPORTED_PROVIDERS = ["gemini", "groq", "deepseek"]
