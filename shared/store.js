/* 拾页 · 统一账本 shiyue_v2
   一个 key 管全部：工作台节点 + 用户块 + 复习。
   打开时自动把旧的两份（shiyue_workbench_v1 / shiyue_userdata_v1）搬进来，搬完不删旧的（留后路）。
   纯本地，断网可用。 */
(function(){
  'use strict';
  var KEY = 'shiyue_v2';
  var OLD_WB = 'shiyue_workbench_v1';
  var OLD_UB = 'shiyue_userdata_v1';

  function blank(){ return { v:2, nodes:[], blocks:{} }; }

  function read(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } }
  function write(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }

  // 迁移：只搬一次。旧数据在企业微信/别的浏览器有备份，这里不删。
  function migrate(d){
    var moved = false;
    var wb = read(OLD_WB);
    if (wb && Array.isArray(wb.nodes) && wb.nodes.length && !d.nodes.length){
      d.nodes = wb.nodes; moved = true;
    }
    var ub = read(OLD_UB);
    if (ub && Object.keys(ub).length && !Object.keys(d.blocks).length){
      d.blocks = ub; moved = true;
    }
    if (moved) write(KEY, d);
    return d;
  }

  function load(){
    var d = read(KEY);
    if (!d || d.v !== 2 || !Array.isArray(d.nodes) || !d.blocks){ d = blank(); }
    return migrate(d);
  }
  function save(d){ return write(KEY, d); }

  window.ShiyueStore = {
    key: KEY,
    load: load,
    save: save,
    // 节点：工作台亲手搭的知识块
    nodes: function(){ return load().nodes; },
    // 用户块：错题/标记，按 page#block 存
    blocks: function(){ return load().blocks; }
  };
})();
