/* 會考衝刺站 — 共用程式（所有頁面共用；加科目不需要改這支） */
(function () {
  'use strict';

  /* ---------- 儲存（localStorage，全部包 try/catch，失敗退回記憶體） ---------- */
  var mem = {};
  var storageOK = true;
  var KEYS = { progress: 'hk1.progress', mistakes: 'hk1.mistakes', scores: 'hk1.scores' };
  function sget(k, d) {
    try {
      var v = window.localStorage.getItem(k);
      if (v == null) return (k in mem) ? mem[k] : d;
      return JSON.parse(v);
    } catch (e) { storageOK = false; return (k in mem) ? mem[k] : d; }
  }
  function sset(k, v) {
    mem[k] = v;
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { storageOK = false; }
  }
  var Store = {
    progress: function () { return sget(KEYS.progress, {}) || {}; },
    mistakes: function () { return sget(KEYS.mistakes, {}) || {}; },
    scores: function () { return sget(KEYS.scores, {}) || {}; },
    setDone: function (key, done) {
      var p = Store.progress();
      if (done) p[key] = { done: true, t: Date.now() }; else delete p[key];
      sset(KEYS.progress, p);
    },
    isDone: function (key) { var p = Store.progress(); return !!(p[key] && p[key].done); },
    addMistake: function (qid, s, u, wrongIncrement) {
      var m = Store.mistakes();
      var e = m[qid] || { s: s, u: u, t: Date.now(), n: 0 };
      if (wrongIncrement) { e.n = (e.n || 0) + 1; e.last = Date.now(); }
      m[qid] = e; sset(KEYS.mistakes, m);
    },
    removeMistake: function (qid) { var m = Store.mistakes(); delete m[qid]; sset(KEYS.mistakes, m); },
    hasMistake: function (qid) { return !!Store.mistakes()[qid]; },
    saveScore: function (key, right, total) {
      var sc = Store.scores();
      var e = sc[key] || { best: 0 };
      e.last = right; e.total = total; e.t = Date.now();
      if (right > (e.best || 0)) e.best = right;
      sc[key] = e; sset(KEYS.scores, sc);
    },
    score: function (key) { return Store.scores()[key] || null; },
    exportAll: function () {
      return { app: 'huikao-study', v: 1, at: new Date().toISOString(), progress: Store.progress(), mistakes: Store.mistakes(), scores: Store.scores() };
    },
    importAll: function (o) {
      if (!o || o.app !== 'huikao-study') throw new Error('不是本站的備份檔');
      sset(KEYS.progress, o.progress || {}); sset(KEYS.mistakes, o.mistakes || {}); sset(KEYS.scores, o.scores || {});
    }
  };

  /* ---------- 小工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // 文字標記：$…$、$$…$$ 交給 KaTeX；**粗體**；\n 換行；其餘一律跳脫
  function fmt(s) {
    if (s == null) return '';
    var parts = String(s).split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/);
    var PUNCT = /^[。，、；：？！）」』%％]+/;
    for (var i = 1; i < parts.length; i += 2) {
      // 行內數學後面緊接的全形標點黏在一起，避免標點被擠到下一行開頭
      if (parts[i].indexOf('$$') === 0) { parts[i] = esc(parts[i]); continue; }
      var m = PUNCT.exec(parts[i + 1] || '');
      var tail = m ? m[0] : '';
      if (tail) parts[i + 1] = parts[i + 1].slice(tail.length);
      parts[i] = '<span class="nb">' + esc(parts[i]) + esc(tail) + '</span>';
    }
    return parts.map(function (p, i) {
      if (i % 2 === 1) return p;
      return esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }).join('');
  }
  function math(el) {
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(el, {
          delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
          throwOnError: false
        });
      } catch (e) { console.warn('KaTeX', e); }
    }
  }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  var cache = {};
  function getJSON(path) {
    if (!cache[path]) {
      cache[path] = fetch(path).then(function (r) {
        if (!r.ok) throw new Error(path + ' ' + r.status);
        return r.json();
      });
    }
    return cache[path];
  }
  function svgBlock(svg, caption) {
    if (!svg) return '';
    return '<figure>' + svg + (caption ? '<figcaption>' + fmt(caption) + '</figcaption>' : '') + '</figure>';
  }
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];
  // 題目分級：資料有 tier 就用；沒有時 level 1＝基礎，2、3＝會考難度
  function tierOf(q) { return q.tier === 'basic' || q.tier === 'exam' ? q.tier : (q.level === 1 ? 'basic' : 'exam'); }
  var LEVEL = { 1: '易', 2: '中', 3: '難' };
  function unitKey(s, u) { return s + '/' + u; }
  function showError(msg) {
    var m = $('#main');
    if (m) m.innerHTML = '<div class="card warn">' + esc(msg) + '</div>';
  }
  function storageNotice() {
    if (storageOK) return;
    var m = $('#main');
    if (!m || $('#storage-warn')) return;
    var d = document.createElement('div');
    d.id = 'storage-warn'; d.className = 'card warn small';
    d.textContent = '這個瀏覽器目前無法儲存進度（可能是私密瀏覽模式），關掉頁面後打勾與錯題本會消失。';
    m.insertBefore(d, m.firstChild);
  }

  /* ---------- 單元列（進度表、科目頁共用） ---------- */
  function unitRow(sid, u) {
    var key = unitKey(sid, u.id);
    var done = Store.isDone(key);
    var sc = Store.score(key);
    var scoreTxt = sc ? ('測驗最佳 ' + sc.best + '/' + sc.total) : (u.quizCount ? (u.quizCount + ' 題') : '');
    return '<div class="unit-row">' +
      '<span class="chkwrap"><button class="chk" role="checkbox" aria-checked="' + done + '" aria-label="' + esc(u.title) + ' 讀完" data-key="' + esc(key) + '">✓</button></span>' +
      '<a class="u" href="unit.html?s=' + encodeURIComponent(sid) + '&u=' + encodeURIComponent(u.id) + '">' + esc(u.title) +
      (u.codes && u.codes.length ? '<span class="codes">' + esc(u.codes.join('、')) + '</span>' : '') + '</a>' +
      '<span class="score">' + esc(scoreTxt) + '</span></div>';
  }
  function bindChecks(root, onChange) {
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('.chk');
      if (!b) return;
      var now = b.getAttribute('aria-checked') !== 'true';
      b.setAttribute('aria-checked', String(now));
      Store.setDone(b.getAttribute('data-key'), now);
      if (onChange) onChange();
      storageNotice();
    });
  }
  function groupUnits(subject, units) {
    var groups = (subject.groups && subject.groups.length) ? subject.groups : [{ grade: null, title: '' }];
    return groups.map(function (g) {
      return { title: g.title, units: units.filter(function (u) { return g.grade == null || u.grade === g.grade; }) };
    }).filter(function (g) { return g.units.length; });
  }
  function countDone(sid, units) {
    return units.filter(function (u) { return Store.isDone(unitKey(sid, u.id)); }).length;
  }

  /* ---------- 首頁 ---------- */
  function daysUntil(dateStr) {
    // 以台北日期計算剩餘天數
    var fmtr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' });
    var today = fmtr.format(new Date()); // YYYY-MM-DD
    var a = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
    var b = Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10));
    return Math.round((b - a) / 86400000);
  }
  function renderCountdown(exam) {
    var el = $('#countdown');
    if (!el || !exam) return;
    var d = daysUntil(exam.start);
    var big = d > 0 ? (d + '<small>天</small>') : (d >= -1 ? '加油！' : '已結束');
    el.innerHTML = '<div class="num">' + big + '</div><div class="txt">' +
      '<div class="ttl">距離 ' + esc(exam.label) + '</div>' +
      '<div>' + esc(exam.dateText) + '</div>' +
      '<div class="note">' + (exam.official ? '日期來源：' : '預估，以心測中心公告為準。') +
      (exam.source ? esc(exam.source) : '') +
      (exam.url ? '（<a href="' + esc(exam.url) + '" target="_blank" rel="noopener">國中教育會考官網</a>）' : '') + '</div></div>';
  }
  function pageHome() {
    Promise.all([getJSON('data/site.json'), getJSON('data/subjects.json')]).then(function (r) {
      var site = r[0], subs = r[1].subjects;
      renderCountdown(site.exam);
      var ready = subs.filter(function (s) { return s.status === 'ready'; });
      return Promise.all(ready.map(function (s) { return getJSON('data/' + s.id + '/index.json'); })).then(function (idxs) {
        var byId = {};
        idxs.forEach(function (ix) { byId[ix.id] = ix; });
        function drawCards() {
          var html = subs.map(function (s) {
            if (s.status !== 'ready') {
              return '<div class="subj off" style="--c:' + esc(s.color) + '"><span class="tag">即將推出</span><span class="ic">' + esc(s.icon) + '</span><span class="nm">' + esc(s.name) + '</span><span class="bl">' + esc(s.blurb || '') + '</span></div>';
            }
            var ix = byId[s.id], n = ix.units.length, d = countDone(s.id, ix.units);
            return '<a class="subj" style="--c:' + esc(s.color) + '" href="subject.html?s=' + encodeURIComponent(s.id) + '"><span class="ic">' + esc(s.icon) + '</span><span class="nm">' + esc(s.name) + '</span><span class="bl">' + esc(s.blurb || '') + '・已讀 ' + d + '/' + n + '</span><span class="bar"><i style="width:' + (n ? Math.round(d * 100 / n) : 0) + '%"></i></span></a>';
          }).join('');
          (site.extraCards || []).forEach(function (c) {
            html += '<a class="subj" style="--c:' + esc(c.color || '#888') + '" href="' + esc(c.url) + '"><span class="ic">' + esc(c.icon || '🔗') + '</span><span class="nm">' + esc(c.name) + '</span><span class="bl">' + esc(c.blurb || '') + '</span></a>';
          });
          $('#subjects').innerHTML = html;
        }
        function drawProgress() {
          var box = $('#progress');
          var openIds = {};
          box.querySelectorAll('details[open]').forEach(function (d) { openIds[d.getAttribute('data-s')] = 1; });
          var first = !box.innerHTML;
          box.innerHTML = ready.map(function (s, i) {
            var ix = byId[s.id], n = ix.units.length, d = countDone(s.id, ix.units);
            var groups = groupUnits(ix, ix.units);
            var isOpen = first ? i === 0 : !!openIds[s.id];
            return '<details class="prog" data-s="' + esc(s.id) + '"' + (isOpen ? ' open' : '') + '><summary><span>' + esc(s.icon) + ' ' + esc(s.name) + '</span><span class="pct">' + d + '/' + n + '</span><span class="bar" style="--c:' + esc(s.color) + '"><i style="width:' + (n ? Math.round(d * 100 / n) : 0) + '%"></i></span></summary>' +
              groups.map(function (g) { return (g.title ? '<h3>' + esc(g.title) + '</h3>' : '') + g.units.map(function (u) { return unitRow(s.id, u); }).join(''); }).join('') +
              '</details>';
          }).join('') || '<div class="empty">還沒有科目資料。</div>';
        }
        function drawMistakeCount() {
          var n = Object.keys(Store.mistakes()).length;
          $('#mistake-count').textContent = n ? ('目前有 ' + n + ' 題') : '目前沒有錯題';
        }
        drawCards(); drawProgress(); drawMistakeCount();
        bindChecks($('#progress'), function () { drawCards(); drawProgress(); });
        storageNotice();
      });
    }).catch(function (e) { console.error(e); showError('資料載入失敗：' + e.message); });
    bindBackup();
  }
  function bindBackup() {
    var ex = $('#export'), im = $('#import'), file = $('#import-file');
    if (!ex) return;
    ex.addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(Store.exportAll(), null, 1)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '會考進度備份-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
    im.addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      f.text().then(function (t) {
        Store.importAll(JSON.parse(t));
        alert('已還原進度與錯題本。');
        location.reload();
      }).catch(function (e) { alert('還原失敗：' + e.message); });
    });
  }

  /* ---------- 科目頁 ---------- */
  function pageSubject() {
    var sid = qs('s');
    if (!sid || !/^[a-z0-9-]+$/.test(sid)) { showError('網址缺少科目代碼。'); return; }
    getJSON('data/' + sid + '/index.json').then(function (ix) {
      document.title = ix.name + '｜會考衝刺站';
      $('#crumb-subject').textContent = ix.name;
      var groups = groupUnits(ix, ix.units);
      var h = '<h1>' + esc(ix.icon || '') + ' ' + esc(ix.name) + '</h1>' +
        '<p class="muted">' + esc(ix.blurb || '') + '</p>' +
        groups.map(function (g) {
          return '<div class="card">' + (g.title ? '<h2 style="margin-top:4px">' + esc(g.title) + '</h2>' : '') +
            g.units.map(function (u) { return unitRow(sid, u); }).join('') + '</div>';
        }).join('');
      if (ix.curriculum) {
        h += '<p class="note">單元依據：<a href="' + esc(ix.curriculum.url) + '" target="_blank" rel="noopener">' + esc(ix.curriculum.title) + '</a>' + (ix.curriculum.note ? '，' + esc(ix.curriculum.note) : '') + '</p>';
      }
      if (ix.pastPapers) {
        h += '<p class="note">歷屆試題：<a href="' + esc(ix.pastPapers.url) + '" target="_blank" rel="noopener">' + esc(ix.pastPapers.label) + '</a></p>';
      }
      $('#main').innerHTML = h;
      bindChecks($('#main'));
      storageNotice();
    }).catch(function (e) { console.error(e); showError('找不到這個科目：' + e.message); });
  }

  /* ---------- 題目元件（單元頁與錯題本共用） ---------- */
  function questionHTML(q, n, opts) {
    var two = q.choices.every(function (c) { return String(c).length <= 14; });
    return '<div class="card q" id="' + esc(q.id) + '" data-qid="' + esc(q.id) + '">' +
      '<div class="qh"><span class="qn">' + (opts && opts.label ? esc(opts.label) : ('第 ' + n + ' 題')) + '</span><span class="lv l' + q.level + '">' + (LEVEL[q.level] || '') + '</span>' +
      (q.concept ? '<span class="concept">觀念：' + esc(q.concept) + '</span>' : '') + '</div>' +
      '<div class="stem">' + fmt(q.q) + '</div>' +
      (q.svg ? '<div class="qfig">' + svgBlock(q.svg) + '</div>' : '') +
      '<div class="choices' + (two ? ' two' : '') + '">' +
      q.choices.map(function (c, i) {
        return '<button class="choice" data-i="' + i + '"><span class="lt">' + LETTERS[i] + '</span><span>' + fmt(c) + '</span></button>';
      }).join('') + '</div><div class="after"></div></div>';
  }
  // ctx: {s, u, onAnswer(qid, correct), review:boolean}
  function bindQuestion(el, q, ctx) {
    var afterEl = el.querySelector('.after');
    function reset() {
      el.querySelectorAll('.choice').forEach(function (b) { b.disabled = false; b.classList.remove('right', 'wrong'); });
      afterEl.innerHTML = '';
      delete el.dataset.answered;
    }
    function mistakeBtn() {
      var inBook = Store.hasMistake(q.id);
      return '<button class="btn mk' + (inBook ? ' on' : '') + '">' + (inBook ? '★ 在錯題本裡（點一下移出）' : '☆ 加入錯題本') + '</button>';
    }
    function drawAfter(correct, picked) {
      afterEl.innerHTML =
        '<div class="verdict ' + (correct ? 'ok">答對了！' : 'no">答錯了，正確答案是 (' + LETTERS[q.answer] + ')') + '</div>' +
        '<div class="explain"><strong>詳解：</strong>' + fmt(q.explain) + '</div>' +
        '<div class="qbtns"><button class="btn redo">重做這題</button>' +
        (ctx.review && correct ? '<button class="btn done rm">答對了，移出錯題本</button>' : mistakeBtn()) + '</div>';
      math(afterEl);
    }
    el.addEventListener('click', function (ev) {
      var c = ev.target.closest('.choice');
      if (c && !el.dataset.answered) {
        var i = +c.getAttribute('data-i');
        var correct = i === q.answer;
        el.dataset.answered = '1';
        el.querySelectorAll('.choice').forEach(function (b) {
          b.disabled = true;
          var bi = +b.getAttribute('data-i');
          if (bi === q.answer) b.classList.add('right');
          else if (bi === i) b.classList.add('wrong');
        });
        if (!correct) Store.addMistake(q.id, ctx.s, ctx.u, true);
        drawAfter(correct, i);
        if (ctx.onAnswer) ctx.onAnswer(q.id, correct);
        storageNotice();
        return;
      }
      if (ev.target.closest('.redo')) { reset(); if (ctx.onReset) ctx.onReset(q.id); return; }
      if (ev.target.closest('.mk')) {
        if (Store.hasMistake(q.id)) Store.removeMistake(q.id); else Store.addMistake(q.id, ctx.s, ctx.u, false);
        var b = ev.target.closest('.mk');
        b.outerHTML = mistakeBtn();
        if (ctx.onBookChange) ctx.onBookChange();
        return;
      }
      if (ev.target.closest('.rm')) {
        Store.removeMistake(q.id);
        if (ctx.onRemoved) ctx.onRemoved(q.id, el);
      }
    });
  }

  /* ---------- 單元頁 ---------- */
  function pageUnit() {
    var sid = qs('s'), uid = qs('u');
    if (!sid || !uid || !/^[a-z0-9-]+$/.test(sid) || !/^[a-z0-9-]+$/.test(uid)) { showError('網址缺少科目或單元代碼。'); return; }
    Promise.all([getJSON('data/' + sid + '/index.json'), getJSON('data/' + sid + '/units/' + uid + '.json')]).then(function (r) {
      var ix = r[0], u = r[1];
      var key = unitKey(sid, uid);
      document.title = u.title + '｜' + ix.name + '｜會考衝刺站';
      var cs = $('#crumb-subject');
      cs.textContent = ix.name; cs.href = 'subject.html?s=' + encodeURIComponent(sid);
      var pos = ix.units.findIndex(function (x) { return x.id === uid; });
      var prev = ix.units[pos - 1], next = ix.units[pos + 1];
      var gradeTxt = u.grade ? ({ 7: '七年級', 8: '八年級', 9: '九年級' }[u.grade] || '') : '';
      var h = '';
      h += '<h1>' + esc(u.title) + '</h1>';
      h += '<div class="chips">' + (gradeTxt ? '<span class="chip">' + gradeTxt + '</span>' : '') +
        (u.codes || []).map(function (c) { return '<span class="chip">' + esc(c.code) + '</span>'; }).join('') + '</div>';
      if (u.intro) h += '<p>' + fmt(u.intro) + '</p>';
      h += '<nav class="secnav" aria-label="本頁段落"><a href="#s-notes">重點整理</a><a href="#s-must">必背</a><a href="#s-quiz">自我測驗</a><a href="#s-past">歷屆會考</a><a href="#s-more">延伸學習</a></nav>';

      h += '<h2 id="s-notes">1. 重點整理</h2>';
      if (u.codes && u.codes.length) {
        h += '<div class="card codebox"><strong>課綱學習內容</strong>' + u.codes.map(function (c) { return '<div><b>' + esc(c.code) + '</b>　' + fmt(c.text) + '</div>'; }).join('') + '</div>';
      }
      (u.sections || []).forEach(function (sec) {
        h += '<div class="card sec"><h3>' + fmt(sec.title) + '</h3><ul>' + (sec.points || []).map(function (p) { return '<li>' + fmt(p) + '</li>'; }).join('') + '</ul>' + svgBlock(sec.svg, sec.caption) + '</div>';
      });

      h += '<h2 id="s-must">2. 必背</h2><div class="card must"><dl>' +
        (u.mustKnow || []).map(function (m) { return '<dt>' + fmt(m.name) + '</dt><dd>' + fmt(m.body) + '</dd>'; }).join('') + '</dl></div>';

      var TIERS = [{ id: 'basic', title: '基礎', note: '先確認觀念懂了' }, { id: 'exam', title: '會考難度', note: '情境題、綜合題，跟會考同一個難度' }];
      var quiz = TIERS.reduce(function (acc, t) { return acc.concat((u.quiz || []).filter(function (q) { return tierOf(q) === t.id; })); }, []);
      h += '<h2 id="s-quiz">3. 自我測驗（' + quiz.length + ' 題）</h2><p class="note">點選答案立刻對答案；答錯的題目會自動收進錯題本，並記下是哪個觀念。</p>';
      var num = 0;
      h += '<div class="quizwrap"><div id="quiz">' + TIERS.map(function (t) {
        var qs = quiz.filter(function (q) { return tierOf(q) === t.id; });
        if (!qs.length) return '';
        return '<h3 class="tier tier-' + t.id + '">' + t.title + '（' + qs.length + ' 題）<span class="note">　' + t.note + '</span></h3>' +
          qs.map(function (q) { num += 1; return questionHTML(q, num); }).join('');
      }).join('') + '</div>';
      h += '<div class="scorebar" id="scorebar"><span class="s" id="score-now">已作答 0/' + quiz.length + '</span><span class="muted small" id="score-best"></span><span style="flex:1"></span><button class="btn" id="redo-all">全部重做</button></div></div>';

      h += '<h2 id="s-past">4. 歷屆會考</h2><div class="card">';
      var past = (u.past && u.past.items) || [];
      if (past.length) {
        h += '<p>以下是這個單元在近年會考出現過的題目（點連結到心測中心官方試題本，自己找題號練習）：</p><ul class="links">' +
          past.map(function (p) { return '<li><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.label) + '</a>' + (p.note ? '<span class="note">　' + fmt(p.note) + '</span>' : '') + '</li>'; }).join('') + '</ul>';
      }
      if (ix.pastPapers) h += '<p>全部歷屆試題與參考答案：<a href="' + esc(ix.pastPapers.url) + '" target="_blank" rel="noopener">' + esc(ix.pastPapers.label) + '</a></p>';
      h += '<p class="note">試題著作權屬心測中心，本站只放連結，不轉載題目。</p></div>';

      h += '<h2 id="s-more">5. 延伸學習</h2><div class="card"><ul class="links">' +
        ((u.links && u.links.length ? u.links : (ix.defaultLinks || [])).map(function (l) { return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + '</a>' + (l.note ? '<span class="note">　' + esc(l.note) + '</span>' : '') + '</li>'; }).join('')) + '</ul></div>';

      h += '<div class="qbtns" style="margin-top:24px"><button class="btn' + (Store.isDone(key) ? ' done' : ' pri') + '" id="mark-done">' + (Store.isDone(key) ? '✓ 已讀完（點一下取消）' : '這單元讀完了，打勾') + '</button></div>';
      h += '<div class="qbtns" style="margin-top:12px">' +
        (prev ? '<a class="btn" href="unit.html?s=' + encodeURIComponent(sid) + '&u=' + encodeURIComponent(prev.id) + '">← ' + esc(prev.title) + '</a>' : '') +
        (next ? '<a class="btn" href="unit.html?s=' + encodeURIComponent(sid) + '&u=' + encodeURIComponent(next.id) + '">' + esc(next.title) + ' →</a>' : '') + '</div>';

      var main = $('#main');
      main.innerHTML = h;
      math(main);

      // 測驗狀態
      var answered = {};
      function updScore() {
        var ids = Object.keys(answered);
        var right = ids.filter(function (k) { return answered[k]; }).length;
        $('#score-now').textContent = '已作答 ' + ids.length + '/' + quiz.length + '，答對 ' + right;
        if (ids.length === quiz.length && quiz.length) Store.saveScore(key, right, quiz.length);
        var sc = Store.score(key);
        $('#score-best').textContent = sc ? ('最佳 ' + sc.best + '/' + sc.total) : '';
      }
      quiz.forEach(function (q) {
        bindQuestion(document.getElementById(q.id), q, {
          s: sid, u: uid,
          onAnswer: function (id, ok) { answered[id] = ok; updScore(); },
          onReset: function (id) { delete answered[id]; updScore(); }
        });
      });
      updScore();
      $('#redo-all').addEventListener('click', function () {
        main.querySelectorAll('.q .redo').forEach(function (b) { b.click(); });
        document.getElementById('s-quiz').scrollIntoView({ behavior: 'smooth' });
      });
      $('#mark-done').addEventListener('click', function () {
        var now = !Store.isDone(key);
        Store.setDone(key, now);
        this.className = 'btn' + (now ? ' done' : ' pri');
        this.textContent = now ? '✓ 已讀完（點一下取消）' : '這單元讀完了，打勾';
        storageNotice();
      });
      if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
      storageNotice();
    }).catch(function (e) { console.error(e); showError('找不到這個單元：' + e.message); });
  }

  /* ---------- 錯題本 ---------- */
  function pageMistakes() {
    var m = Store.mistakes();
    var ids = Object.keys(m);
    var main = $('#main');
    function head(n) { return '<h1>錯題本</h1><p class="muted">自我測驗答錯的題目會自動收在這裡（' + n + ' 題）。重做答對後可以把它移出去。</p>'; }
    if (!ids.length) {
      main.innerHTML = head(0) + '<div class="card empty">目前沒有錯題。到單元的「自我測驗」做題，答錯的會自動出現在這裡。</div>';
      storageNotice();
      return;
    }
    // 依科目／單元分組
    var byUnit = {};
    ids.forEach(function (qid) {
      var e = m[qid];
      if (!e || !e.s || !e.u) return;
      var k = e.s + '/' + e.u;
      (byUnit[k] = byUnit[k] || []).push(qid);
    });
    var keys = Object.keys(byUnit);
    getJSON('data/subjects.json').then(function (sj) {
      var names = {};
      sj.subjects.forEach(function (s) { names[s.id] = s.name; });
      return Promise.all(keys.map(function (k) {
        var p = k.split('/');
        return getJSON('data/' + p[0] + '/units/' + p[1] + '.json').then(function (u) { return { k: k, s: p[0], u: u }; }, function () { return { k: k, s: p[0], u: null }; });
      })).then(function (units) {
        units.sort(function (a, b) {
          var la = Math.max.apply(null, byUnit[a.k].map(function (q) { return m[q].last || m[q].t || 0; }));
          var lb = Math.max.apply(null, byUnit[b.k].map(function (q) { return m[q].last || m[q].t || 0; }));
          return lb - la;
        });
        var h = head(ids.length);
        var binds = [];
        // 觀念統計：哪個觀念錯最多
        var cstat = {};
        units.forEach(function (x) {
          if (!x.u) return;
          byUnit[x.k].forEach(function (qid) {
            var q = x.u.quiz.find(function (qq) { return qq.id === qid; });
            if (!q) return;
            var c = q.concept || x.u.title;
            var key2 = x.k + '|' + c;
            var e = cstat[key2] || (cstat[key2] = { c: c, unit: x.u.title, s: x.s, uid: x.u.id, q: 0, n: 0 });
            e.q += 1; e.n += (m[qid].n || 1);
          });
        });
        var clist = Object.keys(cstat).map(function (k) { return cstat[k]; }).sort(function (a, b) { return b.n - a.n || b.q - a.q; });
        if (clist.length) {
          h += '<div class="card"><h3 style="margin-top:0">最常錯的觀念</h3><ul class="links">' + clist.slice(0, 8).map(function (e) {
            return '<li><strong>' + esc(e.c) + '</strong>　<span class="note">' + esc(e.unit) + '・' + e.q + ' 題・共錯 ' + e.n + ' 次・</span><a href="unit.html?s=' + encodeURIComponent(e.s) + '&u=' + encodeURIComponent(e.uid) + '#s-notes">回去看重點</a></li>';
          }).join('') + '</ul></div>';
        }
        units.forEach(function (x) {
          if (!x.u) { h += '<div class="card warn small">有 ' + byUnit[x.k].length + ' 題來自已不存在的單元（' + esc(x.k) + '）。</div>'; return; }
          h += '<h2>' + esc(names[x.s] || x.s) + '｜<a href="unit.html?s=' + encodeURIComponent(x.s) + '&u=' + encodeURIComponent(x.u.id) + '">' + esc(x.u.title) + '</a></h2>';
          byUnit[x.k].forEach(function (qid) {
            var idx = x.u.quiz.findIndex(function (q) { return q.id === qid; });
            if (idx < 0) return;
            var q = x.u.quiz[idx], e = m[qid];
            h += questionHTML(q, idx + 1, { label: (tierOf(q) === 'basic' ? '基礎' : '會考難度') + '・錯 ' + (e.n || 0) + ' 次' });
            binds.push({ q: q, s: x.s, u: x.u.id });
          });
        });
        main.innerHTML = h;
        math(main);
        binds.forEach(function (b) {
          bindQuestion(document.getElementById(b.q.id), b.q, {
            s: b.s, u: b.u, review: true,
            onRemoved: function (id, el) { el.style.opacity = '.4'; el.querySelector('.after').insertAdjacentHTML('beforeend', '<p class="verdict ok">已移出錯題本。</p>'); var r = el.querySelector('.rm'); if (r) r.remove(); }
          });
        });
        storageNotice();
      });
    }).catch(function (e) { console.error(e); showError('錯題本載入失敗：' + e.message); });
  }

  /* ---------- 離線（service worker） ---------- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        var el = $('#offline-state');
        function ok() { if (el) el.textContent = '已可離線使用。'; }
        if (navigator.serviceWorker.controller) ok();
        navigator.serviceWorker.addEventListener('controllerchange', ok);
        if (reg.active && !navigator.serviceWorker.controller) ok();
      }).catch(function (e) { console.warn('SW 註冊失敗', e); });
    });
  }

  var pages = { home: pageHome, subject: pageSubject, unit: pageUnit, mistakes: pageMistakes };
  window.HK = { Store: Store, fmt: fmt };
  document.addEventListener('DOMContentLoaded', function () {
    var p = document.body.getAttribute('data-page');
    if (pages[p]) pages[p]();
  });
  registerSW();
})();
