/* 復習チェック（個別） — データは data.js の window.KOBETSU */
(function () {
  const D = window.KOBETSU;
  const KEY = 'kobetsu:' + D.slug;
  const COLORS = { '社会': '#e65100', '理科': '#2e7d32', '国語': '#b71c1c', '情報': '#6a1b9a', '数学': '#1565c0', '英語': '#b8860b' };
  const $ = (s, el) => (el || document).querySelector(s);
  const app = $('#app');

  // ---------- 記録 ----------
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  let ST = load();            // { sessions: [ {set, theme, date, results:{qid:bool}} ] }
  ST.sessions = ST.sessions || [];
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  function themeStatus(set, th) {
    const ss = ST.sessions.filter(s => s.set === set.id && s.theme === th.id);
    const perfectDays = new Set(ss.filter(s => th.questions.every(q => s.results[q.id] === true)).map(s => s.date));
    const last = ss[ss.length - 1];
    const wrongNow = th.questions.filter(q => {
      const hist = ss.map(s => s.results[q.id]).filter(v => v !== undefined);
      return hist.length && hist[hist.length - 1] === false;
    });
    let level = 0, label = '未着手';
    if (perfectDays.size >= 2) { level = 3; label = '修得'; }
    else if (perfectDays.size === 1) { level = 2; label = 'あと1回（別の日に全問正解）'; }
    else if (ss.length) { level = 1; label = '学習中'; }
    return { level, label, tries: ss.length, last, wrongNow, perfectDays: perfectDays.size };
  }

  // ---------- 送信（任意：Googleフォーム） ----------
  function report(session, set, th) {
    const F = D.form; if (!F || !F.action) return;
    const correct = th.questions.filter(q => session.results[q.id] === true).length;
    const fd = new FormData();
    const put = (k, v) => { if (F.entries[k]) fd.append(F.entries[k], v); };
    put('student', D.student); put('set', set.exam + ' ' + set.subject); put('theme', th.id + ' ' + th.title);
    put('score', correct + '/' + th.questions.length); put('date', session.date);
    put('detail', th.questions.map(q => q.id + ':' + (session.results[q.id] === true ? 'o' : session.results[q.id] === false ? 'x' : '-')).join(' '));
    put('status', themeStatus(set, th).label);
    try { fetch(F.action, { method: 'POST', mode: 'no-cors', body: fd }); } catch (e) {}
  }

  // ---------- 画面 ----------
  function h(html) { app.innerHTML = html; window.scrollTo(0, 0); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CIRC = '①②③④⑤⑥⑦⑧⑨';

  function home() {
    let total = 0, done = 0;
    const cards = D.sets.map(set => {
      const col = COLORS[set.group] || '#455a64';
      const ths = set.themes.map(th => {
        total++; const s = themeStatus(set, th); if (s.level === 3) done++;
        return `<a class="theme lv${s.level}" href="#t/${set.id}/${th.id}">
          <span class="badge">${esc(s.label)}</span>
          <span class="ttl">${esc(th.title)}</span>
          <span class="meta">${th.questions.length}問${s.tries ? '・' + s.tries + '回' : ''}${s.wrongNow.length ? '・<b>×' + s.wrongNow.length + '</b>' : ''}</span></a>`;
      }).join('');
      return `<section class="set" style="--c:${col}"><h2>${esc(set.exam)}　${esc(set.subject)}<small>${esc(set.score || '')}</small></h2>${ths}</section>`;
    }).join('');
    h(`<header><h1>${esc(D.student)} の復習チェック</h1>
      <p class="sum">修得 <b>${done}</b> / ${total} テーマ　<span class="hint">「修得」＝別の日に2回、全問正解</span></p></header>
      ${cards}
      <footer><button class="lnk" id="exp">記録をコピー</button>　<button class="lnk" id="rst">記録を消す</button></footer>`);
    $('#exp').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(ST)); alert('コピーしました'); };
    $('#rst').onclick = () => { if (confirm('この端末の記録をすべて消します。よいですか？')) { ST = { sessions: [] }; save(ST); home(); } };
  }

  function find(setId, thId) {
    const set = D.sets.find(s => s.id === setId); const th = set && set.themes.find(t => t.id === thId); return { set, th };
  }

  function themePage(setId, thId) {
    const { set, th } = find(setId, thId); if (!th) return home();
    const s = themeStatus(set, th); const col = COLORS[set.group] || '#455a64';
    const hist = ST.sessions.filter(x => x.set === set.id && x.theme === th.id).slice(-5).reverse()
      .map(x => `<li>${x.date}　${th.questions.filter(q => x.results[q.id] === true).length}/${th.questions.length}</li>`).join('');
    h(`<header style="--c:${col}"><a class="back" href="#">← 一覧</a><h1>${esc(th.title)}</h1>
      <p class="sub">${esc(set.exam)} ${esc(set.subject)}　<span class="badge lv${s.level}">${esc(s.label)}</span></p></header>
      <div class="btns">
        <button class="pri" id="start">全部解く（${th.questions.length}問）</button>
        ${s.wrongNow.length ? `<button class="sec" id="wrong">前回×だけ（${s.wrongNow.length}問）</button>` : ''}
      </div>
      ${hist ? `<details><summary>これまでの結果</summary><ul class="hist">${hist}</ul></details>` : ''}
      ${th.keywords && th.keywords.length ? `<details><summary>必須キーワード</summary><ul>${th.keywords.map(k => '<li>' + esc(k) + '</li>').join('')}</ul></details>` : ''}
      ${th.points && th.points.length ? `<details><summary>共テで狙われるポイント</summary><ul>${th.points.map(k => '<li>' + esc(k) + '</li>').join('')}</ul></details>` : ''}
      ${th.source ? `<p class="src">${esc(th.source)}</p>` : ''}`);
    $('#start').onclick = () => quiz(set, th, th.questions);
    const w = $('#wrong'); if (w) w.onclick = () => quiz(set, th, s.wrongNow);
  }

  function quiz(set, th, qs) {
    const col = COLORS[set.group] || '#455a64';
    const results = {}; let i = 0;
    const order = qs.slice();
    function render() {
      if (i >= order.length) return finish();
      const q = order[i];
      let body = '';
      if (q.type === 'choice') body = q.choices.map((c, k) => `<button class="opt" data-k="${k + 1}">${CIRC[k]}　${esc(c)}</button>`).join('');
      else if (q.type === 'multi') body = q.choices.map((c, k) => `<button class="opt" data-k="${k + 1}">${CIRC[k]}　${esc(c)}</button>`).join('') + `<p class="hint">当てはまるものをすべて選んでから「決定」</p><button class="pri" id="dec">決定</button>`;
      else if (q.type === 'tf') body = `<button class="opt" data-k="true">○ 正しい</button><button class="opt" data-k="false">× 誤り</button>`;
      else body = `<div class="ans"><input id="txt" placeholder="答えを書く（省略可）" autocomplete="off"><button class="pri" id="show">答えを見る</button></div>`;
      h(`<header style="--c:${col}"><a class="back" href="#t/${set.id}/${th.id}">← やめる</a><p class="sub">${esc(th.title)}　${i + 1} / ${order.length}</p></header>
        <div class="q"><p class="qt"><span class="qid">${esc(q.id)}</span>${esc(q.q)}</p>${body}<div id="fb"></div></div>`);
      if (q.type === 'multi') {
        app.querySelectorAll('.opt').forEach(b => b.onclick = () => b.classList.toggle('sel'));
        $('#dec').onclick = () => { const sel = [...app.querySelectorAll('.opt.sel')].map(b => +b.dataset.k); $('#dec').disabled = true; multiJudge(q, sel); };
      } else app.querySelectorAll('.opt').forEach(b => b.onclick = () => judge(q, b.dataset.k));
      const sh = $('#show'); if (sh) sh.onclick = () => selfJudge(q);
    }
    function feedback(q, ok, chosen) {
      results[q.id] = ok;
      let ansTxt = q.type === 'multi' ? q.answer.map(a => CIRC[a - 1] + '　' + q.choices[a - 1]).join('　／　') : q.type === 'choice' ? CIRC[q.answer - 1] + '　' + q.choices[q.answer - 1] : q.type === 'tf' ? (q.answer ? '○ 正しい' : '× 誤り') : q.answer;
      $('#fb').innerHTML = `<div class="res ${ok ? 'ok' : 'ng'}"><b>${ok ? '○ 正解' : '× 不正解'}</b>　正解：${esc(ansTxt)}</div>
        <p class="exp">${esc(q.exp || '')}</p>${q.src ? `<p class="src">出典：${esc(q.src)}</p>` : ''}
        <button class="pri" id="next">${i + 1 < order.length ? '次へ' : '結果を見る'}</button>`;
      app.querySelectorAll('.opt').forEach(b => { b.disabled = true;
        if (q.type === 'multi') { const k = +b.dataset.k, inAns = q.answer.includes(k), inSel = b.classList.contains('sel'); if (inAns) b.classList.add('ok'); else if (inSel) b.classList.add('ng'); return; }
        if (String(b.dataset.k) === String(chosen)) b.classList.add(ok ? 'ok' : 'ng'); if (q.type !== 'text' && String(b.dataset.k) === String(q.answer)) b.classList.add('ok'); });
      $('#next').onclick = () => { i++; render(); };
      $('#next').scrollIntoView({ block: 'nearest' });
    }
    function multiJudge(q, sel) { const a = q.answer.slice().sort().join(','), b = sel.slice().sort().join(','); feedback(q, a === b, null); }
    function judge(q, k) { const ok = String(k) === String(q.answer); feedback(q, ok, k); }
    function selfJudge(q) {
      const v = ($('#txt') || {}).value || '';
      $('#fb').innerHTML = `<div class="res"><b>正解：</b>${esc(q.answer)}${v ? '　／　あなた：' + esc(v) : ''}</div>
        <p class="exp">${esc(q.exp || '')}</p><p>自分の答えは…</p><div class="btns"><button class="pri" id="y">合っていた</button><button class="sec" id="n">違った</button></div>`;
      $('#show').disabled = true;
      $('#y').onclick = () => feedback(q, true, null); $('#n').onclick = () => feedback(q, false, null);
    }
    function finish() {
      const session = { set: set.id, theme: th.id, date: today(), results: {} };
      // 「前回×だけ」のときは、解かなかった問題は前回の結果を引き継ぐ
      const prev = ST.sessions.filter(x => x.set === set.id && x.theme === th.id).pop();
      th.questions.forEach(q => { if (results[q.id] !== undefined) session.results[q.id] = results[q.id]; else if (prev && prev.results[q.id] !== undefined) session.results[q.id] = prev.results[q.id]; });
      ST.sessions.push(session); save(ST); report(session, set, th);
      const s = themeStatus(set, th);
      const n = order.filter(q => results[q.id]).length;
      h(`<header style="--c:${col}"><h1>${n} / ${order.length} 正解</h1><p class="sub">${esc(th.title)}　<span class="badge lv${s.level}">${esc(s.label)}</span></p></header>
        <ul class="list">${order.map(q => `<li class="${results[q.id] ? 'ok' : 'ng'}"><b>${results[q.id] ? '○' : '×'}</b> ${esc(q.id)}　${esc(q.q)}</li>`).join('')}</ul>
        <div class="btns"><a class="pri" href="#t/${set.id}/${th.id}">このテーマへ</a><a class="sec" href="#">一覧へ</a></div>
        ${s.level === 3 ? '<p class="done">修得！　別の日にもう一度解いて定着を確かめましょう。</p>' : s.level === 2 ? '<p class="done">全問正解。別の日にもう一度全問正解で「修得」です。</p>' : ''}`);
    }
    render();
  }

  function route() {
    const m = location.hash.match(/^#t\/([^/]+)\/([^/]+)$/);
    if (m) themePage(decodeURIComponent(m[1]), decodeURIComponent(m[2])); else home();
  }
  window.addEventListener('hashchange', route);
  route();
})();
