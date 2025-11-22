# Contributing to sweet-commit

Thanks for taking an interest in contributing! To keep collaboration smooth,
please follow this simple process before opening a pull request:

1. Create an Issue first
   - Open an issue describing the bug or feature request.
   - Use a clear title and include these details in the body:
     - **Summary**: Short description of the problem or feature.
     - **Steps to reproduce** (for bugs): exact steps, environment, and
       expected vs actual behaviour.
     - **Proposed solution** (for features): what you think should change,
       notes about API/UX, and any alternatives you considered.
     - **Screenshots / logs**: attach if applicable.
   - Wait for maintainers to triage and label the issue. You can comment
     in the issue with questions or additional info.

2. Work on the issue
   - Create a topic branch off of `dev` named with the pattern:
     - `fix/<short-description>` for bug fixes
     - `feat/<short-description>` for new features
     - `chore/<short-description>` for maintenance
   - Keep commits focused and well described. Prefer multiple small commits
     over one big change.

3. Open a Pull Request (PR)
   - Target branch: **base = `dev`** (PRs must be opened against `dev`).
   - In the PR description, reference the related issue, e.g. `Closes #123`.
   - Include a summary of changes, testing steps, and any manual checks.
   - Add screenshots or logs if the change affects UI or output.

4. PR Checklist
   - [ ] The PR targets the `dev` branch
   - [ ] The related issue is linked in the PR description
   - [ ] Tests added or updated where appropriate
   - [ ] Linter/formatting passes locally
   - [ ] Documentation updated if public behavior changed

5. Reviews and Merging
   - A maintainer will review your PR and may request changes.
   - Address review feedback by pushing follow-up commits to the same branch.
   - Once approved, maintainers will merge the PR into `dev`.

Notes
- If your change is large or risky, open a draft PR early so maintainers
  can give feedback during implementation.
- If you need help picking an issue to work on, ask in the relevant issue
  or open a short discussion issue describing what you'd like to attempt.

Thank you — your contributions make this project better!
