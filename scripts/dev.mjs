#!/usr/bin/env node
// 开发期双进程启动：前端开发服务器 + 后端 API 进程。
// 使用 Node 内置能力，不引入 concurrently 之类额外依赖。
import { spawn } from 'node:child_process'

const children = [
  { name: 'server', command: 'npm', args: ['run', 'dev:server'] },
  { name: 'web', command: 'npm', args: ['run', 'dev:web'] },
]

const running = children.map(({ name, command, args }) => {
  const child = spawn(command, args, { stdio: 'inherit', env: process.env })
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[dev] ${name} 进程退出，退出码 ${code}`)
      stopAll(code)
    }
  })
  return child
})

let stopping = false
function stopAll(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of running) child.kill('SIGTERM')
  setTimeout(() => process.exit(code), 200).unref()
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
