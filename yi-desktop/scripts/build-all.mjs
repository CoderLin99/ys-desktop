/**
 * yi-desktop 统一打包 CLI — 所有平台的唯一构建入口。
 *
 * 用法：
 *   node scripts/build-all.mjs <子命令>
 *   npm run build -- <子命令>        （推荐，自动选用 Node 22）
 *
 * 子命令：
 *   win       Windows NSIS 安装包（需 MSVC）
 *   android   Android APK aarch64（含 symlink fallback）
 *   ios       iOS 构建说明（Windows 不可用）
 *   vite      仅构建前端 dist/
 *   classics  古籍 RAG：扫描本地书仓 + BM25 索引
 *   all       依次执行 classics → vite → win → android
 *   agents    生成 .cursor/agents/*.md 供 Cursor 复用
 *   help      显示帮助
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** @type {string} 项目根目录（yi-desktop/） */
const ROOT = path.resolve(__dirname, '..')

/** Node 18+ 校验，与 fetch-classics.mjs 保持一致 */
const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor < 18) {
  console.error(`build-all 需要 Node.js >= 18（当前 ${process.version}）`)
  console.error('请使用：npm run build -- <子命令>（会自动选用 Node 22）')
  process.exit(1)
}

/** 子命令 → 说明 */
const COMMANDS = {
  win: 'Windows NSIS 安装包（scripts/build-win.ps1）',
  android: 'Android APK aarch64（scripts/build-android.ps1，含 symlink fallback）',
  ios: 'iOS 构建说明（scripts/build-ios.ps1，Windows 不可用）',
  vite: '仅构建前端 dist/（vite build）',
  classics: '古籍 RAG：本地书仓扫描 + BM25 索引（classics:build）',
  all: '全量打包：classics → vite → win → android',
  agents: '生成 Cursor agent 文档（.cursor/agents/*.md）',
  help: '显示此帮助'
}

/**
 * 打印 CLI 帮助信息。
 */
function printHelp() {
  console.log(`
yi-desktop 统一打包 CLI

用法:
  npm run build -- <子命令>
  node scripts/build-all.mjs <子命令>

子命令:
${Object.entries(COMMANDS)
  .map(([k, v]) => `  ${k.padEnd(10)} ${v}`)
  .join('\n')}

产物路径:
  Windows  release/YiDesktop_<ver>_x64-setup.exe
  Android  release/YiDesktop_<ver>_arm64.apk

详见 DEV.md
`.trim())
}

/**
 * 同步执行命令，失败时退出进程。
 * @param {string} label 日志前缀
 * @param {string} cmd 可执行文件
 * @param {string[]} args 参数列表
 * @param {{ cwd?: string, shell?: boolean }} [opts] spawn 选项
 */
function run(label, cmd, args, opts = {}) {
  console.log(`\n▶ [${label}] ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: opts.shell ?? false,
    ...opts
  })
  if (r.status !== 0) {
    console.error(`\n✗ [${label}] 失败，退出码 ${r.status ?? 'unknown'}`)
    process.exit(r.status ?? 1)
  }
  console.log(`✓ [${label}] 完成`)
}

/**
 * 通过 resolve-node.ps1 执行 Node 脚本，保证 Node 22（不依赖 PATH）。
 * @param {string} label 日志前缀
 * @param {string} scriptPath 相对 ROOT 或绝对路径的 .mjs/.js
 * @param {string[]} [extraArgs] 传给脚本的额外参数
 */
function runViaResolveNode(label, scriptPath, extraArgs = []) {
  const resolveNode = path.join(ROOT, 'scripts', 'resolve-node.ps1')
  const abs = path.isAbsolute(scriptPath) ? scriptPath : path.join(ROOT, scriptPath)
  run(label, 'powershell', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    resolveNode,
    abs,
    ...extraArgs
  ])
}

/**
 * 执行 PowerShell 打包脚本。
 * @param {string} label 日志前缀
 * @param {string} ps1Name scripts/ 下的 .ps1 文件名
 */
function runPs1(label, ps1Name) {
  const script = path.join(ROOT, 'scripts', ps1Name)
  run(label, 'powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script])
}

/**
 * 执行 vite build（经 resolve-node 直调，避免 PATH 用错 Node 版本）。
 */
function runVite() {
  runViaResolveNode('vite', 'node_modules/vite/bin/vite.js', ['build'])
}

/**
 * 执行古籍 RAG 全量构建（fetch → index）。
 */
function runClassics() {
  runViaResolveNode('classics:fetch', 'scripts/fetch-classics.mjs')
  runViaResolveNode('classics:index', 'scripts/index-classics.mjs')
}

/**
 * 生成 Cursor agent 文档。
 */
function runAgents() {
  const gen = path.join(ROOT, 'scripts', 'generate-build-agents.mjs')
  run('agents', process.execPath, [gen])
}

/**
 * 全量打包：classics → vite → win → android。
 */
function runAll() {
  runClassics()
  runVite()
  runPs1('win', 'build-win.ps1')
  runPs1('android', 'build-android.ps1')
}

/** @type {Record<string, () => void>} 子命令处理器 */
const handlers = {
  win: () => runPs1('win', 'build-win.ps1'),
  android: () => runPs1('android', 'build-android.ps1'),
  ios: () => runPs1('ios', 'build-ios.ps1'),
  vite: runVite,
  classics: runClassics,
  all: runAll,
  agents: runAgents,
  help: printHelp
}

const cmd = (process.argv[2] || 'help').toLowerCase()
const handler = handlers[cmd]
if (!handler) {
  console.error(`未知子命令: ${cmd}\n`)
  printHelp()
  process.exit(1)
}
handler()
