function updateLogo() {
  const r = document.documentElement;
  const t = r.getAttribute('data-theme');
  const isDark = t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);

  document.querySelectorAll('img.lg-img').forEach((img) => {
    if (!img._logoHooked) {
      img._logoHooked = true;
      img.addEventListener('error', () => {
        if (img._wantDark && img.dataset.srcLight) {
          img._darkFailed = true;
          img._wantDark = false;
          img.classList.add('lg-invert');
          img.src = img.dataset.srcLight;
        }
      });
    }

    img.classList.remove('lg-invert');

    if (isDark && !img._darkFailed && img.dataset.srcDark) {
      img._wantDark = true;
      if (img.getAttribute('src') !== img.dataset.srcDark) img.src = img.dataset.srcDark;
    } else {
      img._wantDark = false;
      if (isDark && img._darkFailed) img.classList.add('lg-invert');
      if (img.dataset.srcLight && img.getAttribute('src') !== img.dataset.srcLight) img.src = img.dataset.srcLight;
    }
  });
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-a]');
  if (t) {
    const f = ACT[t.dataset.a];
    if (f) f(t.dataset.v, t, e);
    return;
  }
  if (e.target.classList && e.target.classList.contains('md')) ACT.close();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') ACT.close();
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !$('pm').classList.contains('hid') && PM.p && PM.p.images.length > 1 && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) {
    e.preventDefault(); ACT.pnav(e.key === 'ArrowLeft' ? -1 : 1);
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('role') === 'button' && e.target.dataset.a) { e.preventDefault(); e.target.click(); }
  if (e.key === 'Enter' && e.target.id === 'pw') ACT.login();
  if (A.ok && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    if (A.tab === 0) { e.preventDefault(); if ($('pf-title')) saveP(); }
    else if (A.tab === 3) { e.preventDefault(); ACT.sset(); }
  }
});

document.addEventListener('input', (e) => {
  const id = e.target.id || '';
  if (id === 'fq') { A.fq = e.target.value; A.pl = 20; plist(); }
  else if (A.ok && A.tab === 0 && id.startsWith('pf-')) drs();
  else if (e.target.dataset && e.target.dataset.a === 'msearch') ACT.msearch(e.target.dataset.v, e.target);
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'pf-file') { upP([...t.files]); t.value = ''; }
  else if (t.id === 'mf-file') { upM([...t.files]); t.value = ''; }
  else if (t.id === 'sf-file') { upSet([...t.files]); t.value = ''; }
});

let sx = null;
document.addEventListener('pointerdown', (e) => { sx = e.pointerType !== 'mouse' && e.target.closest && e.target.closest('.pm-main') ? e.clientX : null; });
document.addEventListener('pointerup', (e) => {
  if (sx !== null && PM.p && PM.p.images.length > 1 && Math.abs(e.clientX - sx) > 50) {
    swp = 1; setTimeout(() => { swp = 0; }, 500); ACT.pnav(e.clientX < sx ? 1 : -1);
  }
  sx = null;
});

let qt;
const onQ = (e) => {
  if (typeof S === 'undefined') return;
  S.q = e.target.value;
  document.querySelectorAll('.qi').forEach((o) => { if (o !== e.target) o.value = S.q; });
  clearTimeout(qt);
  qt = setTimeout(() => {
    S.n = 0; grid();
    if (e.target.id === 'qh' && S.q.trim()) {
      const r = $('colecao').getBoundingClientRect();
      if (r.top > innerHeight * 0.5 || r.bottom < 0) $('colecao').scrollIntoView({ behavior: 'smooth' });
    }
  }, 160);
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.qi').forEach((i) => i.addEventListener('input', onQ));

  const so = $('so');
  if (so) so.addEventListener('change', () => { if (typeof S === 'undefined') return; S.srt = so.value; S.n = 0; Prefs.set({ srt: S.srt }); grid(); });
  addEventListener('pagehide', () => { if (A.ok && A.tab === 0) drsNow(); });
  addEventListener('hashchange', () => openFromHash());

  const pf = Prefs.get();
  if (pf.theme) document.documentElement.setAttribute('data-theme', pf.theme);
  document.querySelectorAll('[data-i]').forEach((e) => (e.innerHTML = ic(e.dataset.i, +e.dataset.s || 20)));

  try {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', updateLogo);
    else if (mq.addListener) mq.addListener(updateLogo);
  } catch (e) {}

  (async () => {
    try {
      await loadFromSupabase();
      const session = await Auth.getSession();
      if (session) {
        const user = session.user;
        if (user?.app_metadata?.role === 'admin') { A.ok = true; }
      }
      try { await IMG.migrateLegacy(); } catch (e) { }
      S.cat = pf.cat || 'Todos'; S.srt = pf.srt || 'feat'; if (so) so.value = S.srt;
      render();
      updateLogo();
      setTimeout(openFromHash, 60);
    } catch (err) {
      console.error('Falha na inicialização:', err);
      toast('Erro ao carregar a loja. Recarregue a página.');
    }
  })();

  updateLogo();

  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
});
