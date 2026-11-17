import assert from "node:assert/strict"
import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"
import { fromHtml } from "hast-util-from-html"
import { visit } from "unist-util-visit"

async function walk(directory, prefix = "") {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name
    if (entry.isDirectory())
      files.push(...(await walk(path.join(directory, entry.name), relative + "/")))
    else files.push(relative)
  }
  return files
}

const files = await walk("public")
const fileSet = new Set(files)
const htmlFiles = files.filter((file) => file.endsWith(".html"))
const manifest = JSON.parse(await readFile("public/site-assets/search-manifest.json", "utf8"))
let bytes = 0,
  answers = 0,
  practiceQuestions = 0,
  selectableQuestions = 0,
  missingOptions = 0,
  multipleChoice = 0,
  localLinks = 0
const broken = []
const anchors = new Map()
for (const file of files) bytes += (await stat(path.join("public", file))).size
assert.ok(bytes < 900 * 1024 * 1024, `Site exceeds the 900 MiB deployment budget: ${bytes}`)
for (const file of htmlFiles) {
  const html = await readFile(path.join("public", file), "utf8")
  answers += (html.match(/<details class="answer"/g) || []).length
  if (html.includes('class="practice-question')) {
    assert.ok(html.includes('../site-assets/quiz.js'), `Missing quiz script: ${file}`)
    visit(fromHtml(html), "element", (node) => {
      if (!node.properties.className?.includes("practice-question")) return
      practiceQuestions++
      const options = String(node.properties.dataOptions || "")
      const correct = String(node.properties.dataAnswer || "")
      let markers = "", containedAnswers = 0
      visit(node, "element", (child, index, parent) => {
        if (child.properties.className?.includes("option-marker")) {
          assert.equal(parent.tagName, "li", `Option outside a list item: ${file}`)
          markers += child.properties.dataOption
        }
        if (child.tagName === "details" && child.properties.className?.includes("answer")) containedAnswers++
      })
      assert.equal(containedAnswers, 1, `Question must contain exactly one answer: ${file}`)
      assert.equal(markers, options, `Rendered option mismatch: ${file}`)
      if (options.length >= 2) {
        selectableQuestions++
        assert.ok([...correct].every((letter) => options.includes(letter)), `Invalid original answer: ${file}`)
        if (correct.length > 1) multipleChoice++
      } else missingOptions++
    })
  }
  anchors.set(file, new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])))
  for (const match of html.matchAll(
    /<(?:a|img|script|link|source)\b[^>]*?\b(?:href|src)="([^"]+)"[^>]*>/g,
  )) {
    const href = match[1].replaceAll("&amp;", "&")
    if (/^(?:https?:|data:|mailto:|tel:|#|\/\/)/i.test(href)) continue
    const raw = decodeURIComponent(href.split(/[?#]/)[0])
    if (!raw) continue
    const target = path.posix.resolve("/" + path.posix.dirname(file), raw).slice(1)
    localLinks++
    if (
      ![target, target + ".html", path.posix.join(target, "index.html")].some((name) =>
        fileSet.has(name),
      )
    )
      broken.push(`${file} -> ${href}`)
  }
}
let indexed = 0
for (const module of manifest.modules) {
  assert.ok(fileSet.has(module.url), `Missing module page: ${module.url}`)
  const shard = JSON.parse(await readFile(`public/site-assets/${module.index}`, "utf8"))
  for (const question of shard.questions) {
    const file = shard.papers[question.paper].url
    assert.ok(
      anchors.get(file)?.has(`q-${question.qid}`),
      `Search target missing: ${file}#q-${question.qid}`,
    )
    indexed++
  }
}
assert.deepEqual(broken.slice(0, 20), [], `Broken local references (${broken.length})`)
assert.equal(indexed, 58890)
assert.equal(answers, 58890)
assert.equal(practiceQuestions, 58890)
assert.equal(selectableQuestions, 58779)
assert.equal(missingOptions, 111)
assert.equal(multipleChoice, 405)
assert.ok(fileSet.has("site-assets/quiz.js") && fileSet.has("site-assets/quiz-core.js"))
assert.equal(
  await readFile("public/static/contentIndex.json", "utf8"),
  "{}",
  "No global full-text index on initial page load",
)
const home = await readFile("public/index.html", "utf8")
assert.ok(home.includes('id="question-search"') && home.includes("site-assets/site-search.js"))
assert.ok(!home.includes("fonts.googleapis.com"))
console.log(
  `VERIFY PASS pages=${htmlFiles.length} questions=${indexed} folded-answers=${answers} selectable=${selectableQuestions} multiple-choice=${multipleChoice} missing-options=${missingOptions} local-references=${localLinks} broken=${broken.length} size-MiB=${(bytes / 1024 / 1024).toFixed(1)}`,
)
