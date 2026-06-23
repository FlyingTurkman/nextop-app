// Geliştirme bootstrap'ı: iki paketi kurar + derler + global'e linkler, mevcut test/'i siler,
// sonra create-nextop-app ile yerel nextop-app'e linkli "test" app'i oluşturur.
// Çalıştırma: npm run build-dev
import { execSync } from 'node:child_process'
import { rmSync, existsSync, renameSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = (name) => path.join(root, 'packages', name)

function run(cmd, cwd = root) {
  console.log(`\n$ ${cmd}   (cwd: ${path.relative(root, cwd) || '.'})`)
  execSync(cmd, { cwd, stdio: 'inherit', shell: true })
}

// Bir klasörü dayanıklı biçimde siler. Windows'ta bir editör/süreç native modülü
// (ör. VS Code Tailwind eklentisi @tailwindcss/oxide'ı) kilitleyebilir; bu durumda
// silmek yerine kenara taşıyıp (rename) devam eder — kilit kalkınca temizlenir.
function removeDirResilient(dir) {
  if (!existsSync(dir)) return
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
  } catch {
    const aside = `${dir}.old-${Date.now()}`
    renameSync(dir, aside)
    console.warn(`UYARI: "${path.basename(dir)}" silinemedi (bir süreç kilitliyor — VS Code Tailwind eklentisi?). "${path.basename(aside)}" olarak taşındı; editörü kapatınca silebilirsin.`)
  }
}

// Önceki çalıştırmalardan kalan kilitli "test.old-*" / "test._locked_*" orphan'larını best-effort temizle.
function cleanOrphans() {
  for (const entry of readdirSync(root)) {
    if (/^test\.(old-|_locked_)/.test(entry)) {
      try {
        rmSync(path.join(root, entry), { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
        console.log(`Orphan temizlendi: ${entry}`)
      } catch {
        // hâlâ kilitli — sonraki çalıştırmada dene
      }
    }
  }
}

// 1) create-nextop-app: kur + derle + linkle
run('npm install', pkg('create-nextop-app'))
run('npm run build', pkg('create-nextop-app'))
run('npm link', pkg('create-nextop-app'))

// 2) nextop-app: kur + derle + linkle (test --link bunun global linkini gerektirir)
run('npm install', pkg('nextop-app'))
run('npm run build', pkg('nextop-app'))
run('npm link', pkg('nextop-app'))

// 3) mevcut test/ varsa sil (+ eski orphan'ları temizle)
cleanOrphans()
const testDir = path.join(root, 'test')
if (existsSync(testDir)) {
  console.log('\nMevcut test/ kaldırılıyor...')
  removeDirResilient(testDir)
}

// 4) test app'i oluştur + yerel nextop-app'i linkle (--link)
const cli = path.join(pkg('create-nextop-app'), 'dist', 'index.js')
run(`node "${cli}" test --link`, root)

console.log('\n✓ build-dev tamamlandı: paketler kuruldu/linklendi, "test" app oluşturuldu (yerel nextop-app linkli).')
