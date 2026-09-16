(() => {
  'use strict';
  const root=document.documentElement,forced=new URLSearchParams(location.search).get('entry-preview')==='1';
  let cached={},seen=false,isReload=false;
  try{cached=JSON.parse(localStorage.getItem('swyftEntryPreferences') || '{}') || {};seen=sessionStorage.getItem('swyftEntrySeenV2')==='1';}catch{}
  try{isReload=performance.getEntriesByType?.('navigation')[0]?.type==='reload' || performance.navigation?.type===1;}catch{}
  // Refresh always replays the entrance. Old device preferences and late
  // Firebase snapshots may only suppress ordinary page-to-page navigation.
  const shouldSkip=settings=>!forced && !isReload && (settings.loaderEnabled===false || (seen && settings.loaderMode==='session'));
  if(shouldSkip(cached)){window.SwyftEntry={active:false};return;}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started=0,lastTick=0,elapsed=0,frame=0,deadline=0,playing=false;
  let done=false,removed=false,exitTimer=0,domReady=false,settingsReady=false,assetsReady=false,fontReady=false,displayed=0,tickTimer=0,finishTimer=0,finishing=false;
  const overlay=document.createElement('dialog');overlay.className='swyft-entry';overlay.setAttribute('aria-label','กำลังเข้าสู่ TATAROS');overlay.tabIndex=-1;
  overlay.innerHTML='<div class="entry-atmosphere" aria-hidden="true"></div><div class="entry-content"><div class="entry-wordmark"><h1 class="entry-brand">TATAROS</h1></div><div class="entry-orbit" role="progressbar" aria-label="ความคืบหน้าการเตรียมหน้าเว็บไซต์" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="entry-orbit-track" aria-hidden="true"></div><div class="entry-orbit-outer" aria-hidden="true"></div><div class="entry-orbit-inner" aria-hidden="true"></div><div class="entry-orbit-core"><div class="entry-counter"><span class="entry-count">00</span><span class="entry-percent">%</span></div><span class="entry-loading-label">LOADING</span></div></div><div class="entry-progress-track" aria-hidden="true"><div class="entry-progress-fill"></div></div><p class="entry-status" role="status" aria-live="polite">กำลังเตรียมเว็บไซต์</p></div>';
  document.body.append(overlay);window.SwyftEntry={active:true};root.classList.add('swyft-entering');
  const count=overlay.querySelector('.entry-count'),orbit=overlay.querySelector('.entry-orbit'),fill=overlay.querySelector('.entry-progress-fill'),status=overlay.querySelector('.entry-status');
  function remove(){
    if(removed)return;removed=true;clearTimeout(exitTimer);
    if(overlay.open)overlay.close();overlay.remove();root.classList.remove('swyft-entering');window.SwyftEntry.active=false;window.dispatchEvent(new Event('swyft:entry-ready'));
  }
  function close(immediate=false){
    if(done){if(immediate)remove();return;}done=true;clearTimeout(deadline);clearTimeout(settingsDeadline);clearTimeout(tickTimer);clearTimeout(finishTimer);if(frame)window.cancelAnimationFrame?.(frame);
    try{sessionStorage.setItem('swyftEntrySeenV2','1');}catch{}
    overlay.classList.add('entry-complete');
    if(immediate || reduced)remove();else exitTimer=window.setTimeout(remove,780);
  }
  // Arm the fail-open deadline only after the entrance has had a chance to
  // paint. Time spent in a background tab must not consume the visible intro.
  function armDeadline(){clearTimeout(deadline);if(playing && !document.hidden && !done)deadline=window.setTimeout(()=>close(true),Math.max(0,8000-elapsed));}
  // Remote identity is optional: retain the page defaults when a connection is slow.
  const settingsDeadline=window.setTimeout(()=>{settingsReady=true;progress();},1800);
  try{overlay.showModal();overlay.focus({preventScroll:true});}catch{overlay.setAttribute('open','');}
  overlay.addEventListener('cancel',event=>{event.preventDefault();close();});
  function paint(value){
    const rounded=Math.floor(value);count.textContent=String(rounded).padStart(2,'0');orbit.setAttribute('aria-valuenow',String(rounded));fill.style.width=value+'%';
  }
  function tick(){
    tickTimer=0;if(done)return;
    // This is an entrance sequence, not a downloaded-byte estimate. Hold 00
    // visibly, then advance continuously even when external media never loads.
    const now=performance.now();
    if(!document.hidden)elapsed+=Math.min(75,Math.max(0,now-lastTick));
    lastTick=now;
    // Reduced motion disables spinning, not the entire loading screen.
    displayed=Math.min(100,Math.max(0,(elapsed-450)/2100)*100);
    paint(displayed);
    if(displayed>=100){status.textContent='พร้อมแล้ว';if(!finishing){finishing=true;finishTimer=setTimeout(()=>close(),180);}return;}
    tickTimer=setTimeout(tick,24);
  }
  function progress(){
    if(done)return;
    if(!finishing)status.textContent=domReady && fontReady && settingsReady && assetsReady?'กำลังเข้าสู่เว็บไซต์':'กำลังเตรียมเว็บไซต์';
  }
  function apply(settings){
    if(done)return;
    overlay.querySelector('.entry-brand').textContent=settings.loaderLabel || 'TATAROS';
    if(/^#[0-9a-f]{6}$/i.test(settings.loaderAccent))overlay.style.setProperty('--entry-accent',settings.loaderAccent);
    if(shouldSkip(settings))close(true);
  }
  apply(cached);
  paint(0);
  function startPlayback(){if(done || playing)return;playing=true;started=lastTick=performance.now();armDeadline();tickTimer=setTimeout(tick,24);}
  // Two frames preserve a visible 00 before the timer starts, even on a
  // cached page or when synchronous page scripts delay the first render.
  if(!done){if(window.requestAnimationFrame)frame=window.requestAnimationFrame(()=>{if(!done)frame=window.requestAnimationFrame(startPlayback);});else tickTimer=setTimeout(startPlayback,32);}
  document.addEventListener('visibilitychange',()=>{lastTick=performance.now();armDeadline();});
  window.addEventListener('swyft:control',event=>apply(event.detail || {}));
  window.addEventListener('swyft:control-ready',()=>{settingsReady=true;progress();},{once:true});
  const onDom=()=>{domReady=true;progress();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onDom,{once:true});else onDom();
  const onLoad=()=>{assetsReady=true;progress();};
  if(document.readyState==='complete')onLoad();else window.addEventListener('load',onLoad,{once:true});
  if(document.fonts?.ready)document.fonts.ready.then(()=>{fontReady=true;progress();},()=>{fontReady=true;progress();});else{fontReady=true;progress();}
  window.addEventListener('pagehide',()=>close(true),{once:true});
  window.addEventListener('pageshow',event=>{if(event.persisted)close(true);});
})();
