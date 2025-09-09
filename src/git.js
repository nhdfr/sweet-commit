import { execa } from 'execa';

export async function getStagedChanges() {
    const { stdout: statusOutput } = await execa('git', ['status', '--porcelain']);
    return statusOutput.split('\n').some(line => line.startsWith('A ') || line.startsWith('M ') || line.startsWith('D ') || line.startsWith('R '));
}

export async function getStagedDiff() {
    const { stdout: diff } = await execa('git', ['diff', '--staged']);
    return diff;
}
