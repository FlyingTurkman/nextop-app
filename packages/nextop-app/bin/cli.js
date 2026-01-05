#!/usr/bin/env node

import { spawn, execSync } from 'child_process'
import path from 'path'




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

export async function devCommand() {
  const projectRoot = process.cwd();

  console.log('Electron dosyaları derleniyor...')
  try {
    execSync('npx tsc --outDir dist', { stdio: 'inherit', cwd: projectRoot })
    console.log('✅ Derleme başarılı.')
  } catch (err) {
    console.error('Derleme hatası: Electron kodlarında hata var.')
    process.exit(1)
  }
  const electronProcess = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true
  })
}

run()