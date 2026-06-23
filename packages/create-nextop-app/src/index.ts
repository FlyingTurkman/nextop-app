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


// Yerel olarak (npm link) global'e bağlanmış nextop-app'i projeye bağlar.
// Best-effort: global link yoksa hata fırlatmaz, registry sürümü kullanılmaya devam eder.
function runLink(projectPath: string): Promise<boolean> {
    return new Promise((resolve) => {
    const child = spawn('npm', ['link', 'nextop-app'], {
      cwd: projectPath,
      stdio: 'inherit',
      shell: true
    })

    child.on('close', (code) => resolve(code === 0))
    child.on('error', () => resolve(false))
  })
}


program
  .name('create-nextop-app')
  .description('Create a new NextOP app')
  .argument('[project-directory]', 'Project directory')
  .option('--link', 'Yerel (npm link ile global\'e bağlı) nextop-app\'i kullan — NextOP geliştirme içindir')
  .action(async (projectDir: string, options: { link?: boolean }) => {
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

        // --link: install'dan ÖNCE linkle. Böylece node_modules/nextop-app yerel sürüme symlink
        // olur ve npm install onu registry'den çekmeye çalışmaz (yerel sürüm yayınlanmamış olsa bile).
        if (options.link) {
            console.log(chalk.cyan('\n Linking local nextop-app (install öncesi)...'))
            const linked = await runLink(targetPath)
            console.log(linked
                ? chalk.green(' Linked local nextop-app (npm link).')
                : chalk.yellow(' Could not link nextop-app — global link yok mu? Install registry sürümünü deneyecek.'))
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