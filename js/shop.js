function footer(){
  const s=DB.set,ig=String(s.ig||'').replace(/^@/,''),L=[`<a class="tg" target="_blank" rel="noopener" href="${esc(wa('Olá! Vim pelo site e gostaria de ajuda.'))}">WhatsApp</a>`];
  if(/^[\w.]{1,30}$/.test(ig))L.push(`<a class="tg" target="_blank" rel="noopener" href="https://www.instagram.com/${ig}/">@${ig}</a>`);
  if(okUrl(s.fb))L.push(`<a class="tg" target="_blank" rel="noopener" href="${esc(s.fb)}">Facebook</a>`);
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email||''))L.push(`<a class="tg" href="mailto:${esc(s.email)}">${esc(s.email)}</a>`);
  $('ft').innerHTML=`<div class="ft-logo"><img class="lg-img lg-lt" src="https://i.postimg.cc/Gtg1bpvd/c6a4fc52-ab25-443d-bf6f-992d00b2fb96.png" alt="IMPACTO" width="200" height="72" loading="lazy" decoding="async"><img class="lg-img lg-dk" src="https://i.postimg.cc/8c4zMDWt/2684da40-4cf7-46de-a601-c890ff6d7988.png" alt="IMPACTO" width="200" height="72" loading="lazy" decoding="async"></div>${s.about?`<p style="max-width:560px">${esc(s.about)}</p>`:''}<p>${esc(s.addr)}</p><div class="lk">${L.join('')}</div><button class="dots-btn" data-a="admin" tabindex="-1" aria-hidden="true">•••</button>`
}
