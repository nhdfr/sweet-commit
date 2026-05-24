function buildToneRules(humanLikeCommit) {
    if (!humanLikeCommit) {
        return ""
    }

    return `
        Tone:
        - Keep it natural and concise.
        - Do not sound like a release note or an AI assistant.
        - Do not use phrases like "This commit" or "AI-generated".
        - Keep the subject lowercase after the colon.
        - Do not end the subject with a period.
    `
}

function buildOutputContract(style) {
    if (style === "short") {
        return `
            Output contract:
            - Output plain text only.
            - Exactly one subject line.
            - Subject format: type(scope): description or type: description.
            - Subject length <= 72 characters.
            - No body unless absolutely necessary.
        `
    }

    if (style === "detailed") {
        return `
            Output contract:
            - Output plain text only.
            - Subject first line in conventional commit format.
            - Add a blank line, then body bullets only.
            - 2 to 6 bullets, each starting with '- '.
            - Each bullet describes one concrete change or reason.
            - No paragraphs.
        `
    }

    return `
        Output contract:
        - Output plain text only.
        - Subject first line in conventional commit format.
        - If the diff is small/simple, return subject only.
        - If the diff is medium/large, add a blank line and 1 to 4 body bullets.
        - Body bullets only, no paragraphs.
    `
}

function buildRefinementOutputContract(refinementNote, style) {
    const note = String(refinementNote || "").trim()

    if (!note) {
        return ""
    }

    if (style === "short") {
        return `
            Refinement output contract (short mode):
            - Output plain text only.
            - Exactly one subject line (conventional commit format).
            - Do not include a body or bullets.
        `
    }

    return `
        Refinement output contract:
        - Follow the user's guidance first.
        - Return a subject line plus 2 to 4 body bullets.
        - Bullets should stay close to the requested framing and not broaden into a different feature.
    `
}

function buildCoreRules() {
    return `
        Rules:
        - Choose the most specific type from: feat, fix, refactor, perf, docs, test, build, ci, chore, revert.
        - Scope should match the main area changed (module, package, feature, command).
        - Scope must be a short logical area (for example: ai, cli, config, model, git, setup).
        - Never use file paths, filenames, extensions, or slashes in scope.
        - Use imperative mood.
        - Describe what changed and why, not implementation trivia.
        - Mention breaking changes only if the diff clearly indicates one.
        - Avoid vague text like "update files" or "misc changes".
        - Do not include code fences, quotes, headings, or explanations outside the commit message.
`
}

function buildDecisionProtocol() {
    return `
        Decision protocol (follow in order):
        1) Read the full diff and infer the dominant change intent across all changed files.
        2) Select type by impact priority:
            - If there is a clear new capability/behavior, use feat.
            - Else if there is a clear bug/compatibility correction, use fix.
            - Else if there is a clear performance gain, use perf.
            - Else if behavior is preserved and structure is improved, use refactor.
            - Else use docs/test/build/ci/chore/revert only when clearly dominant.
        3) Select scope:
        - If one subsystem clearly dominates, use that subsystem token.
        - If multiple subsystems are equally affected, use no scope or a broad scope like core.
        - Never pick scope from a raw file path.
        4) Write one precise subject line that summarizes the whole changeset, not a single file.

        If guidance is present:
        - Let the guidance determine the framing before considering the diff.
        - Do not independently search for a broader main feature.
        - Do not reframe the commit around repository-level summaries or downstream effects.
        - Interpret the framing focus semantically, not literally.
        - Describe the behavioral or functional change implied by the framing focus.
        - Avoid mentioning filenames unless they are genuinely part of the feature itself.

        If uncertain:
        - Prefer a conservative, accurate message over a specific but wrong one.
        - Default type priority: feat > fix > perf > refactor > chore.
        - If still uncertain, avoid scope and return type: description.
`
}

function buildQualityGate() {
    return `
        Before final output, silently verify:
        - The subject reflects the overall diff, not one file.
        - Scope is valid and not a file path.
        - Wording is concrete and not generic.
        - The line does not match any example text exactly.
        - Output matches the required style contract exactly.
        - Return only the commit message text.
`
}

function buildExamples(style) {
    if (style === "short") {
        return `
            Examples:
            feat(search): add fuzzy query support for command filtering
            fix(auth): prevent token refresh loop on expired sessions
        `
    }

    return `
        Examples (the hyphens are the part of the output, not an instruction):
        refactor(cache): separate eviction policy from storage adapter

        - move policy decisions into a dedicated strategy helper
        - keep cache reads/writes in a focused adapter layer
        - reduce command handler branching for maintainability

        fix(importer): handle empty rows without aborting batch sync

        - skip malformed entries and continue ingesting valid records
        - surface row-level warnings while preserving successful imports
    `
}

function buildGuidanceBlock(refinementNote) {
    const note = String(refinementNote || "").trim()

    if (!note) {
        return ""
    }

    return `
        Guidance:
        - Primary framing focus: ${note}
        - Treat the framing focus as the main feature being described.
        - Mention larger adjacent changes only if they directly support the framing focus.
        - Do not describe infrastructure, setup, providers, or integrations unless the framing focus explicitly asks for them.

        - Use the framing focus as the primary interpretation context for the diff.
        - Keep the commit framing narrow and aligned with the framing focus.
        - Do not broaden the message into a different feature or repo-level summary.
    `
}

function buildPrompt(
    diff,
    style = "adaptive",
    humanLikeCommit = true,
    refinementNote = "",
) {
    const refinementMode = Boolean(String(refinementNote || "").trim())

    if (refinementMode) {
        return `You generate a single high-quality git commit message from a staged diff.
            ${buildOutputContract(style)}
            ${buildRefinementOutputContract(refinementNote, style)}
            ${buildToneRules(humanLikeCommit)}

            Git diff:
            ${diff}

            ${buildGuidanceBlock(refinementNote)}
        `
    }

    return `You generate a single high-quality git commit message from a staged diff.
        ${buildOutputContract(style)}
        ${buildCoreRules()}
        ${buildDecisionProtocol()}
        ${buildQualityGate()}
        ${buildToneRules(humanLikeCommit)}
        ${buildExamples(style)}

        Git diff:
        ${diff}
    `
}

export { buildPrompt }
