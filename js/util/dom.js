// 画面部品を作るための小さな道具。
export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function clear(node) {
  node.textContent = '';
}

/**
 * 要素を作る。 el('button', { class: 'btn', text: '保存', onclick: fn }, 子要素...)
 * 文字は textContent で入れるので、入力された内容がそのまま HTML になることはない。
 */
export function el(tag, props, ...children) {
  const n = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children.flat(Infinity)) { // 入れ子の配列も平らにする
    if (c === null || c === undefined || c === false) continue;
    n.append(c);
  }
  return n;
}
