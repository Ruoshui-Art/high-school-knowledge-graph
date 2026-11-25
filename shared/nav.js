/* 拾页 · 顶栏注入。放在 <body> 开头同步执行，避免导航闪现。
   用 document.currentScript.src 反推站点根目录，兼容 file:// 与 http://。 */
(function(){
  var script = document.currentScript;
  var src = script ? script.src : '';
  // src 形如 .../shared/nav.js —— 去掉末尾 shared/nav.js 得到站点根
  var root = src.replace(/shared\/nav\.js(?:\?.*)?$/, '');
  if (!root || root === src) root = './';

  var links = [
    { href: root + 'index.html', label: '首页' },
    { href: root + 'review.html', label: '复习队列' },
    { href: root + 'shared/块清单.html', label: '块清单' }
  ];
  var here = location.pathname.split('/').pop() || 'index.html';
  var navHtml = links.map(function(l){
    var name = l.href.split('/').pop();
    var active = (name === here) ? ' style="border-bottom-color:var(--accent);color:var(--ink)"' : '';
    return '<a href="' + l.href + '"' + active + '>' + l.label + '</a>';
  }).join('');

  var bar = document.createElement('div');
  bar.className = 'topbar';
  bar.innerHTML =
    '<div class="topbar-in">' +
      '<a class="brand" href="' + root + 'index.html' + '"><b>拾页</b><span>高中知识点</span></a>' +
      '<nav>' + navHtml +
        '<button class="tgl" id="navTgl" type="button">夜读</button>' +
      '</nav>' +
    '</div>';

  var css = document.createElement('style');
  css.textContent =
    '.topbar{border-bottom:1px solid var(--line);background:var(--card);box-shadow:0 2px 10px rgba(20,30,50,.04)}' +
    '.topbar-in{max-width:1180px;margin:auto;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}' +
    '.brand{display:flex;align-items:baseline;gap:12px;text-decoration:none;color:var(--ink)}' +
    '.brand b{font-size:22px;letter-spacing:.04em;color:var(--accent)}' +
    '.brand span{font-size:11px;color:var(--ink-3);letter-spacing:.06em}' +
    '.topbar nav{display:flex;gap:24px;align-items:center}' +
    '.topbar nav a{color:var(--ink-2);text-decoration:none;font-size:13px;' +
      'padding-bottom:4px;border-bottom:2px solid transparent}' +
    '.topbar nav a:hover{color:var(--accent)}' +
    '.tgl{cursor:pointer;border:1px solid var(--line);background:var(--accent-soft);color:var(--accent);' +
      'border-radius:9px;padding:6px 14px;font-size:12px}' +
    '.tgl:hover{border-color:var(--accent)}' +
    '@media(max-width:760px){.topbar-in{padding:14px 20px}.topbar nav{gap:14px}.brand span{display:none}}';

  script.parentNode.insertBefore(css, script);
  script.parentNode.insertBefore(bar, script.nextSibling);

  var tgl = document.getElementById('navTgl');
  var night = document.documentElement.dataset.theme === 'night';
  tgl.textContent = night ? '日间' : '夜读';
  tgl.addEventListener('click', function(){
    var now = document.documentElement.dataset.theme === 'night';
    document.documentElement.dataset.theme = now ? '' : 'night';
    try { localStorage.setItem('shiyue_theme', now ? '' : 'night'); } catch(e){}
    tgl.textContent = now ? '夜读' : '日间';
  });
})();
