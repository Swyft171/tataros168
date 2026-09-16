(() => {
  'use strict';
  const S = window.SwyftShared, $ = selector => document.querySelector(selector);
  const CONTROL_DOC = '__site_control';
  let settings = {...S.defaults}, members = [], currentUser = null, db;
  let memberPage = 1, filtered = [], selected = new Set(), partnerDraft = [], busy = false, stop = false, job = null;
  const dirty = new Set(), unsubscribers = [];
  const field = (name,label,type='text',extra='') => `<label><span>${label}</span><input name="${name}" type="${type}" ${extra}></label>`;
  const check = (name,label) => `<label class="control-check"><input name="${name}" type="checkbox"><span>${label}</span></label>`;
  const card = (title,subtitle,body) => `<section class="site-settings-card"><div class="section-head"><div><span>${subtitle}</span><h2>${title}</h2></div></div>${body}</section>`;
  function form(id,body) {return `<form id="${id}" class="control-form">${body}<div><button type="submit" class="primary-btn">บันทึกการตั้งค่า</button></div><div class="admin-message" role="status" aria-live="polite"></div></form>`;}
  $('#control-home').innerHTML = card('ข้อความบนเว็บไซต์','HOME / CONTENT',form('controlHomeForm',`
    <div class="control-grid">${field('homeLabel','ชื่อเมนูหน้าแรก','text','maxlength="40"')}${field('memberLabel','ชื่อเมนูสมาชิก','text','maxlength="40"')}${field('heroEyebrow','ข้อความเหนือชื่อ TATAROS','text','maxlength="100"')}${field('heroSubtitle','คำอธิบายหน้าแรก','text','maxlength="250"')}${field('ctaText','ข้อความปุ่มเข้าชมสมาชิก','text','maxlength="60"')}${field('ctaUrl','ลิงก์ของปุ่ม','text','placeholder="members.html" required')}${field('peopleTitle','หัวข้อหน้าสมาชิก (เว้นว่างใช้ของเดิม)','text','maxlength="100"')}</div><div class="control-grid">${check('showGrain','แสดงพื้นผิว Noise')}${check('showMusic','แสดงและเล่นเพลงบนเว็บไซต์')}</div>`));
  $('#control-appearance').insertAdjacentHTML('beforeend',card('ปรับแต่งเพิ่มเติม','APPEARANCE / EXTENDED',form('controlAppearanceForm',`
    ${check('customColors','ใช้โทนสีที่กำหนดเอง (ปิดเพื่อคงสีเดิมของ TATAROS)')}<div class="control-grid four">${field('colorBackground','สีพื้นหลัง','color')}${field('colorText','สีข้อความ','color')}${field('colorMuted','สีข้อความรอง','color')}${field('colorAccent','สีเน้น','color')}</div><div class="control-grid">${field('backgroundBlur','ความเบลอพื้นหลัง (0–20 px)','number','min="0" max="20"')}${field('backgroundZoom','ขนาดพื้นหลัง (100–125%)','number','min="100" max="125"')}${field('motionIntensity','ความแรงการขยับตามเมาส์ (0–100%)','number','min="0" max="100"')}${field('snowAmount','จำนวนเกล็ดหิมะ (10–60)','number','min="10" max="60"')}</div><p class="control-help">เอฟเฟกต์หิมะ ฝน และเถ้าถ่านยังเลือกได้จากส่วนพื้นหลังเดิมด้านบน</p>`)));
  $('#control-music').insertAdjacentHTML('afterbegin',card('ระดับเสียงเริ่มต้น','MUSIC / PREFERENCES',form('controlMusicForm',`${field('musicVolume','ระดับเสียงเริ่มต้น (0–100%)','range','min="0" max="100" step="1"')}<output id="controlVolumeValue">72%</output><p class="control-help">ผู้เข้าชมยังปรับเสียงเองได้ ระบบจะจำเสียงที่ผู้เข้าชมเลือกไว้</p>`)));
  $('#control-loader').innerHTML = card('TATAROS / ORBIT','ENTRY SEQUENCE',form('controlLoaderForm',`
    <p class="control-note">วงแหวนหมุนพร้อมเปอร์เซ็นต์การเตรียมหน้าเว็บ เมื่อพร้อมจะเลื่อนฉากดำขึ้นเพื่อเผยเว็บไซต์</p><div class="control-grid">${check('loaderEnabled','เปิดหน้าโหลดเมื่อเปลี่ยนหน้า (รีเฟรชแสดงเสมอ)')}<label><span>แสดงเมื่อใด</span><select name="loaderMode"><option value="always">ทุกครั้งที่เปิดหน้าเว็บและรีเฟรช</option><option value="session">ครั้งแรกของแท็บ + ทุกครั้งที่รีเฟรช</option></select></label>${field('loaderLabel','ชื่อบนหน้าโหลด','text','maxlength="40" required')}${field('loaderAccent','สีแสงวงแหวน','color')}</div><p class="control-help">รีเฟรชแสดงเสมอทั้ง HOME และ MEMBERS แม้เคยปิดไว้ โหมด Reduce motion ยังแสดงตัวเลขโดยไม่หมุน เริ่มนับหลังหน้าโหลดปรากฏ และไม่รอข้อมูลภายนอก</p><a class="ghost-btn" href="index.html?entry-preview=1" target="_blank" rel="noopener">ดูหน้าโหลดที่บันทึกแล้ว ↗</a>`));
  $('#control-partners').innerHTML = card('พาร์ทเนอร์ของบ้าน','PARTNERS / LINKS',form('controlPartnersForm',`${check('showPartners','แสดงปุ่มพาร์ทเนอร์ฝั่งขวาของหน้าแรก')}<div id="controlPartnerList"></div><div><button type="button" id="controlAddPartner" class="ghost-btn">+ เพิ่มพาร์ทเนอร์</button></div><p class="control-help">รายชื่อซ่อนอยู่ฝั่งขวา กดปุ่มลูกศร &lt; เพื่อเปิดช่องรายชื่อ ใส่ชื่อและลิงก์เว็บ จัดลำดับ ซ่อน หรือลบได้ โดยข้อมูลสมาชิกไม่เปลี่ยน</p>`));
  const formIds = ['controlHomeForm','controlAppearanceForm','controlMusicForm','controlLoaderForm','controlPartnersForm'];
  const numeric = ['musicVolume','backgroundBlur','backgroundZoom','motionIntensity','snowAmount'];
  const setMessage = (el,text,error=false) => {el.textContent=text;el.classList.toggle('error',error);el.classList.toggle('success',!error && Boolean(text));};
  function fillForms() {
    for (const id of formIds) {
      if (dirty.has(id)) continue;
      for (const input of $(`#${id}`).querySelectorAll('[name]')) {
        if (!(input.name in S.defaults)) continue;
        if (input.type === 'checkbox') input.checked = Boolean(settings[input.name]);
        else input.value = settings[input.name] ?? '';
      }
    }
    if (!dirty.has('controlPartnersForm')) {partnerDraft=(Array.isArray(settings.partners)?settings.partners:[]).map(p=>({...p}));renderPartners();}
    $('#controlVolumeValue').textContent = `${$('#controlMusicForm [name=musicVolume]').value}%`;
  }
  function allowed() {
    const user = window.firebase?.auth().currentUser;
    return Boolean(user && currentUser && user.uid === currentUser.uid && String(user.email).toLowerCase() === String(window.SWYFT_ADMIN_EMAIL).toLowerCase());
  }
  for (const id of formIds) {
    const el=$(`#${id}`);
    el.addEventListener('input',()=>dirty.add(id));
    el.addEventListener('change',()=>dirty.add(id));
    el.addEventListener('submit',async event=>{
      event.preventDefault();
      const message=el.querySelector('.admin-message'), button=el.querySelector('[type=submit]');
      if (!allowed()) return setMessage(message,'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแล',true);
      if (!el.reportValidity()) return;
      button.disabled=true;
      try {
        const patch={};
        for(const input of el.querySelectorAll('[name]')) {
          if(!(input.name in S.defaults)) continue;
          patch[input.name]=input.type==='checkbox'?input.checked:numeric.includes(input.name)?Number(input.value):input.value.trim();
        }
        if ('ctaUrl' in patch) patch.ctaUrl=S.safeUrl(patch.ctaUrl,true);
        if(id==='controlPartnersForm') {
          patch.partners=partnerDraft.map(p=>{
            if(!String(p.name||'').trim())throw new Error('กรุณาใส่ชื่อพาร์ทเนอร์ทุกแถว');
            const url=S.safeUrl(p.url);if(!url)throw new Error('กรุณาใส่ลิงก์พาร์ทเนอร์ทุกแถว');
            return {name:p.name.trim().slice(0,60),url,visible:p.visible!==false};
          });
        }
        await db.collection('members').doc(CONTROL_DOC).set({type:'siteControl',role:'settings',order:-995,...patch,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
        settings={...settings,...patch};dirty.delete(id);fillForms();
        setMessage(message,'บันทึกแล้ว หน้าเว็บไซต์จะอัปเดตอัตโนมัติ');
      } catch(error){setMessage(message,error.message || 'บันทึกไม่สำเร็จ ลองอีกครั้ง',true);}
      finally{button.disabled=false;}
    });
  }
  $('#controlMusicForm').addEventListener('input',()=>{$('#controlVolumeValue').textContent=`${$('#controlMusicForm [name=musicVolume]').value}%`;});
  function renderPartners() {
    const list=$('#controlPartnerList');list.replaceChildren();
    if(!partnerDraft.length){const empty=document.createElement('p');empty.className='control-help';empty.textContent='ยังไม่มีพาร์ทเนอร์';list.append(empty);}
    partnerDraft.forEach((partner,index)=>{
      const row=document.createElement('div');row.className='control-partner';
      row.innerHTML=`<label><span>ชื่อพาร์ทเนอร์</span><input maxlength="60" required data-partner="name"></label><label><span>ลิงก์เว็บไซต์</span><input required data-partner="url" placeholder="https://example.com"></label><div class="control-partner-actions"><label class="control-check"><input type="checkbox" data-partner="visible"><span>แสดง</span></label><button type="button" class="tiny-btn" data-move="-1" aria-label="เลื่อนขึ้น">↑</button><button type="button" class="tiny-btn" data-move="1" aria-label="เลื่อนลง">↓</button><button type="button" class="danger-btn" data-remove aria-label="ลบพาร์ทเนอร์">×</button></div>`;
      row.querySelector('[data-partner=name]').value=partner.name || '';
      row.querySelector('[data-partner=url]').value=partner.url || '';
      row.querySelector('[data-partner=visible]').checked=partner.visible!==false;
      row.addEventListener('input',event=>{const key=event.target.dataset.partner;if(key)partner[key]=key==='visible'?event.target.checked:event.target.value;});
      row.querySelectorAll('[data-move]').forEach(button=>{
        const target=index+Number(button.dataset.move);button.disabled=target<0 || target>=partnerDraft.length;
        button.addEventListener('click',()=>{[partnerDraft[index],partnerDraft[target]]=[partnerDraft[target],partnerDraft[index]];dirty.add('controlPartnersForm');renderPartners();});
      });
      row.querySelector('[data-remove]').addEventListener('click',()=>{partnerDraft.splice(index,1);dirty.add('controlPartnersForm');renderPartners();});
      list.append(row);
    });
  }
  $('#controlAddPartner').addEventListener('click',()=>{if(partnerDraft.length>=50)return;partnerDraft.push({name:'',url:'',visible:true});dirty.add('controlPartnersForm');renderPartners();});

  // Reuse Swyft's existing editor; enhance its list without replacing member fields.
  const listCard=$('#adminMemberList').closest('.list-card');
  listCard.querySelector('.admin-search').insertAdjacentHTML('afterend',`
    <div class="control-toolbar"><button type="button" id="controlBulkAdd" class="primary-btn">+ เพิ่มหลายคน</button><button type="button" id="controlBulkPhoto" class="ghost-btn">เปลี่ยนรูปหลายคน</button><select id="controlRoleFilter" class="control-role-filter" aria-label="กรองยศสมาชิก"><option value="all">ทุกยศ</option><option value="owner">OWNER</option><option value="core">LEADER</option><option value="bigsupport">BIGSUPPORT</option><option value="member">MEMBERS</option></select></div>
    <div class="control-toolbar"><label class="control-check"><input type="checkbox" id="controlSelectPage"><span>เลือกหน้านี้</span></label><button type="button" id="controlSelectAll" class="tiny-btn">เลือกทุกหน้าที่ค้นพบ</button><button type="button" id="controlClearSelection" class="tiny-btn">ล้างการเลือก</button><button type="button" id="controlDeleteSelected" class="danger-btn" disabled>ลบที่เลือก</button><span id="controlSelectionCount" role="status" aria-live="polite">เลือก 0 คน</span></div>`);
  $('#adminMemberList').insertAdjacentHTML('afterend','<nav id="controlMemberPagination" class="control-pagination" aria-label="หน้ารายชื่อสมาชิก"></nav>');
  function rerender(){window.dispatchEvent(new Event('swyft:render-admin'));}
  function updateSelection() {
    $('#controlSelectionCount').textContent=`เลือก ${selected.size.toLocaleString('th-TH')} คน`;
    $('#controlDeleteSelected').disabled=!selected.size;
    const page=S.paginate(filtered,memberPage).items;
    const count=page.filter(m=>selected.has(m.id)).length;
    $('#controlSelectPage').checked=page.length>0 && count===page.length;
    $('#controlSelectPage').indeterminate=count>0 && count<page.length;
  }
  window.SwyftPeople={
    renderSlice(items){
      filtered=items.filter(m=>$('#controlRoleFilter').value==='all' || m.role===$('#controlRoleFilter').value);
      const slice=S.paginate(filtered,memberPage);memberPage=slice.page;
      const pager=$('#controlMemberPagination');pager.replaceChildren();
      const previous=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');
      previous.type=next.type='button';previous.className=next.className='ghost-btn';previous.textContent='← ก่อนหน้า';next.textContent='ถัดไป →';previous.disabled=memberPage===1;next.disabled=memberPage===slice.pages;
      label.textContent=`${memberPage} / ${slice.pages} · ${slice.total.toLocaleString('th-TH')} คน`;
      previous.addEventListener('click',()=>{memberPage--;rerender();});next.addEventListener('click',()=>{memberPage++;rerender();});pager.append(previous,label,next);updateSelection();return slice.items;
    },
    decorate(row,member){const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.className='control-member-select';checkbox.setAttribute('aria-label',`เลือก ${member.name || 'สมาชิก'}`);checkbox.checked=selected.has(member.id);checkbox.addEventListener('change',()=>{checkbox.checked?selected.add(member.id):selected.delete(member.id);updateSelection();});row.prepend(checkbox);row.classList.add('has-selection');},
    resetPage(){memberPage=1;}
  };
  $('#controlRoleFilter').addEventListener('change',()=>{memberPage=1;rerender();});
  $('#controlSelectPage').addEventListener('change',event=>{S.paginate(filtered,memberPage).items.forEach(m=>event.target.checked?selected.add(m.id):selected.delete(m.id));rerender();});
  $('#controlSelectAll').addEventListener('click',()=>{filtered.forEach(m=>selected.add(m.id));rerender();});
  $('#controlClearSelection').addEventListener('click',()=>{selected.clear();rerender();});
  window.addEventListener('swyft:admin-data',event=>{
    members=event.detail.members;const ids=new Set(members.map(m=>m.id));selected=new Set([...selected].filter(id=>ids.has(id)));updateSelection();
    if(dialog.open && !busy && !job)updateBulkPreview();
  });

  // Every destructive/bulk operation is frozen as an explicit reviewed plan.
  const dialog=document.createElement('dialog');dialog.className='control-dialog';dialog.id='controlBulkDialog';dialog.setAttribute('aria-labelledby','controlBulkTitle');
  dialog.innerHTML=`<form id="controlBulkForm"><header><h2 id="controlBulkTitle">จัดการสมาชิก</h2><button type="button" class="ghost-btn" id="controlBulkClose" aria-label="ปิด">×</button></header><fieldset id="controlBulkFields">
    <div id="controlBulkNamesGroup"><label><span>วางชื่อคนละบรรทัด (รองรับ 800+ คน)</span><textarea id="controlBulkNames" maxlength="300000" placeholder="ชื่อสมาชิกคนที่ 1&#10;ชื่อสมาชิกคนที่ 2"></textarea></label><div class="control-grid"><label><span>ยศ</span><select id="controlBulkRole"><option value="member">MEMBERS</option><option value="bigsupport">BIGSUPPORT</option><option value="core">LEADER</option><option value="owner">OWNER</option></select></label><label><span>สถานะ</span><select id="controlBulkStatus"><option>ONLINE</option><option>OFFLINE</option><option>AWAY</option><option>BUSY</option><option>DND</option><option>STREAMING</option></select></label><label class="control-check"><input id="controlSkipDuplicates" type="checkbox" checked><span>ข้ามชื่อซ้ำ</span></label><label class="control-check"><input id="controlBulkVisible" type="checkbox" checked><span>แสดงบนเว็บไซต์</span></label></div></div>
    <label id="controlPhotoScopeGroup"><span>สมาชิกที่จะเปลี่ยนรูป</span><select id="controlPhotoScope"><option value="selected">เฉพาะที่เลือก</option><option value="member">เฉพาะยศ MEMBERS</option><option value="all">ทุกยศ รวม OWNER / LEADER / BIGSUPPORT</option></select></label>
    <div id="controlBulkImageGroup"><label><span>รูปเดียวสำหรับสมาชิกชุดนี้ (ไฟล์จะมีลำดับความสำคัญกว่า URL)</span><input id="controlBulkFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><label><span>หรือ URL รูป / GIF / MP4</span><input id="controlBulkImageUrl" placeholder="https://..." inputmode="url"></label><p class="control-help">รูปอัปโหลดจะเก็บเพียงชุดเดียว การแก้ชื่อสมาชิกภายหลังจะไม่ทำให้รูปหาย</p></div>
    </fieldset><p id="controlBulkSummary" class="control-note" role="status" aria-live="polite"></p><img id="controlBulkImagePreview" class="control-shared-preview" alt="รูปที่เลือก" hidden><ol id="controlBulkPreview"></ol><progress id="controlBulkProgress" value="0" max="1" hidden aria-label="ความคืบหน้าการจัดการสมาชิก"></progress><p id="controlBulkMessage" class="admin-message" role="status" aria-live="polite"></p><footer><button type="button" id="controlBulkEdit" class="ghost-btn" hidden>แก้ไขตัวเลือก</button><button type="button" id="controlBulkStop" class="danger-btn" hidden>หยุดรายการที่เหลือ</button><button type="submit" id="controlBulkSubmit" class="primary-btn">ตรวจสอบรายการ</button></footer></form>`;
  document.body.append(dialog);
  let mode='add';
  const bulkMessage=text=>setMessage($('#controlBulkMessage'),text);
  function targets(){return mode==='delete'?members.filter(m=>selected.has(m.id)):$('#controlPhotoScope').value==='all'?members:$('#controlPhotoScope').value==='member'?members.filter(m=>m.role==='member'):members.filter(m=>selected.has(m.id));}
  function namePlan(){return S.parseNames($('#controlBulkNames').value,members,$('#controlSkipDuplicates').checked);}
  function previewNames(names){const list=$('#controlBulkPreview');list.replaceChildren();names.forEach(name=>{const li=document.createElement('li');li.textContent=name;list.append(li);});}
  function updateBulkPreview(){
    const plan=namePlan(), people=targets(), names=mode==='add'?plan.names:people.map(m=>m.name || '(ไม่มีชื่อ)');
    $('#controlBulkSummary').textContent=mode==='add'?`จะเพิ่ม ${names.length.toLocaleString('th-TH')} คน · ข้ามชื่อซ้ำ ${plan.skipped.length} · ชื่อยาวเกิน 120 ตัวอักษร ${plan.invalid.length}`:`${mode==='delete'?'จะลบถาวร':'จะเปลี่ยนรูป'} ${names.length.toLocaleString('th-TH')} คน`;
    previewNames(names);$('#controlBulkSubmit').disabled=names.length===0 || (mode==='add' && plan.invalid.length>0);
  }
  function openBulk(nextMode){
    if(busy)return;
    if(job && !confirm('ยังมีรายการที่ทำไม่ครบ ต้องการทิ้งรายการที่เหลือและเริ่มใหม่หรือไม่? รายการที่สำเร็จแล้วจะไม่ย้อนกลับ'))return;
    mode=nextMode;job=null;stop=false;$('#controlBulkForm').reset();
    $('#controlBulkTitle').textContent=mode==='add'?'เพิ่มสมาชิกหลายคน':mode==='photo'?'เปลี่ยนรูปหลายคน':'ลบสมาชิกที่เลือก';
    $('#controlBulkNamesGroup').hidden=mode!=='add';$('#controlPhotoScopeGroup').hidden=mode!=='photo';$('#controlBulkImageGroup').hidden=mode==='delete';
    $('#controlPhotoScope').value=selected.size?'selected':'member';$('#controlBulkFields').disabled=false;$('#controlBulkEdit').hidden=true;$('#controlBulkStop').hidden=true;$('#controlBulkProgress').hidden=true;$('#controlBulkImagePreview').hidden=true;$('#controlBulkSubmit').hidden=false;$('#controlBulkSubmit').textContent='ตรวจสอบรายการ';bulkMessage('');updateBulkPreview();dialog.showModal();
  }
  $('#controlBulkAdd').addEventListener('click',()=>openBulk('add'));$('#controlBulkPhoto').addEventListener('click',()=>openBulk('photo'));$('#controlDeleteSelected').addEventListener('click',()=>openBulk('delete'));
  $('#controlBulkFields').addEventListener('input',updateBulkPreview);
  function closeDialog(){if(busy){stop=true;bulkMessage('จะหยุดหลังบันทึกชุดปัจจุบันเสร็จ');return;}dialog.close();}
  $('#controlBulkClose').addEventListener('click',closeDialog);dialog.addEventListener('cancel',event=>{if(busy){event.preventDefault();closeDialog();}});
  $('#controlBulkEdit').addEventListener('click',()=>{if(busy)return;job=null;$('#controlBulkFields').disabled=false;$('#controlBulkEdit').hidden=true;$('#controlBulkSubmit').textContent='ตรวจสอบรายการ';bulkMessage('');updateBulkPreview();});
  $('#controlBulkStop').addEventListener('click',()=>{stop=true;bulkMessage('จะหยุดหลังบันทึกชุดปัจจุบันเสร็จ');});
  async function photoData(){
    const file=$('#controlBulkFile').files[0];
    if(!file)return {url:S.safeUrl($('#controlBulkImageUrl').value),data:''};
    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw new Error('รองรับรูป JPG, PNG, WEBP และ GIF เท่านั้น');
    if(file.size>12*1024*1024)throw new Error('ไฟล์ใหญ่เกิน 12 MB กรุณาลดขนาดหรือใช้ URL');
    const raw=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('อ่านรูปไม่สำเร็จ'));reader.readAsDataURL(file);});
    if(file.type==='image/gif'){if(raw.length>700000)throw new Error('GIF ใหญ่เกินไป กรุณาใช้ URL');return {data:raw,url:''};}
    const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('ไฟล์รูปไม่ถูกต้อง'));img.src=raw;});
    const canvas=document.createElement('canvas'),scale=Math.min(1,640/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    let data='';for(let quality=.88;quality>=.38;quality-=.1){data=canvas.toDataURL('image/webp',quality);if(data.length<340000)break;}
    if(data.length>700000)throw new Error('รูปยังใหญ่เกินไป กรุณาใช้ URL');return {data,url:''};
  }
  async function prepareJob(){
    const plan=namePlan();
    if(mode==='add' && (!plan.names.length || plan.invalid.length))throw new Error('กรุณาตรวจสอบรายชื่อก่อน');
    if(mode==='add' && plan.names.length>10000)throw new Error('แบ่งเพิ่มครั้งละไม่เกิน 10,000 คน');
    const names=mode==='add'?plan.names:targets().map(m=>m.name || '(ไม่มีชื่อ)');
    const ids=mode==='add'?plan.names.map(()=>db.collection('members').doc().id):targets().map(m=>m.id);
    if(!ids.length)throw new Error('ยังไม่ได้เลือกสมาชิก');
    const photo=mode==='delete'?{url:'',data:''}:await photoData();
    if(mode==='photo' && !photo.url && !photo.data)throw new Error('กรุณาเลือกรูปหรือใส่ URL');
    const imageId=photo.data?`__site_image_${db.collection('members').doc().id}`:'';
    const baseNumber=members.reduce((max,m)=>Math.max(max,Number(m.number)||0),0),baseOrder=members.reduce((max,m)=>Math.max(max,Number(m.order)||0),0);
    job={mode,ids,names,photo,imageId,imageSaved:false,done:0,userId:currentUser.uid,baseNumber,baseOrder,role:$('#controlBulkRole').value,status:$('#controlBulkStatus').value,since:'',visible:$('#controlBulkVisible').checked};
    $('#controlBulkFields').disabled=true;$('#controlBulkEdit').hidden=false;$('#controlBulkSubmit').textContent=mode==='delete'?`ยืนยันลบถาวร ${ids.length} คน`:`ยืนยัน${mode==='add'?'เพิ่ม':'เปลี่ยนรูป'} ${ids.length} คน`;
    previewNames(names);$('#controlBulkSummary').textContent=`ตรวจสอบแล้ว ${ids.length.toLocaleString('th-TH')} คน — ยังไม่ได้บันทึก`;
    $('#controlBulkImagePreview').hidden=!photo.data;if(photo.data)$('#controlBulkImagePreview').src=photo.data;
    bulkMessage(mode==='delete'?'สมาชิกในรายการนี้จะถูกลบถาวร โปรดตรวจรายชื่อทั้งหมดก่อนยืนยัน':'ตรวจรายชื่อและรูปให้ถูกต้อง แล้วกดยืนยันอีกครั้ง');
  }
  async function executeJob(){
    const active=job;stop=false;$('#controlBulkEdit').hidden=true;$('#controlBulkStop').hidden=false;$('#controlBulkProgress').hidden=false;$('#controlBulkProgress').max=active.ids.length;
    if(active.photo.data && !active.imageSaved){
      await db.collection('members').doc(active.imageId).set({type:'siteSharedImage',role:'settings',order:-994,imageData:active.photo.data,createdAt:firebase.firestore.FieldValue.serverTimestamp()});active.imageSaved=true;
    }
    while(active.done<active.ids.length && !stop){
      if(!allowed() || currentUser.uid!==active.userId)throw new Error('บัญชีผู้ดูแลเปลี่ยนไป กรุณาเข้าสู่ระบบใหม่');
      const end=Math.min(active.ids.length,active.done+100),batch=db.batch();
      for(let i=active.done;i<end;i++){
        const ref=db.collection('members').doc(active.ids[i]);
        if(active.mode==='delete'){batch.delete(ref);continue;}
        const data={imageData:'',imageUrl:'',imageMediaUrl:active.photo.url,sharedImageId:active.imageId,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
        if(active.mode==='add')batch.set(ref,{...data,name:active.names[i],number:String(active.baseNumber+i+1).padStart(2,'0'),order:active.baseOrder+i+1,role:active.role,status:active.status,since:'',visible:active.visible,title:'House Member',access:'',about:'',facebook:'',discord:'',showAccess:true,showFacebook:true,showDiscord:true,emblemImageData:'',emblemMediaUrl:'',coverImageData:'',coverMediaUrl:'',createdAt:firebase.firestore.FieldValue.serverTimestamp()});
        else batch.update(ref,data);
      }
      await batch.commit();active.done=end;$('#controlBulkProgress').value=end;bulkMessage(`สำเร็จ ${end.toLocaleString('th-TH')} / ${active.ids.length.toLocaleString('th-TH')} คน`);
    }
    if(active.done===active.ids.length){$('#controlBulkSubmit').hidden=true;$('#controlBulkSummary').textContent=`${active.mode==='delete'?'ลบ':active.mode==='add'?'เพิ่ม':'เปลี่ยนรูป'}สำเร็จ ${active.done.toLocaleString('th-TH')} คน`;job=null;}
    else{$('#controlBulkSubmit').textContent='ทำรายการที่เหลือต่อ';bulkMessage(`หยุดแล้ว สำเร็จ ${active.done} คน เหลือ ${active.ids.length-active.done} คน`);}
  }
  $('#controlBulkForm').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    if(!allowed())return setMessage($('#controlBulkMessage'),'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแล',true);
    busy=true;$('#controlBulkSubmit').disabled=true;
    try{if(!job)await prepareJob();else await executeJob();}
    catch(error){setMessage($('#controlBulkMessage'),`${error.message}${job?` · สำเร็จแล้ว ${job.done} คน กดอีกครั้งเพื่อลองรายการที่เหลือ`:''}`,true);if(job)$('#controlBulkSubmit').textContent='ลองรายการที่เหลืออีกครั้ง';}
    finally{busy=false;$('#controlBulkSubmit').disabled=false;$('#controlBulkStop').hidden=true;}
  });
  window.addEventListener('beforeunload',event=>{if(busy || dirty.size){event.preventDefault();event.returnValue='';}});
  fillForms();
  if(!window.firebase || !window.SWYFT_FIREBASE_CONFIG?.apiKey){$('#controlStatus').textContent='Firebase ยังไม่พร้อม';return;}
  if(!firebase.apps.length)firebase.initializeApp(window.SWYFT_FIREBASE_CONFIG);
  db=firebase.firestore();
  firebase.auth().onAuthStateChanged(user=>{
    unsubscribers.splice(0).forEach(unsubscribe=>unsubscribe());
    currentUser=user && String(user.email).toLowerCase()===String(window.SWYFT_ADMIN_EMAIL).toLowerCase()?user:null;
    if(!currentUser){stop=true;if(dialog.open)dialog.close();selected.clear();dirty.clear();members=[];settings={...S.defaults};fillForms();return;}
    unsubscribers.push(db.collection('members').doc(CONTROL_DOC).onSnapshot(doc=>{
      settings={...S.defaults,...(doc.exists?doc.data():{})};if(/^SWYFT(?:\s*171)?$/i.test(String(settings.loaderLabel||'').trim()))settings.loaderLabel='TATAROS';fillForms();$('#controlPartnerCount').textContent=(settings.partners || []).filter(p=>p.visible!==false).length;
    },error=>{$('#controlStatus').textContent='โหลดการตั้งค่าไม่สำเร็จ';formIds.forEach(id=>setMessage($(`#${id} .admin-message`),error.message,true));}));
    unsubscribers.push(db.collection('tracks').onSnapshot(snapshot=>{$('#controlTrackCount').textContent=snapshot.size;},()=>{$('#controlTrackCount').textContent='—';}));
  });
})();
