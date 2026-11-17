import assert from "node:assert/strict"
import test from "node:test"
import { convertPaper } from "./import-bank.mjs"
import { searchQuestions } from "../site/assets/search-core.js"
import { gradeAnswer } from "../site/assets/quiz-core.js"

const paper = `---
试卷: 测试真题
题数: 2
---
# 测试真题

## 材料 1

共同材料保留。<img src="../90-图片/公式图/missing.png" />

### 第 1 题　<sub>qid 123 · 比重</sub>

增长率是多少？

- **A**. 10　✅
- **B**. 20

**答案**：A

**官方解析**

解析内容。

---

### 第 2 题　<sub>qid 124 · 综合</sub>

第二个问题？

- **A**. 是
- **B**. 否　✅

**答案**：B

**官方解析**

第二个解析。

---
`

test("answers are folded, answer hints removed, shared material and anchors survive", () => {
  const result = convertPaper(paper, ["missing.png"])
  assert.equal(result.questions.length, 2)
  assert.equal((result.body.match(/<details class="answer">/g) || []).length, 2)
  assert.equal((result.body.match(/<\/details>/g) || []).length, 2)
  assert.ok(!result.body.includes("✅"))
  assert.ok(result.body.includes("共同材料保留"))
  assert.ok(result.body.includes('id="q-124"'))
  assert.ok(result.body.includes("source-missing.svg"))
  assert.ok(result.body.includes("解析内容。\n\n</details>"))
  assert.ok(result.body.includes("第二个解析。\n\n</details>"))
  assert.ok(!result.questions[0].text.includes("解析内容"))
  assert.ok(!result.questions[0].text.includes("✅"))
})

test("mismatched source counts and active HTML fail explicitly", () => {
  assert.throws(() => convertPaper(paper.replace("题数: 2", "题数: 3")), /count mismatch/)
  assert.throws(() => convertPaper(paper + "<script>alert(1)</script>"), /active HTML/)
})

test("question metadata supports native single and multiple choice without leaking answers in search", () => {
  const result = convertPaper(paper.replace("**答案**：A", "**答案**：AB"))
  assert.match(result.body, /id="q-123" data-options="AB" data-answer="AB"/)
  assert.match(result.body, /id="q-124" data-options="AB" data-answer="B"/)
  assert.equal((result.body.match(/class="option-marker"/g) || []).length, 4)
  assert.equal((result.body.match(/<section class="practice-question/g) || []).length, 2)
  assert.equal((result.body.match(/<\/section>/g) || []).length, 2)
  assert.ok(!result.questions[0].text.includes("答案"))
})

test("the next shared material remains outside the preceding question and answer", () => {
  const result = convertPaper(paper.replace("### 第 2 题", "## 材料 2\n\n新的共同材料。\n\n### 第 2 题"))
  const questionEnd = result.body.indexOf("</section>")
  const materialStart = result.body.indexOf("## 材料 2")
  assert.ok(questionEnd < materialStart)
  assert.ok(materialStart < result.body.indexOf('id="q-124"'))
  assert.ok(result.body.includes("第二个解析。\n\n</details>"))
})

test("missing source options and answers remain explicit instead of being invented", () => {
  const result = convertPaper(paper.replace(/^- \*\*[AB]\*\*\.[^\n]*\n/gm, "").replace("**答案**：A", "**答案**：（缺）"))
  assert.match(result.body, /id="q-123" data-options="" data-answer=""/)
  assert.ok(result.body.includes("**答案**：（缺）"))
})

test("single-choice answers are graded only after a selection", () => {
  assert.equal(gradeAnswer([], "B", "ABCD"), "empty")
  assert.equal(gradeAnswer(["B"], "B", "ABCD"), "correct")
  assert.equal(gradeAnswer(["A"], "B", "ABCD"), "incorrect")
})

test("multiple-choice answers require the exact set, regardless of order", () => {
  assert.equal(gradeAnswer(["C", "A"], "AC", "ABCD"), "correct")
  assert.equal(gradeAnswer(["A"], "AC", "ABCD"), "incorrect")
  assert.equal(gradeAnswer(["A", "B", "C"], "AC", "ABCD"), "incorrect")
  assert.equal(gradeAnswer(["A", "C", "C"], "AC", "ABCD"), "correct")
})

test("missing or inconsistent original answers are not scored", () => {
  assert.equal(gradeAnswer(["A"], "", "ABCD"), "ungraded")
  assert.equal(gradeAnswer(["A"], "H", "ABCD"), "ungraded")
})

const shard = {
  module: { label: "资料分析" },
  data: {
    papers: [{ title: "2026年国家公务员考试", year: "2026", region: "国考", url: "06/测试.html" }],
    questions: Array.from({ length: 23 }, (_, index) => ({
      paper: 0,
      number: index + 1,
      qid: String(index + 10),
      text: "2026年增长率与GDP数据",
    })),
  },
}

test("search matches Chinese, paper names, case, multiple terms and filters", () => {
  assert.equal(searchQuestions([shard], { q: "增长率 gdp", year: "2026" }).total, 23)
  assert.equal(searchQuestions([shard], { q: "国家公务员", region: "国考" }).total, 23)
  assert.equal(searchQuestions([shard], { q: "增长率", year: "2025" }).total, 0)
  assert.equal(searchQuestions([shard], { q: "不存在" }).total, 0)
  const page = searchQuestions([shard], { q: "增长率", offset: 20 })
  assert.equal(page.results.length, 3)
  assert.ok(page.results[0].url.endsWith("#q-30"))
})
