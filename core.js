(function (root) {
  'use strict';
  function parse(text) {
    text = text.replace(/^\uFEFF/, '');
    const rows = []; let row = [], cell = '', quoted = false, closed = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } }
        else cell += c;
      } else if (c === ',' || c === '\n' || c === '\r') {
        row.push(cell); cell = ''; closed = false;
        if (c !== ',') { rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
      } else if (c === '"' && cell === '' && !closed) quoted = true;
      else { if (closed || c === '"') throw Error('CSV 引号格式不正确'); cell += c; }
    }
    if (quoted) throw Error('CSV 中存在未结束的引号');
    if (cell !== '' || row.length || closed) { row.push(cell); rows.push(row); }
    while (rows.length && rows[rows.length - 1].every(v => v === '')) rows.pop();
    if (!rows.length) throw Error('文件为空');
    const headers = rows.shift().map(v => v.trim());
    if (headers.some(v => !v) || new Set(headers).size !== headers.length) throw Error('表头不能为空或重复');
    rows.forEach((r, i) => { if (r.length !== headers.length) throw Error('第 ' + (i + 2) + ' 条记录的列数与表头不一致'); });
    return { headers, rows };
  }
  function index(table, key, label) {
    const pos = table.headers.indexOf(key); if (pos < 0) throw Error(label + '缺少订单列');
    const result = new Map();
    for (const row of table.rows) {
      const id = row[pos].trim();
      if (!id) throw Error(label + '存在空订单号');
      if (result.has(id)) throw Error(label + '存在重复订单号：' + id + '。请先确认一单多行的合并规则。');
      result.set(id, row);
    }
    return result;
  }
  function compare(a, b, keyA, keyB, fieldA, fieldB, trim) {
    const ia = index(a, keyA, '表 A '), ib = index(b, keyB, '表 B ');
    const fa = a.headers.indexOf(fieldA), fb = b.headers.indexOf(fieldB);
    if (fa < 0 || fb < 0) throw Error('请选择有效的比较字段');
    const result = [];
    for (const id of new Set([...ia.keys(), ...ib.keys()])) {
      const ra = ia.get(id), rb = ib.get(id);
      const va = ra ? ra[fa] : '', vb = rb ? rb[fb] : '';
      const equal = trim ? va.trim() === vb.trim() : va === vb;
      result.push({ id, a: va, b: vb, status: !ra ? '仅 B 存在' : !rb ? '仅 A 存在' : equal ? '一致' : '字段不同' });
    }
    return result;
  }
  function csv(records) {
    // Prefix potentially executable spreadsheet formulas in every cell.
    const escape = value => { let s = String(value); if (/^[\s]*[=+\-@]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    return '\uFEFF' + [['订单号', 'A 字段', 'B 字段', '结果'], ...records.map(r => [r.id, r.a, r.b, r.status])].map(r => r.map(escape).join(',')).join('\r\n');
  }
  const api = { parse, compare, csv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OrderCheck = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
