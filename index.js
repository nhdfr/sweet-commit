import * as p from '@clack/prompts';
import { execa } from 'execa';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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
            message: 'Provide a longer description of the change (use | to separate lines):',
            placeholder: 'First line|Second line|Third line (press enter to skip)',
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
        message: 'Describe the breaking changes (use | to separate lines):',
        placeholder: 'First line|Second line (press enter to skip)',
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
        const formattedDescription = commit_info.extended_description.trim().replace(/\|/g, '\n');
        commitMsg += `\n${formattedDescription}\n`;
    }

    if (commit_info.isBreaking && breakingChanges && breakingChanges.trim()) {
        const formattedBreakingChanges = breakingChanges.trim().replace(/\|/g, '\n');
        commitMsg += `\nBREAKING CHANGE: ${formattedBreakingChanges}\n`;
    }

    if (solvesIssues && issueReferences && issueReferences.trim()) {
        const formattedIssueRefs = issueReferences.trim().replace(/\|/g, '\n');
        commitMsg += `\nCloses: ${formattedIssueRefs}\n`;
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

        let commitCommand;
        let commitArgs;

        if (final_commit_msg.split('\n').length > 1) {
            const tempFile = join(tmpdir(), `commit-msg-${Date.now()}.txt`);
            writeFileSync(tempFile, final_commit_msg, 'utf8');

            commitCommand = 'git';
            commitArgs = ['commit', '-F', tempFile];

            try {
                const { stdout, stderr } = await execa(commitCommand, commitArgs);
                spinner.stop(' Commit successful!');

                if (stdout) {
                    console.log(stdout);
                }

                unlinkSync(tempFile);

            } catch (error) {
                try { unlinkSync(tempFile); } catch { }
                throw error;
            }
        } else {
            const { stdout, stderr } = await execa('git', ['commit', '-m', final_commit_msg]);
            spinner.stop(' Commit successful!');

            if (stdout) {
                console.log(stdout);
            }
        }

    } catch (error) {
        p.cancel(' Commit failed!');
        console.error('Error:', error.message);

        if (error.stderr) {
            console.error('Git error:', error.stderr);
        }

        console.log('\n Manual steps:');
        console.log('1. Copy the commit message above');
        console.log('2. Run: git commit -F commit_message.txt');
        console.log('3. Or create a file with your message and use git commit -F <filename>');
    }
} else {
    console.log('\n Next steps:');
    console.log('1. Copy the commit message above');
    console.log('2. For multi-line: git commit -F commit_message.txt');
    console.log('3. For single-line: git commit -m "your message"');
    console.log('4. Or run the script again to modify');
}
