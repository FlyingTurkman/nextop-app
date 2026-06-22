#!/usr/bin/env node

import { spawn, execSync } from 'child_process'


/** Electron katmanını derler (tsc) ve asset'leri dist'e kopyalar. dev ve build ortak adımı. */
function compileElectron(root) {
  console.log("Compiling Electron (tsc)...")
  execSync('npx tsc -p tsconfig.json', { cwd: root, stdio: 'inherit' })

  console.log("Copying assets...")
  execSync('npx cpx "electron/assets/**/*" dist/electron/assets', { cwd: root, stdio: 'inherit' })
}


async function run() {
  const command = process.argv[2]
  const root = process.cwd()

  if (command === 'dev') {
    console.log('NextOP dev starting...')

    try {
      if (process.platform === 'win32') {
        execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' })
      }
    } catch (e) {

    }

    try {
      compileElectron(root)
      console.log("Build completed.")
    } catch (error) {
      console.error("An error has occured while building!")
      process.exit(1)
    }

    console.log("NextOP starting...")
    const electron = spawn('npx', ['electron', '.'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NEXTOP_RUNTIME: 'true',
        NODE_ENV: 'development'
      }
    })

    electron.on('close', (code) => {
      console.log(`Electron closed by code: ${code}.`)
      process.exit(code ?? 0)
    })

    return
  }

  if (command === 'build') {
    console.log('NextOP production build starting...')

    try {
      // 1) Electron main/preload derle + asset'leri kopyala.
      compileElectron(root)

      // 2) Next.js'i production için derle (paketli uygulama bunu dev:false ile çalıştırır).
      console.log("Building Next.js (next build)...")
      execSync('npx next build', {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      })

      // 3) electron-builder ile dağıtılabilir paket üret.
      console.log("Packaging with electron-builder...")
      execSync('npx electron-builder', { cwd: root, stdio: 'inherit' })

      console.log("Build completed. Output: 'release/' directory.")
    } catch (error) {
      console.error("An error has occured during build!", error?.message ?? error)
      process.exit(1)
    }

    return
  }

  console.error(`Unknown command: ${command ?? '(none)'}. Use "nextop dev" or "nextop build".`)
  process.exit(1)
}

run()
