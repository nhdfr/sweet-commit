import * as p from '@clack/prompts';

const group = await p.group(
    {
        commit_tyepe: () => p.select({
            message: 'what does the changes does.',
            options: [
                { value: 'feat', label: 'feat: a new feature' },
                { value: 'fix', label: 'fix: a bug fix' },
                { value: 'refactor', label: 'refactor: a code change that neither fixes a bug nor adds a feature' },
                { value: 'perf', label: 'perf: a code change that improves performance' },
                { value: 'docs', label: 'docs: documentation only changes' },
                { value: 'ci', label: 'ci: changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)' },
                { value: 'style', label: 'style: changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)' },
                { value: 'test', label: 'test: adding missing tests or correcting existing tests' },
                { value: 'chore', label: 'chore: changes to the build process or auxiliary tools and libraries such as documentation generation' },
                { value: 'revert', label: 'revert: revert a previous commit' },
                { value: 'build', label: 'build: changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)' },

            ],
        }),
        changes: () => p.text({
            message: 'what is the scope of this changes? (E.g.: component or file name) (optional)',
        }),
        description: () => p.text({
            message: 'Write a short, imperative tense description of the change:',
            placeholder: 'Add a new feature',
            validate(value) {
                if (value.length === 0) return 'Description is required';
                if (value.length < 10) return 'Description must be at least 10 characters';
                return null;
            },
        }),
        isBreaking: () => p.confirm({
            message: 'Are there any breaking changes?',
            initialValue: false,
        }),
        breakingChanges: ({ isBreaking }) => {
            if (!isBreaking) return null;
            return p.text({
                message: 'Describe the breaking changes:',
                validate(value) {
                    if (value.length === 0) return 'Breaking changes description is required';
                    if (value.length < 10) return 'Description must be at least 10 characters';
                    return null;
                },
            });
        }

    },
);

console.log(group.name, group.age, group.color);
