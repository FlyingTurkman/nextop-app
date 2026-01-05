#!/usr/bin/env node

import { Command } from 'commander'
import fs from 'fs-extra'
import path from 'path'
import chalk from 'chalk'
import prompts from 'prompts'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const program = new Command()


const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)


function runInstall(projectPath: string) {
    return new Promise((resolve, reject) => {
    const child = spawn('npm', ['install'], {
      cwd: projectPath,
      stdio: 'inherit',
      shell: true
    })

    child.on('close', (code) => {
      if (code === 0) resolve(true)
      else reject(new Error('Bağımlılıklar yüklenirken bir hata oluştu.'))
    })
  })
}


program
  .name('create-nextop-app')
  .description('Create a new NextOP app')
  .argument('[project-directory]', 'Project directory')
  .action(async (projectDir: string) => {
    let targetDir = projectDir

    if (!targetDir) {
      const response = await prompts({
        type: 'text',
        name: 'projectName',
        message: 'Please type a project name',
        initial: 'my-nextop-app',
        validate: value => value.length > 0 ? true : 'Please type a valid name.'
      });

      targetDir = response.projectName
    }

    if (!targetDir) {
      console.log(chalk.yellow('\nProcess canceled.'))
      process.exit(0)
    }

    const targetPath = path.join(process.cwd(), targetDir)
    const templatePath = path.join(__dirname, '../templates/default')

    console.log(chalk.blue(`\n${targetDir} creating...\n`))

    try {
        if (fs.existsSync(targetPath)) {
            console.error(chalk.red(`Error: ${targetDir} already exist.`))
            process.exit(1)
        }
        console.log(chalk.gray(`Files creating...`))
        await fs.copy(templatePath, targetPath)

        const packPath = path.join(targetPath, 'package.json')
        if (fs.existsSync(packPath)) {
            const pack = await fs.readJson(packPath)
            pack.name = targetDir
            await fs.writeJson(packPath, pack, { spaces: 2 })
        }

        console.log(chalk.cyan('\n Installing...'))
        await runInstall(targetPath)


        console.log(chalk.green(`\n Project created succesfully.`))
        console.log(`\nBaşlamak için:\n  cd ${targetDir} \n  npm run dev\n`)

    } catch (error) {
        console.error(chalk.red(`\n Error ${error}`))
        process.exit(1)
    }
})

program.parse(process.argv)