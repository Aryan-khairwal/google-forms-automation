function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getQuestion(page, questionTitle, { control } = {}) {
  // Google Forms wraps each question in an element with role="listitem".
  // Each question's listitem contains a heading matching the question title.
  const titlePattern = new RegExp(`^${escapeRegExp(questionTitle)}(?:\\s|\\*|$)`, "i");

  const questions = page
    .locator('[role="listitem"]')
    .filter({
      has: page.getByRole("heading", { name: titlePattern })
    });

  return (control ? questions.filter({ has: control }) : questions).first();
}

module.exports = { getQuestion };
