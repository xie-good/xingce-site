import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, readFile } from "node:fs/promises"

const source = JSON.parse(await readFile("site/source.json", "utf8"))
const directory = ".work/question-bank"
await mkdir(directory, { recursive: true })
const git = (...args) => execFileSync("git", ["-C", directory, ...args], { encoding: "utf8" })
if (!existsSync(`${directory}/.git`)) {
  git("init")
  git("remote", "add", "origin", source.repository)
}
if (git("remote", "get-url", "origin").trim() !== source.repository) {
  throw new Error("Question bank remote does not match site/source.json")
}
let revision = ""
try {
  revision = git("rev-parse", "HEAD").trim()
} catch {
  /* A freshly initialized source has no HEAD. */
}
if (revision !== source.revision) {
  git("fetch", "--depth", "1", "origin", source.revision)
  git("checkout", "--detach", "FETCH_HEAD")
}
if (git("rev-parse", "HEAD").trim() !== source.revision) {
  throw new Error("Question bank revision does not match site/source.json")
}
console.log(`SOURCE PASS revision=${source.revision}`)
