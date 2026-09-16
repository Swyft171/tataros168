(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SwyftShared = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';
  const defaults = Object.freeze({homeLabel:'HOME',memberLabel:'MEMBERS',heroEyebrow:'HOUSE OF',heroSubtitle:'',ctaText:'OPEN MEMBERS',ctaUrl:'members.html',peopleTitle:'',showMusic:true,showGrain:true,musicVolume:72,showPartners:false,partners:[],customColors:false,colorBackground:'#080808',colorText:'#f1ede2',colorMuted:'#8b877e',colorAccent:'#d4af37',backgroundBlur:0,backgroundZoom:100,motionIntensity:100,snowAmount:36,loaderEnabled:true,loaderMode:'always',loaderLabel:'TATAROS',loaderCaption:'ยินดีต้อนรับสู่บ้านของเรา',loaderAccent:'#d4af37'});
  const normalizeName = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('th-TH');
  function safeUrl(value, relative = false) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/[\u0000-\u0020]/.test(raw)) throw new Error('URL ต้องไม่มีช่องว่าง');
    if (relative && /^(?:\.\/)?[a-z0-9_-]+\.html(?:[?#].*)?$/i.test(raw)) return raw;
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(candidate);
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password || !url.hostname || raw.startsWith('//')) throw new Error('ใช้ลิงก์ http หรือ https ที่ถูกต้อง');
    if (/^(www\.)?dropbox\.com$/i.test(url.hostname)) {
      url.searchParams.delete('dl');url.searchParams.delete('st');url.searchParams.set('raw','1');
    }
    return url.href;
  }
  const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
  function parseNames(input, existing = [], skipDuplicates = true) {
    const seen = new Set(existing.map(item => normalizeName(item.name)));
    const names = [], skipped = [], invalid = [];
    for (const line of String(input || '').split(/\r?\n/)) {
      const name = line.trim().replace(/\t+/g,' ').replace(/\s+/g,' ');
      if (!name) continue;
      if (name.length > 120) {invalid.push(name);continue;}
      const key = normalizeName(name);
      if (skipDuplicates && seen.has(key)) {skipped.push(name);continue;}
      seen.add(key);names.push(name);
    }
    return {names, skipped, invalid};
  }
  function paginate(items, page, size = 25) {
    const pages = Math.max(1,Math.ceil(items.length / size));
    const current = Math.max(1,Math.min(pages, Math.floor(Number(page) || 1)));
    return {items:items.slice((current-1)*size,current*size),page:current,pages,total:items.length};
  }
  const images = new Map();
  function setImages(docs) {images.clear();docs.filter(d => d.type === 'siteSharedImage').forEach(d => images.set(d.id,d.imageData || d.imageUrl || ''));}
  function imageFor(member) {return member?.imageMediaUrl || member?.imageData || member?.imageUrl || images.get(member?.sharedImageId) || '';}
  return {defaults,normalizeName,safeUrl,clamp,parseNames,paginate,setImages,imageFor};
});
