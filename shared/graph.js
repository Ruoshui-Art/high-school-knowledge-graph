/* 拾页 · 知识图谱渲染器。零构建、断网可用。
   页面只需定义 window.GRAPH = {title, unit, total, nodes:[...], edges:[[a,b],...]}，
   再引本文件即可。节点坐标写在 viewBox 1160x720 里。 */
(function(){
  var G = window.GRAPH;
  var stage = document.getElementById('graphStage');
  if (!G || !stage) return;

  var NS = 'http://www.w3.org/2000/svg';
  var VB_W = 1160, VB_H = 720;
  function el(name, attrs){
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  var byId = {};
  (G.nodes || []).forEach(function(n){ byId[n.id] = n; });

  /* 章节条 */
  document.getElementById('gk').textContent = G.kicker || '知识图谱';
  document.getElementById('gt').textContent = G.title || '';
  document.getElementById('gu').textContent = G.unit || '';
  document.getElementById('ghint').textContent = '点一个节点看它是什么 · 一屏铺开，不用往下滑';

  /* 学情卡 */
  document.getElementById('gp').textContent = (G.mastered || 0) + ' / ' + (G.total || G.nodes.length);
  document.getElementById('gbar').style.width = (G.nodes.length ? (G.mastered||0)/G.nodes.length*100 : 0) + '%';

  var svg = el('svg', {class:'graph-svg', viewBox:'0 0 '+VB_W+' '+VB_H, preserveAspectRatio:'xMidYMid meet'});

  /* 连线 */
  var edgeEls = [];
  (G.edges || []).forEach(function(pair){
    var a = byId[pair[0]], b = byId[pair[1]];
    if (!a || !b) return;
    var ln = el('line', {class:'graph-edge', x1:a.x, y1:a.y, x2:b.x, y2:b.y});
    svg.appendChild(ln);
    edgeEls.push({a:pair[0], b:pair[1], node:ln});
  });

  /* 节点 */
  function drawNode(n){
    var g = el('g', {class:'gnode' + (n.kind==='big'?' big':''), 'data-id':n.id});
    if (n.kind === 'diamond'){
      var r = n.r || 13;
      g.appendChild(el('polygon', {class:'halo', points:[
        n.x+','+(n.y-r), (n.x+r)+','+n.y, n.x+','+(n.y+r), (n.x-r)+','+n.y].join(' ')}));
      var cr = 4.5;
      g.appendChild(el('polygon', {class:'core', points:[
        n.x+','+(n.y-cr), (n.x+cr)+','+n.y, n.x+','+(n.y+cr), (n.x-cr)+','+n.y].join(' ')}));
    } else {
      var r2 = n.r || (n.kind==='big'?26:15);
      g.appendChild(el('circle', {class:'halo', cx:n.x, cy:n.y, r:r2}));
      g.appendChild(el('circle', {class:'core', cx:n.x, cy:n.y, r:n.kind==='big'?7:4.5}));
    }
    var label = el('text', {class:'label', x:n.x, y:n.y - (n.kind==='big'?38:27)});
    label.textContent = n.label;
    g.appendChild(label);

    /* 类型小标签：new 新学 / test 自测 / key 要点 */
    if (n.tag){
      var map = {new:['新学',30], test:['Test',30], key:['要点',26]};
      var t = map[n.tag];
      if (t){
        var tw = t[1], tx = n.x + (n.r||15) + 4, ty = n.y - 8;
        var tg = el('g', {class:'gtag '+n.tag});
        tg.appendChild(el('rect', {x:tx, y:ty, width:tw, height:14}));
        var tt = el('text', {x:tx+tw/2, y:ty+10.5});
        tt.textContent = t[0];
        tg.appendChild(tt);
        g.appendChild(tg);
      }
    }

    g.addEventListener('click', function(){ select(n.id); });
    svg.appendChild(g);
    return g;
  }
  var nodeEls = {};
  G.nodes.forEach(function(n){ nodeEls[n.id] = drawNode(n); });

  stage.insertBefore(svg, stage.firstChild);

  /* 选中节点 */
  var detail = document.getElementById('gDetail');
  function select(id){
    var n = byId[id];
    if (!n) return;
    Object.keys(nodeEls).forEach(function(k){ nodeEls[k].classList.toggle('sel', k===id); });
    edgeEls.forEach(function(e){ e.node.classList.toggle('hi', e.a===id || e.b===id); });
    detail.classList.add('on');
    document.getElementById('dTitle').textContent = n.label;
    document.getElementById('dMeta').textContent = n.kind==='big' ? '这一章的主题' :
      (n.tag==='new'?'新学':n.tag==='test'?'自测':n.tag==='key'?'要点':'知识点');
    document.getElementById('dDesc').textContent = n.desc || '（占位：这里写这个知识点是什么，用大白话。）';
    var link = document.getElementById('dLink');
    link.href = n.page || 'set.html';
  }

  /* 精准找弱项（占位：还没有自测题） */
  document.getElementById('gWeak').addEventListener('click', function(){
    document.getElementById('dTitle').textContent = '精准找弱项';
    document.getElementById('dMeta').textContent = '占位功能';
    document.getElementById('dDesc').textContent = '还没做自测题，所以没有「不会」的数据。等知识点和自测题填进来，这里才能按做题结果找薄弱点。现在只能先自己点节点看。';
    document.getElementById('dLink').href = 'set.html';
    detail.classList.add('on');
  });

  /* 全屏 */
  document.getElementById('gFull').addEventListener('click', function(){
    if (!document.fullscreenElement){ if (stage.requestFullscreen) stage.requestFullscreen(); }
    else if (document.exitFullscreen) document.exitFullscreen();
  });
})();
