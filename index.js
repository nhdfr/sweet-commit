import * as p from '@clack/prompts';
import { execa } from 'execa';

try {
    const { stdout: statusOutput } = await execa('git', ['status', '--porcelain']);
    const hasStagedChanges = statusOutput.split('\n').some(line => line.startsWith('A ') || line.startsWith('M ') || line.startsWith('D ') || line.startsWith('R '));

    if (!hasStagedChanges) {
        p.cancel(' No staged changes found!');
        console.log('\n Please stage your changes first:');
        console.log('git add .                    # Stage all changes');
        console.log('git add <specific-files>     # Stage specific files');
        console.log('git status                   # Check what\'s staged');
        console.log('\nThen run this script again.');
        process.exit(1);
    }
} catch (error) {
    p.cancel(' Failed to check git status!');
    console.error('Error:', error.message);
    process.exit(1);
}

const commit_info = await p.group(
    {
        commit_type: () => p.select({
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
            message: 'what is the scope of this changes? (E.g.: component or file name)',
            placeholder: 'press enter to leave it  empty',
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

        extended_description: () => p.text({
            message: 'Provide a longer description of the change:',
            placeholder: 'press enter to leave it  empty',
        }),

        isBreaking: () => p.confirm({
            message: 'Are there any breaking changes?',
            initialValue: false,
        }),
    },
    {
        onCancel: () => {
            p.cancel('Operation cancelled.');
            process.exit(0);
        },
    }
);

let breakingChanges = null;
if (commit_info.isBreaking) {
    breakingChanges = await p.text({
        message: 'Describe the breaking changes:',
        validate(value) {
            if (value.length === 0) return 'Breaking changes description is required';
            if (value.length < 10) return 'Description must be at least 10 characters';
            return null;
        },
    });
}

const solvesIssues = await p.confirm({
    message: 'Does this change affect any open issues?',
    initialValue: false,
});

let issueReferences = null;
if (solvesIssues) {
    issueReferences = await p.text({
        message: 'Add issue references (e.g.: #123, #456):',
        validate(value) {
            if (value.length === 0) return 'Issue references are required';
            return null;
        },
    });
}

function buildCommitMessage() {
    let commitMsg = '';

    const scope = commit_info.changes && commit_info.changes.trim() ? `(${commit_info.changes.trim()})` : '';
    const breakingIndicator = commit_info.isBreaking ? '!' : '';

    commitMsg += `${commit_info.commit_type}${scope}${breakingIndicator}: ${commit_info.description}\n`;

    if (commit_info.extended_description && commit_info.extended_description.trim()) {
        commitMsg += `\n${commit_info.extended_description.trim()}\n`;
    }

    if (commit_info.isBreaking && breakingChanges && breakingChanges.trim()) {
        commitMsg += `\nBREAKING CHANGE: ${breakingChanges.trim()}\n`;
    }

    if (solvesIssues && issueReferences && issueReferences.trim()) {
        commitMsg += `\nCloses: ${issueReferences.trim()}\n`;
    }

    return commitMsg;
}

const final_commit_msg = buildCommitMessage();

const commitPreview = p.note(final_commit_msg, ' Generated Commit Message');

const proceed = await p.confirm({
    message: 'Do you want to commit with this message?',
    initialValue: true,
});

if (proceed) {
    try {
        const spinner = p.spinner();
        spinner.start('Committing changes...');

        const { stdout, stderr } = await execa('git', ['commit', '-m', final_commit_msg.split('\n')[0]]);

        spinner.stop(' Commit successful!');

        if (stdout) {
            console.log(stdout);
        }

        if (final_commit_msg.split('\n').length > 1) {
            console.log('\n Tip: To include the full message with description, you can amend:');
            console.log('git commit --amend');
        }

    } catch (error) {
        p.cancel(' Commit failed!');
        console.error('Error:', error.message);

        if (error.stderr) {
            console.error('Git error:', error.stderr);
        }

        console.log('\n Manual steps:');
        console.log('1. Copy the commit message above');
        console.log('2. Run: git commit -m "your message"');
    }
} else {
    console.log('\n Next steps:');
    console.log('1. Copy the commit message above');
    console.log('2. Run: git commit -m "your message"');
    console.log('3. Or run the script again to modify');
}
