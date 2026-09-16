(() => {
  'use strict';
  const dashboard = document.querySelector('#dashboard');
  const oldHeader = dashboard.querySelector('.admin-top');
  const identity = dashboard.querySelector('.site-settings-card');
  const appearance = identity.nextElementSibling;
  const music = document.querySelector('#musicManagerCard');
  const people = dashboard.querySelector('.dashboard-grid');
  const sections = [
    ['overview', 'ภาพรวม', 'Overview'], ['identity', 'แบรนด์และยศ', 'Identity'],
    ['home', 'หน้าแรก', 'Home'], ['appearance', 'ภาพและเอฟเฟกต์', 'Appearance'],
    ['people', 'สมาชิก', 'People'], ['partners', 'พาร์ทเนอร์', 'Partners'],
    ['music', 'เพลง', 'Music'], ['loader', 'หน้าโหลด', 'Entry sequence']
  ];
  const shell = document.createElement('div');
  shell.className = 'control-layout';
  shell.innerHTML = `
    <aside class="control-sidebar" aria-label="เมนูหลังบ้าน">
      <a class="control-wordmark" href="index.html"><span>T</span><b>TATAROS<small>CONTROL ROOM</small></b></a>
      <div class="control-section-label">WORKSPACE / 01</div>
      <nav class="control-nav">${sections.map(([id, label], index) => `<button type="button" data-control-tab="${id}"><span>${String(index + 1).padStart(2, '0')}</span>${label}<i>↗</i></button>`).join('')}</nav>
      <div class="control-sidebar-foot"><span class="control-status" id="controlStatus">กำลังเชื่อมต่อ</span><p id="controlEmail">AUTHORIZED ACCESS</p></div>
    </aside>
    <div class="control-main"><header class="control-topbar"><div><span>TATAROS / MANAGEMENT</span><h1 id="controlHeading" tabindex="-1">Overview</h1></div><div class="control-header-actions"></div></header>
      <div class="control-content">${sections.map(([id]) => `<section class="control-pane" id="control-${id}" aria-labelledby="controlHeading" hidden></section>`).join('')}</div>
    </div>`;
  dashboard.append(shell);
  shell.querySelector('.control-header-actions').append(...oldHeader.querySelector('.admin-top-actions').children);
  oldHeader.remove();
  document.querySelector('#control-identity').append(identity);
  document.querySelector('#control-appearance').append(appearance);
  document.querySelector('#control-music').append(music);
  document.querySelector('#control-people').append(people);
  document.querySelector('#control-overview').innerHTML = `
    <div class="control-intro"><span>THE HOUSE, AT A GLANCE</span><h2><br><span>.</span></h2><p></p></div>
    <div class="control-stats">
      <button data-control-tab="people" class="control-stat"><span>สมาชิกทั้งหมด ↗</span><strong id="controlMemberCount">—</strong><small id="controlVisibleCount">รอข้อมูลสมาชิก</small></button>
      <button data-control-tab="music" class="control-stat"><span>เพลงในคลัง ↗</span><strong id="controlTrackCount">—</strong><small>PLAYLIST</small></button>
      <button data-control-tab="partners" class="control-stat"><span>พาร์ทเนอร์ ↗</span><strong id="controlPartnerCount">—</strong><small>HOUSE CONNECTIONS</small></button>
    </div>
    <div class="control-shortcuts"><div><span>QUICK ACCESS</span><h3></h3></div><button data-control-tab="people">จัดการสมาชิก <span>↗</span></button><button data-control-tab="home">แก้หน้าแรก <span>↗</span></button><button data-control-tab="loader">ปรับหน้าโหลด <span>↗</span></button></div>`;
  let current = 'overview';
  function navigate(id, focus = true) {
    if (!sections.some(section => section[0] === id)) id = 'overview';
    current = id;
    document.querySelectorAll('.control-pane').forEach(pane => { pane.hidden = pane.id !== `control-${id}`; });
    document.querySelectorAll('.control-nav button').forEach(button => {
      button.classList.toggle('active', button.dataset.controlTab === id);
      if (button.dataset.controlTab === id) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    const heading = document.querySelector('#controlHeading');
    heading.textContent = sections.find(section => section[0] === id)[2];
    try { history.replaceState(null, '', `#${id}`); } catch {}
    if (focus) { heading.focus({preventScroll: true}); window.scrollTo({top: 0, behavior: 'instant'}); }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-control-tab]');
    if (button) navigate(button.dataset.controlTab);
  });
  window.addEventListener('swyft:edit-member', () => {
    navigate('people', false);
    document.querySelector('#memberName').focus();
    document.querySelector('.editor-card').scrollIntoView({behavior: 'smooth', block: 'start'});
  });
  window.addEventListener('swyft:admin-data', event => {
    const {members, settings} = event.detail;
    document.querySelector('#controlMemberCount').textContent = members.length.toLocaleString('th-TH');
    document.querySelector('#controlVisibleCount').textContent = `แสดงบนเว็บ ${members.filter(m => m.visible !== false).length.toLocaleString('th-TH')} คน`;
    const rankLabels = {
      owner: settings.ownerRankName || 'OWNER',
      core: settings.coreRankName || 'LEADER',
      bigsupport: settings.supportRankName || 'BIGSUPPORT',
      member: settings.memberRankName || 'MEMBERS'
    };
    for (const [role, label] of Object.entries(rankLabels)) {
      document.querySelectorAll(`select option[value="${role}"]`).forEach(option => { option.textContent = label; });
    }
    document.querySelector('#controlStatus').textContent = event.detail.fromCache ? 'ข้อมูลจากเครื่อง / รอเชื่อมต่อ' : 'เชื่อมต่อข้อมูลแล้ว';
  });
  window.addEventListener('swyft:admin-auth', event => {
    document.querySelector('#controlEmail').textContent = event.detail?.email || 'AUTHORIZED ACCESS';
    if (!event.detail) {
      ['Member','Track','Partner'].forEach(name => { document.querySelector(`#control${name}Count`).textContent = '—'; });
      document.querySelector('#controlStatus').textContent = 'ออกจากระบบแล้ว';
    }
  });
  window.addEventListener('swyft:admin-error', () => { document.querySelector('#controlStatus').textContent = 'เชื่อมต่อไม่สำเร็จ'; });
  window.SwyftControl = {navigate, get current() { return current; }};
  navigate(location.hash.slice(1), false);
})();
