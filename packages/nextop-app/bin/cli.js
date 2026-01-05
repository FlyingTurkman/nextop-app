#!/usr/bin/env node
const { spawn, execSync } = require('child_process')
const path = require('path')




async function run() {
  const command = process.argv[2]

  if (command === 'dev') {
    console.log('NextOP running...')

    try {
      execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' })
    } catch (e) {
    }

    const electron = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      env: { 
        ...process.env, 
        NEXTOP_RUNTIME: 'true',
        NODE_ENV: 'development'
      }
    })

    electron.on('close', (code) => {
      console.log(`✅ Electron closed by ${code}.`)
      process.exit(code)
    })
  }
}

run()