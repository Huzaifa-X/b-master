// Injected into public/bcoder-inspector.js inside the WebContainer preview.
// Uses postMessage to send selected element info back to the parent Next.js window.
// Pure IIFE - no ES modules, no backticks, no special characters.
export const VISUAL_INSPECTOR_SCRIPT = `
(function () {
  if (window.__bcoderInspectorActive) return;
  window.__bcoderInspectorActive = true;

  var overlay = document.createElement('div');
  overlay.setAttribute('style', [
    'position:fixed', 'pointer-events:none', 'z-index:2147483647',
    'border:2px solid #8b5cf6', 'background:rgba(139,92,246,0.07)',
    'border-radius:4px', 'box-sizing:border-box', 'display:none',
    'transition:top 50ms,left 50ms,width 50ms,height 50ms'
  ].join(';'));
  document.body.appendChild(overlay);

  var label = document.createElement('div');
  label.setAttribute('style', [
    'position:fixed', 'z-index:2147483648', 'background:#8b5cf6',
    'color:white', 'font:bold 11px/18px ui-monospace,monospace',
    'padding:1px 7px', 'border-radius:3px 3px 3px 0',
    'pointer-events:none', 'white-space:nowrap', 'display:none',
    'max-width:240px', 'overflow:hidden', 'text-overflow:ellipsis'
  ].join(';'));
  document.body.appendChild(label);

  function getReactComponent(el) {
    var key;
    try { key = Object.keys(el).find(function(k) { return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'); }); }
    catch(e) {}
    if (!key) return null;
    var fiber = el[key], visited = 0;
    while (fiber && visited < 25) {
      visited++;
      var t = fiber.type;
      if (typeof t === 'function') {
        var n = t.displayName || t.name;
        if (n && n.length > 1 && n !== '_c' && !/^[a-z]/.test(n)) return n;
      }
      fiber = fiber.return;
    }
    return null;
  }

  function getLabelText(el) {
    var comp = getReactComponent(el);
    var tag = el.tagName ? el.tagName.toLowerCase() : 'el';
    var base = comp || tag;
    var cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
    return base + (cls ? '.' + cls : '');
  }

  function showHighlight(el) {
    if (!el || el === document.body || el === document.documentElement || el === overlay || el === label) return;
    var r;
    try { r = el.getBoundingClientRect(); } catch(e) { return; }
    if (!r || (r.width === 0 && r.height === 0)) return;
    overlay.style.top = (r.top + window.scrollY) + 'px';
    overlay.style.left = (r.left + window.scrollX) + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    overlay.style.display = 'block';
    label.textContent = getLabelText(el);
    var ly = r.top + window.scrollY - 22;
    if (ly < 0) ly = r.bottom + window.scrollY + 2;
    label.style.top = ly + 'px';
    label.style.left = (r.left + window.scrollX) + 'px';
    label.style.display = 'block';
  }

  document.addEventListener('mouseover', function(e) { showHighlight(e.target); e.stopPropagation(); }, true);

  document.addEventListener('click', function(e) {
    if (e.target === overlay || e.target === label) return;
    e.preventDefault(); e.stopPropagation();
    var el = e.target;
    var comp = null;
    try { comp = getReactComponent(el); } catch(x) {}
    var info = {
      tag: el.tagName ? el.tagName.toLowerCase() : 'div',
      id: el.id || null,
      classes: typeof el.className === 'string' ? el.className : '',
      text: (el.textContent || '').trim().slice(0, 120),
      component: comp,
      outerHTML: el.outerHTML ? el.outerHTML.slice(0, 600) : ''
    };
    try { window.parent.postMessage({ type: '__BCODER_VISUAL_SELECT', element: info }, '*'); } catch(x) {}
  }, true);

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === '__BCODER_VISUAL_DISABLE') {
      try { overlay.remove(); label.remove(); } catch(x) {}
      window.__bcoderInspectorActive = false;
    }
  });
})();
`
