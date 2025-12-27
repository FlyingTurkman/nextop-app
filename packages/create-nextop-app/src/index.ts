#!/usr/bin/env node

import { Command } from 'commander'
import fs from 'fs-extra'
import path from 'path'
import chalk from 'chalk'








const program = new Command()

program
.name('create-nextop-app')
.description('description')
.argument('<project-directory>', 'Project directory name')
.action(async (projectDir) => {
    const targetPath = path.join(process.cwd(), projectDir)
    const templatePath = path.join(__dirname, '../templates/default')

    console.log(chalk.blue(`\n creating ${projectDir}...\n`))

    try {
        
        if (fs.existsSync(targetPath)) {
            console.error(chalk.red(`Error: ${projectDir} directory already exist.`))
        }

        console.log(chalk.gray(`Files copying...`))
        await fs.copy(templatePath, targetPath)

        const packPath = path.join(targetPath, 'package.json')

        if (fs.existsSync(packPath)) {
            const pack = await fs.readJson(packPath)
            pack.name = projectDir
            await fs.writeJson(packPath, pack, { spaces: 2 })
        }

        console.log(chalk.green(`\n Project created succesfully.`))

    } catch (error) {
        console.error(chalk.red(`An error occured: ${error}`))
        process.exit(1)
    }
})


program.parse(process.argv)