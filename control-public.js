(() => {
  'use strict';
  const S = window.SwyftShared, root = document.documentElement;
  const homePage = document.body.classList.contains('home-page');
  const partnerMount = document.querySelector('#homePartnerMount');

  const partners = document.createElement('aside');
  partners.className = 'control-partners';
  partners.hidden = true;
  partners.setAttribute('aria-label', 'พาร์ทเนอร์');
  partners.innerHTML = `
    <button type="button" class="control-partner-toggle" aria-label="เปิดรายชื่อพาร์ทเนอร์" aria-expanded="false" aria-controls="controlPartnerPanel">
      <span class="control-partner-toggle-copy">
        <small>HOUSE LINKS</small>
        <strong>PARTNERS</strong>
      </span>
      <span class="control-partner-toggle-count">00</span>
    </button>
    <section class="control-partner-panel" id="controlPartnerPanel" aria-labelledby="controlPartnerTitle" hidden>
      <header>
        <div>
          <span><b class="control-partner-count">0</b> CONNECTIONS</span>
          <h2 id="controlPartnerTitle">PARTNERS</h2>
        </div>
        <button type="button" class="control-partner-close" aria-label="ปิดรายชื่อพาร์ทเนอร์">×</button>
      </header>
      <div class="control-partner-links"></div>
    </section>`;

  const partnerToggle = partners.querySelector('.control-partner-toggle');
  const partnerPanel = partners.querySelector('.control-partner-panel');
  const partnerLinks = partners.querySelector('.control-partner-links');
  const partnerToggleCount = partners.querySelector('.control-partner-toggle-count');
  let partnerSignature = '';

  function setPartnersOpen(open, returnFocus = false) {
    if (open && partners.hidden) return;
    partnerPanel.hidden = !open;
    partnerToggle.setAttribute('aria-expanded', String(open));
    partners.classList.toggle('is-open', open);
    partnerToggle.setAttribute('aria-label', `${open ? 'ปิด' : 'เปิด'}รายชื่อพาร์ทเนอร์`);
    if (returnFocus) partnerToggle.focus({preventScroll: true});
  }

  partnerToggle.addEventListener('click', () => setPartnersOpen(partnerPanel.hidden));
  partners.querySelector('.control-partner-close').addEventListener('click', () => setPartnersOpen(false, true));
  document.addEventListener('pointerdown', event => {
    if (!partnerPanel.hidden && !partners.contains(event.target)) setPartnersOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !partnerPanel.hidden) {
      event.preventDefault();
      setPartnersOpen(false, true);
    }
  });

  if (homePage) {
    if (partnerMount) partnerMount.append(partners);
    else document.body.append(partners);
  }

  function apply(raw) {
    const settings = {...S.defaults, ...raw};
    if (/^SWYFT(?:\s*171)?$/i.test(String(settings.loaderLabel || '').trim())) settings.loaderLabel = 'TATAROS';
    window.SWYFT_CONTROL = settings;

    const put = (selector, text) => {
      document.querySelectorAll(selector).forEach(el => {
        if (text !== undefined && text !== null) el.textContent = text;
      });
    };

    put('.nav a[href="index.html"]', settings.homeLabel || 'HOME');
    put('.nav a[href="members.html"]', settings.memberLabel || 'MEMBERS');
    put('.minimal-kicker', document.body.classList.contains('members-page') ? 'TATAROS DIRECTORY' : (settings.heroEyebrow || 'PRIVATE COMMUNITY'));
    const lead = document.querySelector('.minimal-home-lead');
    if (lead && settings.heroSubtitle) lead.textContent = settings.heroSubtitle;
    const cta = document.querySelector('.primary-button');
    if (cta) {
      cta.childNodes[0].textContent = (settings.ctaText || 'OPEN MEMBERS') + ' ';
      try { cta.href = S.safeUrl(settings.ctaUrl, true) || 'members.html'; } catch { cta.href = 'members.html'; }
    }

    root.dataset.controlGrain = settings.showGrain === false ? 'off' : 'on';
    root.dataset.controlMusic = settings.showMusic === false ? 'off' : 'on';
    root.dataset.controlColors = settings.customColors ? 'on' : 'off';
    for (const [key, variable] of Object.entries({colorBackground:'--control-bg', colorText:'--control-text', colorMuted:'--control-muted', colorAccent:'--control-accent'})) {
      if (/^#[0-9a-f]{6}$/i.test(settings[key])) root.style.setProperty(variable, settings[key]);
    }
    root.style.setProperty('--control-blur', `${S.clamp(settings.backgroundBlur, 0, 20, 0)}px`);
    root.style.setProperty('--control-zoom', String(S.clamp(settings.backgroundZoom, 100, 125, 100) / 100));

    const entries = [];
    if (settings.showPartners && Array.isArray(settings.partners)) settings.partners.filter(p => p.visible !== false).forEach(partner => {
      let url; try { url = S.safeUrl(partner.url); } catch { return; }
      if (!url || !partner.name) return;
      entries.push({url, name: String(partner.name)});
    });

    const signature = JSON.stringify(entries);
    if (signature !== partnerSignature) {
      partnerSignature = signature;
      partnerLinks.replaceChildren();
      entries.forEach((partner, index) => {
        const link = document.createElement('a');
        link.href = partner.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const number = document.createElement('span');
        number.className = 'partner-link-number';
        number.textContent = String(index + 1).padStart(2, '0');
        const name = document.createElement('span');
        name.className = 'partner-link-name';
        name.textContent = partner.name;
        const arrow = document.createElement('span');
        arrow.className = 'partner-link-arrow';
        arrow.textContent = '↗';
        arrow.setAttribute('aria-hidden', 'true');
        link.append(number, name, arrow);
        partnerLinks.append(link);
      });
    }

    const countText = String(entries.length).padStart(2, '0');
    partners.querySelector('.control-partner-count').textContent = countText;
    partnerToggleCount.textContent = countText;

    if (!entries.length || !homePage) {
      setPartnersOpen(false);
      partners.hidden = true;
    } else {
      partners.hidden = false;
    }

    window.dispatchEvent(new CustomEvent('swyft:control', {detail: settings}));
  }

  apply({});
  if (!window.firebase || !window.SWYFT_FIREBASE_CONFIG?.apiKey) {
    window.dispatchEvent(new Event('swyft:control-ready'));
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(window.SWYFT_FIREBASE_CONFIG);
  firebase.firestore().collection('members').doc('__site_control').onSnapshot(doc => {
    const data = {...S.defaults, ...(doc.exists ? doc.data() : {})};
    try {
      localStorage.setItem('swyftEntryPreferences', JSON.stringify({
        loaderEnabled: data.loaderEnabled,
        loaderMode: data.loaderMode,
        loaderLabel: data.loaderLabel,
        loaderCaption: data.loaderCaption,
        loaderAccent: data.loaderAccent
      }));
    } catch {}
    apply(data);
    window.dispatchEvent(new Event('swyft:control-ready'));
  }, () => window.dispatchEvent(new Event('swyft:control-ready')));
})();
