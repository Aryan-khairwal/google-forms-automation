function normalizeTaskText(text) {
  if (typeof text !== "string") return "";
  if (text.includes("\n") || !text.includes("\\n")) return text;

  // Some AI responses double-escape line breaks in grouped task notes.
  const lines = text.split(/\\r\\n|\\n/);
  const headings = lines.filter((line) => /^[^:\r\n]+:[ \t]*-?[ \t]*$/.test(line));
  return headings.length >= 2 ? lines.join("\n") : text;
}

module.exports = { normalizeTaskText };
