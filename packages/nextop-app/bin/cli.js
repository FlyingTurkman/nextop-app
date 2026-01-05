#!/usr/bin/env node

import { spawn, execSync } from 'child_process'
import path from 'path'




async function run() {
  const command = process.argv[2]
  const root = process.cwd();

  if (command === 'dev') {
    console.log('NextOP Dev süreci başlıyor...')
    try {
      if (process.platform === 'win32') {
        execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' })
      }
    } catch (e) {

    }

    try {
      console.log("Electron kodları derleniyor (tsc)...")
      execSync('npx tsc -p tsconfig.json', { cwd: root, stdio: 'inherit' })
      
      console.log("Assetler kopyalanıyor...")
      execSync('npx cpx "electron/assets/**/*" dist/electron/assets', { cwd: root, stdio: 'inherit' })

      console.log("Build ve Copy işlemleri başarılı.")
    } catch (error) {
      console.error("Hazırlık aşamasında (tsc veya cpx) hata oluştu!")
      process.exit(1);
    }

    // 3. HER ŞEY HAZIR, ELECTRON'U ŞİMDİ FIRLAT
    console.log("NextOP başlatılıyor...");
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
      console.log(`Electron süreci ${code} kodu ile kapandı.`)
      process.exit(code ?? 0)
    })
  }
}

run()