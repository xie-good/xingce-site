import { searchQuestions } from "./search-core.js"

const cache = new Map()
async function loadJson(name) {
  if (!cache.has(name)) {
    const pending = fetch(new URL(name, import.meta.url))
      .then((response) => {
        if (!response.ok) throw new Error(`搜索索引下载失败（${response.status}）`)
        return response.json()
      })
      .catch((error) => {
        cache.delete(name)
        throw error
      })
    cache.set(name, pending)
  }
  return cache.get(name)
}

self.onmessage = async ({ data: { requestId, query } }) => {
  try {
    const manifest = await loadJson("search-manifest.json")
    const modules = manifest.modules.filter((module) => !query.module || module.id === query.module)
    const shards = await Promise.all(
      modules.map(async (module) => ({ module, data: await loadJson(module.index) })),
    )
    self.postMessage({ requestId, ...searchQuestions(shards, query) })
  } catch (error) {
    self.postMessage({ requestId, error: error.message })
  }
}
