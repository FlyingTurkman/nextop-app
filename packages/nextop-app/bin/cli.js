#!/usr/bin/env node
const { spawn, execSync } = require('child_process')
const path = require('path')




async function run() {
  const command = process.argv[2]

  if (command === 'dev') {
    console.log('⚡ NextOP: Electron süreci başlatılıyor...')

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
      console.log(`✅ Electron ${code} kodu ile kapandı.`)
      process.exit(code)
    })
  }
}

run()