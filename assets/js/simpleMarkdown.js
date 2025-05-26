function simpleMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const html = [];
  let inList = false;

  function inline(text) {
    return text
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  for (let line of lines) {
    const trimmed = line.trim();
    if (/^<div[^>]*><\/div>$/.test(trimmed)) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(trimmed);
    } else if (/^#{1,6}\s+/.test(trimmed)) {
      if (inList) { html.push('</ul>'); inList = false; }
      const level = trimmed.match(/^#{1,6}/)[0].length;
      const text = trimmed.replace(/^#{1,6}\s+/, '');
      html.push(`<h${level}>${inline(text)}</h${level}>`);
    } else if (/^\*\s+/.test(trimmed)) {
      if (!inList) { html.push('<ul>'); inList = true; }
      const text = trimmed.replace(/^\*\s+/, '');
      html.push(`<li>${inline(text)}</li>`);
    } else if (trimmed === '') {
      if (inList) { html.push('</ul>'); inList = false; }
    } else {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<p>${inline(trimmed)}</p>`);
    }
  }
  if (inList) { html.push('</ul>'); }
  return html.join('\n');
}
