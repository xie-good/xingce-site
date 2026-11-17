export function normalize(text) {
  return String(text).normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim()
}

export function searchQuestions(shards, query) {
  const terms = normalize(query.q).split(" ").filter(Boolean)
  const matches = []
  for (const { module, data } of shards) {
    const paperText = data.papers.map((paper) => normalize(paper.title))
    for (const question of data.questions) {
      const paper = data.papers[question.paper]
      if (query.year && paper.year !== query.year) continue
      if (query.region && paper.region !== query.region) continue
      const text = `${paperText[question.paper]} ${normalize(question.text)}`
      if (!terms.every((term) => text.includes(term))) continue
      matches.push({
        title: `第 ${question.number} 题`,
        text: question.text,
        paper: paper.title,
        module: module.label,
        year: paper.year,
        region: paper.region,
        url: `${paper.url}#q-${question.qid}`,
      })
    }
  }
  matches.sort((a, b) => b.year.localeCompare(a.year) || a.paper.localeCompare(b.paper, "zh-CN"))
  const offset = Math.max(0, Number(query.offset) || 0)
  return { total: matches.length, results: matches.slice(offset, offset + 20) }
}
