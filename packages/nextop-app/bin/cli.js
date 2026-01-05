#!/usr/bin/env node

import { spawn, execSync } from 'child_process'
import path from 'path'




async function run() {
  const command = process.argv[2]
  const root = process.cwd();

  if (command === 'dev') {
    console.log('NextOP starting...')
    try {
      if (process.platform === 'win32') {
        execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' })
      }
    } catch (e) {

    }

    try {
      console.log("Compiling...")
      execSync('npx tsc -p tsconfig.json', { cwd: root, stdio: 'inherit' })
      
      console.log("Assets copying...")
      execSync('npx cpx "electron/assets/**/*" dist/electron/assets', { cwd: root, stdio: 'inherit' })

      console.log("Build completed.")
    } catch (error) {
      console.error("An error has occured while building!")
      process.exit(1);
    }

    console.log("NextOP starting...");
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
  }
}

run()