import { mkdir, writeFile } from "node:fs/promises"

// Quartz fetches this file even without its search plugin. An empty compatibility index avoids both a 404 and a huge initial download.
await mkdir("public/static", { recursive: true })
await writeFile("public/static/contentIndex.json", "{}")
console.log("FINISH PASS compatibility-index=2-bytes")
