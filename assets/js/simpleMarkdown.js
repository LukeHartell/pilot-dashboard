function simpleMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const html = [];
  let inList = false;
  let inTable = false;
  let tableRows = [];

  function inline(text) {
    return text
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  function renderTable(rows) {
    if (!rows.length) return '';
    // First row is header, second is alignment, rest are data
    const header = rows[0].split('|').slice(1, -1).map(cell => cell.trim());
    const aligns = rows[1].split('|').slice(1, -1).map(cell => {
      if (/^:\s*-+\s*:/.test(cell)) return 'center';
      if (/^:\s*-+/.test(cell)) return 'left';
      if (/-+\s*:/.test(cell)) return 'right';
      return null;
    });
    const bodyRows = rows.slice(2).map(row =>
      row.split('|').slice(1, -1).map(cell => cell.trim())
    );
    let out = '<table><thead><tr>';
    header.forEach((cell, i) => {
      let align = aligns[i] ? ` style="text-align:${aligns[i]};"` : '';
      out += `<th${align}>${inline(cell)}</th>`;
    });
    out += '</tr></thead><tbody>';
    bodyRows.forEach(row => {
      out += '<tr>';
      row.forEach((cell, i) => {
        let align = aligns[i] ? ` style="text-align:${aligns[i]};"` : '';
        out += `<td${align}>${inline(cell)}</td>`;
      });
      out += '</tr>';
    });
    out += '</tbody></table>';
    return out;
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    // TABLE START
    // Table row: at least two pipes and not a list/heading
    if (/^\|(.+\|)+$/.test(trimmed)) {
      // Collect all table lines
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(trimmed);
      // If next line is not a table line, render table
      if (!lines[i + 1] || !/^\|(.+\|)+$/.test(lines[i + 1].trim())) {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push(renderTable(tableRows));
        inTable = false;
        tableRows = [];
      }
      continue;
    }

    // END TABLE, handle normal markdown
    if (inTable) {
      html.push(renderTable(tableRows));
      inTable = false;
      tableRows = [];
    }

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
  if (inTable) { html.push(renderTable(tableRows)); }
  return html.join('\n');
}
