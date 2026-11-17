import { execFileSync } from "node:child_process"
import { appendFile, cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import matter from "gray-matter"
import { slugifyFilePath } from "@quartz-community/utils/path"

export const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  )

export function plainText(markdown) {
  return markdown
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[\[[^\]]*\]\]/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[*_`#✅]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function convertPaper(markdown, missingImages = []) {
  if (
    /<(?:script|iframe|object|embed)\b|\bon\w+\s*=|(?:src|href)\s*=\s*["']?\s*javascript:/i.test(
      markdown,
    )
  ) {
    throw new Error("Unexpected active HTML in question bank")
  }
  const { data, content } = matter(markdown)
  const heading = /^#{2,3} 第 (\d+) 题[^\n]*?qid (\d+)[^\n]*$/gm
  const matches = [...content.matchAll(heading)]
  const questions = matches.map((match, index) => {
    const block = content.slice(match.index + match[0].length, matches[index + 1]?.index)
    const question = block.split(/^\*\*答案\*\*/m)[0]
    return { number: Number(match[1]), qid: match[2], text: plainText(question) }
  })
  if (questions.length !== Number(data["题数"])) {
    throw new Error(`Question count mismatch: ${data["试卷"]}`)
  }
  let body = content
    .replace(/^# [^\n]*\n+/, "")
    .replace(
      heading,
      (line, number, qid) =>
        `<span class="question-anchor" id="q-${qid}"></span>\n\n${line.replace(/<sub>qid \d+ · ([^<]*)<\/sub>/, "$1")}`,
    )
    .replace(/^(- \*\*[A-H]\*\*\.[^\n]*?)[\u3000 \t]*✅[ \t]*$/gm, "$1")
    .replace(
      /(^\*\*答案\*\*[\s\S]*?)(?=\n---(?:\n|$)|(?![\s\S]))/gm,
      (answer) =>
        `<details class="answer">\n<summary>查看答案与解析</summary>\n\n${answer.trim()}\n\n</details>\n`,
    )
  for (const image of missingImages) body = body.replaceAll(image, "source-missing.svg")
  return { data, body, questions }
}

const pageUrl = (file) => `${slugifyFilePath(file)}.html`

async function importBank() {
  const source = JSON.parse(await readFile("site/source.json", "utf8"))
  const input = ".work/question-bank"
  const revision = execFileSync("git", ["-C", input, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim()
  if (revision !== source.revision) throw new Error("Run npm run site:fetch first")
  // Quartz reads .gitignore while building; Git's local exclude keeps generated data untracked without hiding it from Quartz.
  const exclude = ".git/info/exclude"
  if (!(await readFile(exclude, "utf8")).includes("# generated question-bank content")) {
    await appendFile(
      exclude,
      "\n# generated question-bank content\ncontent/0*/\ncontent/90-图片/\ncontent/site-assets/\ncontent/index.md\ncontent/关于题库.md\n",
    )
  }
  const modules = (await readdir(input)).filter((name) => /^0[1-6]-/.test(name)).sort()
  await mkdir("content/site-assets", { recursive: true })
  await cp(join(input, "90-图片"), "content/90-图片", { recursive: true })
  await writeFile(
    "content/90-图片/公式图/source-missing.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="28" viewBox="0 0 160 28"><rect width="160" height="28" rx="4" fill="#fff4df"/><text x="8" y="19" font-size="14" fill="#754516">原题库此处公式缺失</text></svg>',
  )
  await cp("site/assets", "content/site-assets", { recursive: true })
  const manifest = {
    revision,
    modules: [],
    years: [],
    regions: [],
    totalQuestions: 0,
    totalPapers: 0,
  }
  const years = new Set(),
    regions = new Set(),
    papers = new Set()
  for (const directory of modules) {
    const label = directory.slice(3)
    const id = directory.slice(0, 2)
    await mkdir(join("content", directory), { recursive: true })
    const shard = { papers: [], questions: [] }
    const files = (await readdir(join(input, directory)))
      .filter((name) => name.endsWith(".md") && name !== "README.md")
      .sort()
      .reverse()
    for (const file of files) {
      const { data, body, questions } = convertPaper(
        await readFile(join(input, directory, file), "utf8"),
        source.missingImages,
      )
      const title = String(data["试卷"]),
        year = String(data["年份"]),
        region = String(data["地区"])
      const paperIndex = shard.papers.length
      const url = pageUrl(`${directory}/${file}`)
      shard.papers.push({ title, year, region, url, count: questions.length })
      shard.questions.push(...questions.map((question) => ({ ...question, paper: paperIndex })))
      years.add(year)
      regions.add(region)
      papers.add(title)
      const frontmatter = {
        ...data,
        title: `${title} · ${label}`,
        description: `${year}年 ${region} ${label} ${questions.length}题，含答案与解析`,
      }
      const nav = `[返回搜索](index) · [${label}全部试卷](${directory}/README)\n\n`
      await writeFile(join("content", directory, file), matter.stringify(nav + body, frontmatter))
    }
    await writeFile(`content/site-assets/search-${id}.json`, JSON.stringify(shard))
    const moduleYears = [...new Set(shard.papers.map((paper) => paper.year))].sort().reverse()
    const sections = moduleYears
      .map(
        (year, index) =>
          `<details class="year-group"${index === 0 ? " open" : ""}><summary>${escapeHtml(year)} 年 · ${shard.papers.filter((paper) => paper.year === year).length} 套卷</summary><ul class="paper-list">${shard.papers
            .filter((paper) => paper.year === year)
            .map(
              (paper) =>
                `<li><a href="${escapeHtml(paper.url)}">${escapeHtml(paper.title)}<span>${escapeHtml(paper.region)} · ${paper.count} 题</span></a></li>`,
            )
            .join("")}</ul></details>`,
      )
      .join("\n")
    await writeFile(
      join("content", directory, "README.md"),
      matter.stringify(
        `[返回搜索](index)\n\n${shard.papers.length} 套卷 · ${shard.questions.length.toLocaleString("zh-CN")} 道题\n\n${sections}\n`,
        { title: `${label} · 真题试卷`, description: `按年份浏览${label}历年真题` },
      ),
    )
    manifest.modules.push({
      id,
      label,
      url: pageUrl(`${directory}/README.md`),
      questions: shard.questions.length,
      papers: shard.papers.length,
      index: `search-${id}.json`,
    })
    manifest.totalQuestions += shard.questions.length
  }
  manifest.totalPapers = papers.size
  manifest.years = [...years].sort().reverse()
  manifest.regions = [...regions].sort((a, b) => a.localeCompare(b, "zh-CN"))
  if (
    manifest.totalQuestions !== source.expectedQuestions ||
    manifest.totalPapers !== source.expectedPapers
  ) {
    throw new Error(
      `Source totals changed: ${manifest.totalQuestions} questions, ${manifest.totalPapers} papers`,
    )
  }
  await writeFile("content/site-assets/search-manifest.json", JSON.stringify(manifest))
  const template = await readFile("site/home.html", "utf8")
  const cards = manifest.modules
    .map(
      (module) =>
        `<a class="module-card" href="${escapeHtml(module.url)}"><span class="module-number">${module.id}</span><strong>${module.label}</strong><span>${module.questions.toLocaleString("zh-CN")} 题 · ${module.papers} 套卷</span><span class="card-arrow" aria-hidden="true">↗</span></a>`,
    )
    .join("\n")
  const options = (values) =>
    values
      .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
      .join("")
  const home = template
    .replace("{{MODULE_CARDS}}", cards)
    .replace(
      "{{MODULE_OPTIONS}}",
      manifest.modules
        .map((module) => `<option value="${module.id}">${module.label}</option>`)
        .join(""),
    )
    .replace("{{YEAR_OPTIONS}}", options(manifest.years))
    .replace("{{REGION_OPTIONS}}", options(manifest.regions))
  await writeFile(
    "content/index.md",
    matter.stringify(home, {
      title: "行测真题库",
      description: "免费搜索 58,890 道行测真题，手机按模块、年份和地区查题、查看答案与解析。",
    }),
  )
  await writeFile(
    "content/关于题库.md",
    matter.stringify(
      `题库来自 [ERRRC/xingcezhenti](https://github.com/ERRRC/xingcezhenti)，本网站保留原题及解析，不自动生成答案。\n\n当前固定版本：\`${source.revision}\`。共 ${manifest.totalPapers} 套卷、${manifest.totalQuestions} 题。\n\n原仓库注明有两张公式图片缺失，网站在相应位置显示“原题库此处公式缺失”，不推测公式内容。个别题目原答案缺失时也保留原样。\n\n本网站提供关键词搜索和折叠答案阅读，不含账号、云端进度或答题评分。\n\n[返回搜索](index)\n`,
      { title: "关于题库" },
    ),
  )
  console.log(
    `IMPORT PASS modules=${modules.length} papers=${manifest.totalPapers} questions=${manifest.totalQuestions} known-missing-images=${source.missingImages.length}`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await importBank()
