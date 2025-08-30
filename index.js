import chalk from "chalk";
import inquirer from "inquirer";

console.log(chalk.blue('hey'))

async function askName() {
    const answers = await inquirer.prompt({
        name: 'player_name',
        type: 'input',
        message: 'what is your name',
        default() {
            return 'James'
        },
    });
   let  playerName = answers.player_name
}
await askName()

async function question(){
    const answers = await inquirer.prompt({
        name: 'question',
        type: 'list',
        message: 'what does your commit do\n',

        choices: [
            'feat: add a featrue',
            'fix: fixes a bug',
            'ci: changes in the ci',
        ]
    })
    let commitSelection = answers.question
}

await question()


