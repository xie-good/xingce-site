export function gradeAnswer(selected, correct, options) {
  const choices = [...new Set(selected)].sort()
  if (!choices.length) return "empty"
  if (!correct || [...correct].some((letter) => !options.includes(letter))) return "ungraded"
  return choices.join("") === [...new Set(correct)].sort().join("") ? "correct" : "incorrect"
}
