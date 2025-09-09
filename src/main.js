import * as p from '@clack/prompts';
import { execa } from 'execa';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getStagedChanges } from './git.js';

const wrapText = (text, maxLength, indent = '') => {
    let result = '';
    let currentLine = indent;
    const words = text.split(' ');

    for (const word of words) {
        if ((currentLine + word).length <= maxLength) {
            currentLine += (currentLine === indent ? '' : ' ') + word;
        } else {
            result += currentLine + '\n';
            currentLine = indent + word;
        }
    }
    result += currentLine;
    return result;
};

async function handleManualCommit() {
    const commit_info = await p.group(
        {
            commit_type: () => p.select({
                message: 'Select commit type:',
                options: [
                    { value: 'feat', label: 'feat: A new feature' },
                    { value: 'fix', label: 'fix: A bug fix' },
                    { value: 'refactor', label: 'refactor: Code change that neither fixes a bug nor adds a feature' },
                    { value: 'perf', label: 'perf: Code change that improves performance' },
                    { value: 'docs', label: 'docs: Documentation only changes' },
                    { value: 'ci', label: 'ci: CI configuration or script changes' },
                    { value: 'style', label: 'style: Code style changes (whitespace, formatting, etc.)' },
                    { value: 'test', label: 'test: Adding or correcting tests' },
                    { value: 'chore', label: 'chore: Build process or auxiliary tool changes' },
                    { value: 'revert', label: 'revert: Revert a previous commit' },
                    { value: 'build', label: 'build: Build system or external dependency changes' },
                ],
            }),
            changes: () => p.text({
                message: 'Scope (e.g., component, filename):',
                placeholder: 'Leave empty for no scope',
            }),
            description: () => p.text({
                message: 'Short, imperative description:',
                placeholder: 'Add a new feature',
                validate(value) {
                    if (value.length === 0) return 'Description is required.';
                    if (value.length < 10) return 'Description must be at least 10 characters.';
                    return null;
                },
            }),

            extended_description: () => p.text({
                message: 'Longer description (optional, use | for new lines):',
                placeholder: 'First line|Second line|Third line (press Enter to skip)',
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
            message: 'Describe breaking changes (use | for new lines):',
            placeholder: 'First line|Second line (press Enter to skip)',
            validate(value) {
                if (value.length === 0) return 'Breaking changes description is required.';
                if (value.length < 10) return 'Description must be at least 10 characters.';
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
            message: 'Issue references (e.g., #123, #456):',
            validate(value) {
                if (value.length === 0) return 'Issue references are required.';
                return null;
            },
        });
    }

    function buildCommitMessage() {
        let commitMsg = '';

        const scope = commit_info.changes && commit_info.changes.trim() ? `(${commit_info.changes.trim()})` : '';
        const breakingIndicator = commit_info.isBreaking ? '!' : '';

        commitMsg += `${commit_info.commit_type}${scope}${breakingIndicator}: ${commit_info.description}
`;

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

    const final_commit_msg_raw = buildCommitMessage();

    const lines = final_commit_msg_raw.split('\n').filter(line => line.trim() !== '');
    const subject = lines[0];
    const body = lines.slice(1).join('\n');

    const wrappedBody = wrapText(body, 72);

    const displayMessage = subject + (wrappedBody ? '\n\n' + wrappedBody : '');

    p.note(displayMessage, ' Generated Commit Message');

    const proceed = await p.confirm({
        message: 'Do you want to commit with this message?',
        initialValue: true,
    });

    if (proceed) {
        try {
            const spinner = p.spinner();
            spinner.start('Committing changes...');

            if (final_commit_msg_raw.split('\n').length > 1) {
                const tempFile = join(tmpdir(), `commit-msg-${Date.now()}.txt`);
                writeFileSync(tempFile, final_commit_msg_raw, 'utf8');

                try {
                    await execa('git', ['commit', '-F', tempFile]);
                    spinner.stop(' Commit successful!');
                    unlinkSync(tempFile);
                } catch (error) {
                    try { unlinkSync(tempFile); } catch { }
                    throw error;
                }
            } else {
                await execa('git', ['commit', '-m', final_commit_msg_raw]);
                spinner.stop(' Commit successful!');
            }

        } catch (error) {
            p.cancel(' Commit failed!');
            console.error('Error:', error.message);

            if (error.stderr) {
                console.error('Git error:', error.stderr);
            }
        }
    } else {
        p.cancel('Operation cancelled.');
    }
}

export async function main() {
    try {
        const hasStagedChanges = await getStagedChanges();

        if (!hasStagedChanges) {
            p.cancel(' No staged changes found!');
            console.log('\n Please stage your changes first:');
            console.log('git add .                    # Stage all changes');
            console.log('git add <specific-files>     # Stage specific files');
            console.log('git status                   # Check what\'s staged');
            console.log('\nThen run this script again.');
            process.exit(1);
        }
    }
    catch (error) {
        p.cancel(' Failed to check git status!');
        console.error('Error:', error.message);
        process.exit(1);
    }

    await handleManualCommit();
}
