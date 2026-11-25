/* 拾页 · 用户块。数据存统一账本 shiyue_v2，绝不写进 HTML。
   职责：① 把错题/标记挂到对应 page#block 旁；② 导出/导入备份。
   对外仍叫 window.ShiyueUser，内部改走 ShiyueStore（旧 API 不变）。 */
(function(){
  var S = window.ShiyueStore;

  function load(){ return S.load().blocks; }
  function save(blocks){
    var d = S.load(); d.blocks = blocks; return S.save(d);
  }

  var page = document.querySelector('article[data-page]');
  var pageId = page ? page.getAttribute('data-page') : '';
  var data = load();

  // ① 在对应块旁挂「我的错题」标记
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
    key: S.key,
    exportJSON: function(){
      var blob = new Blob([JSON.stringify(S.load(), null, 2)], {type:'application/json'});
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
          if (obj && obj.v === 2 && Array.isArray(obj.nodes) && obj.blocks){
            S.save(obj); // 新格式：整个账本
          } else {
            save(obj);  // 旧格式：只是 blocks
          }
          if (done) done(true, '导入完成');
        } catch(e){ if (done) done(false, '文件读不出来：' + e.message); }
      };
      r.readAsText(file);
    },
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
