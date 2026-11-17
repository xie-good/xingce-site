import { gradeAnswer } from "./quiz-core.js"

const questions = [...document.querySelectorAll(".practice-question")]

function nextQuestionButton(index) {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "quiz-next"
  const next = questions[index + 1]
  button.textContent = next ? "下一题 →" : "已是本卷最后一题"
  button.disabled = !next
  button.addEventListener("click", () => {
    let target = next.querySelector("h2, h3")
    // Show shared material when moving into a new question group.
    for (let sibling = next.previousElementSibling; sibling && !sibling.matches(".practice-question"); sibling = sibling.previousElementSibling) {
      if (sibling.matches("h2") && /^材料\s*\d/.test(sibling.textContent)) target = sibling
    }
    target.tabIndex = -1
    history.replaceState(null, "", `#${next.id}`)
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: "start" })
  })
  return button
}

function enableQuestion(question, index) {
  const answer = question.querySelector("details.answer")
  const letters = [...question.dataset.options]
  const markers = [...question.querySelectorAll(".option-marker")]
  const nextButton = nextQuestionButton(index)
  if (letters.length < 2 || markers.length !== letters.length) {
    const notice = document.createElement("p")
    notice.className = "quiz-notice"
    notice.textContent = "原题选项不完整，本题仅供阅读解析，不自动判分。"
    answer.before(notice)
    answer.after(nextButton)
    return
  }

  const multiple = question.dataset.answer.length > 1
  const form = document.createElement("form")
  form.className = "quiz-form"
  const fieldset = document.createElement("fieldset")
  const legend = document.createElement("legend")
  legend.textContent = multiple ? "多选题 · 选择所有正确选项" : "单选题 · 选择一个选项"
  const list = document.createElement("ul")
  list.className = "quiz-options"
  fieldset.append(legend, list)
  markers[0].closest("ul").before(form)
  const oldLists = new Set()
  const inputs = markers.map((marker, choiceIndex) => {
    const item = marker.closest("li")
    oldLists.add(item.parentElement)
    marker.remove()
    const input = document.createElement("input")
    input.type = multiple ? "checkbox" : "radio"
    input.name = `question-${index}`
    input.value = letters[choiceIndex]
    input.id = `choice-${index}-${input.value}`
    const label = document.createElement("label")
    label.htmlFor = input.id
    label.append(...item.childNodes)
    item.className = "quiz-option"
    item.append(input, label)
    list.append(item)
    return input
  })
  for (const oldList of oldLists) if (!oldList.children.length) oldList.remove()

  const feedback = document.createElement("p")
  feedback.className = "quiz-feedback"
  feedback.setAttribute("role", "status")
  feedback.setAttribute("aria-live", "polite")
  const actions = document.createElement("div")
  actions.className = "quiz-actions"
  const submit = document.createElement("button")
  submit.type = "submit"
  submit.textContent = "提交答案"
  const reset = document.createElement("button")
  reset.type = "reset"
  reset.className = "quiz-reset"
  reset.textContent = "重新作答"
  reset.hidden = true
  nextButton.hidden = true
  actions.append(submit, reset, nextButton)
  form.append(fieldset, feedback, actions)
  answer.hidden = true
  question.dataset.enhanced = "true"

  form.addEventListener("submit", (event) => {
    event.preventDefault()
    const selected = inputs.filter((input) => input.checked).map((input) => input.value)
    const result = gradeAnswer(selected, question.dataset.answer, letters)
    feedback.dataset.result = result
    if (result === "empty") {
      feedback.textContent = multiple ? "请至少选择一个选项，再提交答案。" : "请先选择一个选项，再提交答案。"
      inputs[0].focus()
      return
    }
    const chosen = `你的答案：${selected.join("、")}。`
    feedback.textContent = result === "ungraded"
      ? `${chosen}原题答案缺失或不完整，不自动判分，请参考解析。`
      : `${result === "correct" ? "回答正确！" : "回答错误。"}${chosen}正确答案：${[...question.dataset.answer].join("、")}。`
    for (const input of inputs) {
      input.closest("li").classList.toggle("is-correct", result !== "ungraded" && question.dataset.answer.includes(input.value))
      input.closest("li").classList.toggle("is-incorrect", result === "incorrect" && input.checked && !question.dataset.answer.includes(input.value))
    }
    fieldset.disabled = true
    submit.hidden = true
    reset.hidden = false
    nextButton.hidden = false
    answer.hidden = false
    answer.open = true
  })

  form.addEventListener("reset", () => {
    fieldset.disabled = false
    feedback.textContent = ""
    delete feedback.dataset.result
    for (const input of inputs) input.closest("li").classList.remove("is-correct", "is-incorrect")
    submit.hidden = false
    reset.hidden = true
    nextButton.hidden = true
    answer.hidden = true
    answer.open = false
    inputs[0].focus()
  })
}

questions.forEach(enableQuestion)
