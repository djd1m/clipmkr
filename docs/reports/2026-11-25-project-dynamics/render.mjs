import { readFileSync, writeFileSync } from 'node:fs';

const dataPath = new URL('./data.json', import.meta.url);
const pagePath = new URL('./index.html', import.meta.url);
const rawData = readFileSync(dataPath, 'utf8').trim();
const data = JSON.parse(rawData);
const page = readFileSync(pagePath, 'utf8');

if (data.period?.from !== '2026-11-18' || data.period?.to !== '2026-11-25') {
  throw new Error('Ожидаются данные за 18–25 ноября 2026 года');
}

const dataBlock = /(<script type="application\/json" id="report-data">\n)[\s\S]*?(\n<\/script>)/;
const summaryBlock = /(<!-- summary:start -->)[\s\S]*?(<!-- summary:end -->)/;
if (!dataBlock.test(page) || !summaryBlock.test(page)) {
  throw new Error('В index.html отсутствуют блоки для обновления данных');
}

const escapeText = (value) => value.replace(/[&<>]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
}[character]));
const summaries = data.summary.map(({ title, text }) => (
  `<li><strong>${escapeText(title)}</strong><p>${escapeText(text)}</p></li>`
));
const summary = `\n<ul>\n${summaries.join('\n')}\n</ul>\n`;

// A raw opening angle bracket can terminate an HTML script element.
const embeddedData = rawData.replaceAll('<', '\\u003c');
const updatedPage = page
  .replace(dataBlock, (_, start, end) => `${start}${embeddedData}${end}`)
  .replace(summaryBlock, (_, start, end) => `${start}${summary}${end}`);

writeFileSync(pagePath, updatedPage);
