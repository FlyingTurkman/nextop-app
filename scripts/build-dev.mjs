// Development bootstrap: installs + builds + globally links both packages, removes the existing
// test/, then creates a "test" app via create-nextop-app linked to the local nextop-app.
// Run: npm run build-dev
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

// Removes a directory resiliently. On Windows an editor/process may lock a native module
// (e.g. the VS Code Tailwind extension locks @tailwindcss/oxide); in that case it moves the
// directory aside (rename) instead of deleting and continues — it gets cleaned up once unlocked.
function removeDirResilient(dir) {
  if (!existsSync(dir)) return
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
  } catch {
    const aside = `${dir}.old-${Date.now()}`
    renameSync(dir, aside)
    console.warn(`WARNING: could not delete "${path.basename(dir)}" (a process is locking it — VS Code Tailwind extension?). Moved to "${path.basename(aside)}"; you can delete it after closing the editor.`)
  }
}

// Best-effort cleanup of locked "test.old-*" / "test._locked_*" orphans left from previous runs.
function cleanOrphans() {
  for (const entry of readdirSync(root)) {
    if (/^test\.(old-|_locked_)/.test(entry)) {
      try {
        rmSync(path.join(root, entry), { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
        console.log(`Orphan cleaned: ${entry}`)
      } catch {
        // still locked — try on the next run
      }
    }
  }
}

// 1) create-nextop-app: install + build + link
run('npm install', pkg('create-nextop-app'))
run('npm run build', pkg('create-nextop-app'))
run('npm link', pkg('create-nextop-app'))

// 2) nextop-app: install + build + link (test --link requires this global link)
run('npm install', pkg('nextop-app'))
run('npm run build', pkg('nextop-app'))
run('npm link', pkg('nextop-app'))

// 3) remove the existing test/ if present (+ clean up old orphans)
cleanOrphans()
const testDir = path.join(root, 'test')
if (existsSync(testDir)) {
  console.log('\nRemoving existing test/...')
  removeDirResilient(testDir)
}

// 4) create the test app + link the local nextop-app (--link)
const cli = path.join(pkg('create-nextop-app'), 'dist', 'index.js')
run(`node "${cli}" test --link`, root)

console.log('\n✓ build-dev complete: packages installed/linked, "test" app created (linked to local nextop-app).')
