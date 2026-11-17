const form = document.querySelector("#question-search")
const results = document.querySelector("#search-results")
const status = document.querySelector("#search-status")
const pagination = document.querySelector("#search-pagination")
let worker,
  requestId = 0,
  offset = 0

const element = (tag, text, className) => {
  const node = document.createElement(tag)
  node.textContent = text
  if (className) node.className = className
  return node
}

function showError(message) {
  status.textContent = `${message}。请重新搜索；也可以直接按模块浏览。`
  form.removeAttribute("aria-busy")
}

function runSearch(nextOffset = 0) {
  const fields = Object.fromEntries(new FormData(form))
  const query = { ...fields, q: fields.q.trim(), offset: nextOffset }
  if (!query.q && !query.module && !query.year && !query.region) {
    status.textContent = "请输入关键词，或选择模块、年份、地区后搜索。"
    document.querySelector("#search-query").focus()
    return
  }
  offset = nextOffset
  requestId += 1
  results.replaceChildren()
  pagination.hidden = true
  status.textContent = "正在搜索，首次使用需要下载所选模块的索引…"
  form.setAttribute("aria-busy", "true")
  const parameters = new URLSearchParams(Object.entries(fields).filter(([, value]) => value))
  history.replaceState(null, "", `${location.pathname}?${parameters}#question-search`)
  try {
    if (!worker) {
      worker = new Worker(new URL("./search-worker.js", import.meta.url), { type: "module" })
      worker.onerror = () => {
        showError("搜索加载失败，请检查网络")
        worker.terminate()
        worker = undefined
      }
      worker.onmessage = ({ data }) => {
        if (data.requestId !== requestId) return
        form.removeAttribute("aria-busy")
        if (data.error) return showError(data.error)
        status.textContent = data.total
          ? `找到 ${data.total.toLocaleString("zh-CN")} 道题，当前显示 ${offset + 1}–${Math.min(offset + 20, data.total)}。`
          : "没有找到相关题目，试试更短的关键词或放宽筛选。"
        for (const result of data.results) {
          const item = document.createElement("li")
          const link = element("a", `${result.module} · ${result.title}`, "result-title")
          link.href = result.url
          item.append(
            link,
            element(
              "p",
              result.text.slice(0, 180) || "本题包含图片，点击查看完整题目。",
              "result-excerpt",
            ),
            element("p", `${result.year} · ${result.region} · ${result.paper}`, "result-meta"),
          )
          results.append(item)
        }
        pagination.hidden = data.total <= 20
        document.querySelector("#previous-page").disabled = offset === 0
        document.querySelector("#next-page").disabled = offset + 20 >= data.total
        document.querySelector("#page-number").textContent =
          `${Math.floor(offset / 20) + 1} / ${Math.ceil(data.total / 20)}`
      }
    }
    worker.postMessage({ requestId, query })
  } catch (error) {
    showError(error.message)
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault()
  runSearch()
})
document
  .querySelector("#previous-page")
  .addEventListener("click", () => runSearch(Math.max(0, offset - 20)))
document.querySelector("#next-page").addEventListener("click", () => runSearch(offset + 20))
const parameters = new URLSearchParams(location.search)
for (const name of ["q", "module", "year", "region"]) {
  if (parameters.has(name)) form.elements.namedItem(name).value = parameters.get(name)
}
if ([...parameters.keys()].some((name) => ["q", "module", "year", "region"].includes(name)))
  runSearch()
