(() => {
  'use strict';
  const suspicious = /(?:Ã.|Â.|â.|ðŸ|ï¸|�)/;
  const cp1252 = new Map([
    [0x20ac,0x80],[0x201a,0x82],[0x0192,0x83],[0x201e,0x84],[0x2026,0x85],[0x2020,0x86],[0x2021,0x87],
    [0x02c6,0x88],[0x2030,0x89],[0x0160,0x8a],[0x2039,0x8b],[0x0152,0x8c],[0x017d,0x8e],[0x2018,0x91],
    [0x2019,0x92],[0x201c,0x93],[0x201d,0x94],[0x2022,0x95],[0x2013,0x96],[0x2014,0x97],[0x02dc,0x98],
    [0x2122,0x99],[0x0161,0x9a],[0x203a,0x9b],[0x0153,0x9c],[0x017e,0x9e],[0x0178,0x9f]
  ]);
  function decodeOnce(value) {
    const bytes = [];
    for (const char of value) {
      const code = char.codePointAt(0);
      if (code <= 255) bytes.push(code);
      else if (cp1252.has(code)) bytes.push(cp1252.get(code));
      else return value;
    }
    try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); }
    catch (_) { return value; }
  }
  function repair(value) {
    let current = String(value ?? '');
    for (let pass = 0; pass < 3 && suspicious.test(current); pass += 1) {
      const next = decodeOnce(current);
      if (next === current) break;
      current = next;
    }
    return current;
  }
  function repairNode(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const fixed = repair(root.nodeValue);
      if (fixed !== root.nodeValue) root.nodeValue = fixed;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
      ['title','aria-label','placeholder','alt'].forEach(name => {
        if (root.hasAttribute?.(name)) root.setAttribute(name, repair(root.getAttribute(name)));
      });
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) repairNode(node);
  }
  document.addEventListener('DOMContentLoaded', () => {
    repairNode(document.body);
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(repairNode)))
      .observe(document.body, { childList: true, subtree: true });
  });
  window.FCRepairText = repair;
})();
