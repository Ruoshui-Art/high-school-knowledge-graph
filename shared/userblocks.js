/* 拾页 · 用户块（占位版）。真实数据存 localStorage，绝不写进 HTML。
   职责：① 把错题/标记挂到对应 page#block 旁；② 导出/导入备份。 */
(function(){
  var KEY = 'shiyue_userdata_v1';   // 全局一份，file:// 下 Chrome/Edge 已实测跨目录共享

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function save(d){
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; }
    catch(e){ return false; }
  }

  var page = document.querySelector('article[data-page]');
  var pageId = page ? page.getAttribute('data-page') : '';
  var data = load();

  // ① 在对应块旁挂「我的错题」标记（占位：数据格式见块清单）
  if (pageId && data[pageId]){
    Object.keys(data[pageId]).forEach(function(blockId){
      var sec = document.getElementById(blockId);
      if (!sec) return;
      var rec = data[pageId][blockId];
      var mark = document.createElement('span');
      mark.className = 'ub-mark';
      mark.textContent = '我的错题' + (rec.times ? ' ×' + rec.times : '');
      var h = sec.querySelector('h2');
      if (h) h.appendChild(mark);
      if (rec.note){
        var p = document.createElement('div');
        p.className = 'ub-panel';
        p.textContent = '我的笔记：' + rec.note;
        sec.appendChild(p);
      }
    });
  }

  // ② 导出/导入：给复习页和任意页复用
  window.ShiyueUser = {
    load: load,
    save: save,
    key: KEY,
    exportJSON: function(){
      var blob = new Blob([JSON.stringify(load(), null, 2)], {type:'application/json'});
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '拾页_我的数据_' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
    },
    importJSON: function(file, done){
      var r = new FileReader();
      r.onload = function(){
        try {
          var obj = JSON.parse(r.result);
          save(obj);
          if (done) done(true, '导入完成');
        } catch(e){ if (done) done(false, '文件读不出来：' + e.message); }
      };
      r.readAsText(file);
    },
    // 占位：写一个错题标记（演示用，真实交互以后做）
    markDemo: function(){
      if (!pageId) return false;
      var sec = page.querySelector('section[data-block]');
      if (!sec || !sec.id) return false;
      var d = load();
      d[pageId] = d[pageId] || {};
      d[pageId][sec.id] = { times: 1, note: '（占位：这里以后写你自己的话）', due: '' };
      return save(d);
    }
  };

  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('[data-act="export"]').forEach(function(el){
      el.addEventListener('click', function(){ window.ShiyueUser.exportJSON(); });
    });
    document.querySelectorAll('[data-act="import"]').forEach(function(el){
      el.addEventListener('change', function(){
        if (el.files && el.files[0]){
          window.ShiyueUser.importJSON(el.files[0], function(ok, msg){ alert(msg); if(ok) location.reload(); });
        }
      });
    });
    document.querySelectorAll('[data-act="demo"]').forEach(function(el){
      el.addEventListener('click', function(){ if (window.ShiyueUser.markDemo()) location.reload(); });
    });
  });
})();
