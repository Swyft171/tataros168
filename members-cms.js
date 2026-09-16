(() => {
  const $ = q => document.querySelector(q);
  const $$ = q => [...document.querySelectorAll(q)];

  const SETTINGS_DOC = "__site_settings";

  const DEFAULTS = {
    brandName: "TATAROS",
    ownerRankName: "OWNER",
    coreRankName: "Leader",
    supportRankName: "BIGSUPPORT",
    memberRankName: "MEMBERS"
  };

  const ownerList = $("#ownerList");
  const coreList = $("#coreList");
  const supportList = $("#supportList");
  const memberList = $("#memberList");
  const loadingState = $("#loadingState");
  const firebaseNotice = $("#firebaseNotice");
  const memberCount = $("#memberCount");
  const emptyState = $("#emptyState");
  const searchInput = $("#memberSearch");
  const filters = $$(".filter");

  let allMembers = [];
  let siteSettings = {...DEFAULTS};
  let activeFilter = "all";
  let memberPage = 1;
  const pagination = document.createElement('nav');
  pagination.className = 'control-public-pagination';
  pagination.setAttribute('aria-label', 'หน้ารายชื่อสมาชิก');
  memberList.after(pagination);

  function firebaseConfigured() {
    const c = window.SWYFT_FIREBASE_CONFIG || {};
    return !!(c.apiKey && c.projectId);
  }

  if (!firebaseConfigured() || !window.firebase) {
    loadingState.hidden = true;
    firebaseNotice.hidden = false;
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.SWYFT_FIREBASE_CONFIG);
  }
  const db = firebase.firestore();

  function text(value, fallback = "") {
    return value == null ? fallback : String(value);
  }

  function safeUrl(value) {
    const v = text(value).trim();
    if (!v || v === "#") return "#";
    try {
      const u = new URL(v);
      return ["http:", "https:"].includes(u.protocol) ? u.href : "#";
    } catch {
      return "#";
    }
  }

  function mediaValue(value) {
    let v = text(value).trim().replace(/&&+/g, "&");
    if (!v) return "";

    try {
      const u = new URL(v, window.location.href);

      if (/^(www\.)?dropbox\.com$/i.test(u.hostname)) {
        u.searchParams.delete("dl");
        u.searchParams.delete("st");
        u.searchParams.set("raw", "1");
        return u.toString();
      }

      return u.toString();
    } catch {
      return v;
    }
  }

  function isVideoSource(value) {
    const v = mediaValue(value).toLowerCase();
    return /^data:video\//.test(v) || /\.(mp4|webm|ogg|mov)([?#].*)?$/.test(v);
  }

  function statusKey(value) {
    const s = text(value, "ONLINE").trim().toLowerCase();
    if (["online", "offline", "away", "busy", "dnd", "streaming"].includes(s)) return s;
    return "online";
  }

  function mediaElement(src, alt, fallbackText, fallbackClass = "") {
    const value = mediaValue(src);
    if (!value) return createEl("span", fallbackClass, fallbackText);

    if (isVideoSource(value)) {
      const video = document.createElement("video");
      video.src = value;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("aria-label", alt);
      video.addEventListener("error", () => {
        video.replaceWith(createEl("span", fallbackClass, fallbackText));
      });
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
      return video;
    }

    const img = document.createElement("img");
    img.src = value;
    img.alt = alt;
    img.loading = "lazy";
    img.draggable = false;
    img.onerror = () => {
      img.replaceWith(createEl("span", fallbackClass, fallbackText));
    };
    return img;
  }

  function createEl(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content != null) el.textContent = content;
    return el;
  }

  function rankLabel(role) {
    if (role === "owner") return siteSettings.ownerRankName || DEFAULTS.ownerRankName;
    if (role === "core") return siteSettings.coreRankName || DEFAULTS.coreRankName;
    if (role === "bigsupport") return siteSettings.supportRankName || DEFAULTS.supportRankName;
    return siteSettings.memberRankName || DEFAULTS.memberRankName;
  }

  function updateRankLabels() {
    const labels = {
      owner: rankLabel("owner"),
      core: rankLabel("core"),
      bigsupport: rankLabel("bigsupport"),
      member: rankLabel("member")
    };

    Object.entries(labels).forEach(([role, label]) => {
      document.querySelectorAll(`[data-rank-title="${role}"]`).forEach(el => el.textContent = label);
      document.querySelectorAll(`[data-rank-filter="${role}"]`).forEach(el => el.textContent = label);
    });
  }

  function photoElement(member, className) {
    const wrap = createEl("div", className);
    const imageSrc = window.SwyftShared?.imageFor(member) || member.imageMediaUrl || member.imageData || member.imageUrl || "";
    wrap.appendChild(mediaElement(imageSrc, member.name || "Member", member.number || "00"));
    return wrap;
  }

  function ownerEmblemElement(member) {
    const wrap = createEl("div", "featured-emblem");
    const imageSrc =
      member.emblemMediaUrl ||
      member.emblemImageData ||
      member.imageMediaUrl ||
      member.imageData ||
      member.imageUrl ||
      window.SwyftShared?.imageFor(member) ||
      "";

    wrap.appendChild(mediaElement(imageSrc, `${member.name || "OWNER"} left image`, "✦", "emblem-mark"));
    return wrap;
  }

  function commonDataset(card, m) {
    card.classList.add("profile-card");
    card.tabIndex = 0;
    card.dataset.id = m.id;
    card.dataset.role = text(m.role, "member");
    card.dataset.name = text(m.name, "MEMBER");
    card.dataset.no = text(m.number, "00");
    card.dataset.title = text(m.title, "House Member");
    card.dataset.status = text(m.status, "ONLINE");
    card.dataset.since = "";
    card.dataset.access = text(m.access, "");
    card.dataset.about = text(m.about, "");
    card.dataset.facebook = safeUrl(m.facebook);
    card.dataset.discord = safeUrl(m.discord);
  }

  function socialLink(label, url, symbol) {
    const cleaned = safeUrl(url);
    if (!cleaned || cleaned === "#") return null;

    const a = createEl("a", "", symbol);
    a.href = cleaned;
    a.target = "_blank";
    a.rel = "noopener";
    a.title = label;
    a.addEventListener("click", e => e.stopPropagation());
    return a;
  }

  function snippet(value, max = 92) {
    const content = text(value).trim();
    if (!content) return "";
    return content.length > max ? content.slice(0, max).trim() + "…" : content;
  }

  function ownerCard(m) {
    const card = createEl("article", "featured-card");
    commonDataset(card, m);

    const portrait = photoElement(m, "featured-portrait");
    const content = createEl("div", "featured-content");
    content.appendChild(createEl("span", "card-role-pill", rankLabel("owner")));
    content.appendChild(createEl("h2", "", m.name));
    content.appendChild(createEl("p", "", m.title || rankLabel("owner")));

    const meta = createEl("div", "card-meta-row");
    meta.appendChild(createEl("span", "", text(m.status, "ONLINE").toUpperCase()));
    content.appendChild(meta);

    content.appendChild(createEl("div", "card-open", "OPEN PROFILE"));

    card.append(portrait, content);
    bindPopup(card, m);
    return card;
  }

  function coreCard(m) {
    const card = createEl("article", "core-card");
    commonDataset(card, m);

    const portrait = photoElement(m, "core-portrait");
    const content = createEl("div", "core-content");
    content.appendChild(createEl("span", "card-role-pill", rankLabel("core")));
    content.appendChild(createEl("h3", "", m.name));
    const coreDesc = snippet(m.title || rankLabel("core"), 80);
    if (coreDesc) content.appendChild(createEl("p", "", coreDesc));

    const meta = createEl("div", "card-meta-row");
    meta.appendChild(createEl("span", "", text(m.status, "ONLINE").toUpperCase()));
    content.appendChild(meta);

    content.appendChild(createEl("div", "card-open", "OPEN PROFILE"));

    card.append(portrait, content);
    bindPopup(card, m);
    return card;
  }

  function supportCard(m) {
    const card = createEl("article", "support-card core-card");
    commonDataset(card, m);

    const portrait = photoElement(m, "core-portrait");
    const content = createEl("div", "core-content");
    content.appendChild(createEl("span", "card-role-pill", rankLabel("bigsupport")));
    content.appendChild(createEl("h3", "", m.name));
    const desc = snippet(m.title || rankLabel("bigsupport"), 80);
    if (desc) content.appendChild(createEl("p", "", desc));

    const meta = createEl("div", "card-meta-row");
    meta.appendChild(createEl("span", "", text(m.status, "ONLINE").toUpperCase()));
    content.appendChild(meta);

    content.appendChild(createEl("div", "card-open", "OPEN PROFILE"));
    card.append(portrait, content);
    bindPopup(card, m);
    return card;
  }

  function memberCard(m) {
    const card = createEl("article", "small-card");
    commonDataset(card, m);

    const avatar = photoElement(m, "small-avatar");
    const body = createEl("div", "small-card-body");
    body.appendChild(createEl("span", "card-role-pill", rankLabel("member")));
    body.appendChild(createEl("h4", "", m.name));
    body.appendChild(createEl("p", "", snippet(m.title || m.about || rankLabel("member"), 74)));
    body.appendChild(createEl("div", "card-open", "OPEN PROFILE"));

    card.append(avatar, body);

    bindPopup(card, m);
    return card;
  }

  function render() {
    const term = (searchInput.value || "").trim().toLowerCase();

    const visible = allMembers.filter(m => {
      if (m.visible === false) return false;

      const role = text(m.role, "member").toLowerCase();
      const haystack = [
        m.name,
        m.title,
        m.number,
        m.about,
        role,
        rankLabel(role)
      ].map(v => text(v).toLowerCase()).join(" ");

      const roleMatch = activeFilter === "all" || role === activeFilter;
      const searchMatch = !term || haystack.includes(term);
      return roleMatch && searchMatch;
    });

    ownerList.innerHTML = "";
    coreList.innerHTML = "";
    supportList.innerHTML = "";
    memberList.innerHTML = "";

    const owners = visible.filter(m => m.role === "owner");
    const cores = visible.filter(m => m.role === "core");
    const supports = visible.filter(m => m.role === "bigsupport");
    const members = visible.filter(m => m.role === "member");

    const ownerCountEl = $("#ownerCount");
    const coreCountEl = $("#coreCount");
    const supportCountEl = $("#supportCount");
    const memberOnlyCountEl = $("#memberOnlyCount");
    if (ownerCountEl) ownerCountEl.textContent = String(owners.length).padStart(2, "0");
    if (coreCountEl) coreCountEl.textContent = String(cores.length).padStart(2, "0");
    if (supportCountEl) supportCountEl.textContent = String(supports.length).padStart(2, "0");
    if (memberOnlyCountEl) memberOnlyCountEl.textContent = String(members.length).padStart(2, "0");

    owners.forEach(m => ownerList.appendChild(ownerCard(m)));
    cores.forEach(m => coreList.appendChild(coreCard(m)));
    supports.forEach(m => supportList.appendChild(supportCard(m)));
    const slice = window.SwyftShared.paginate(members, memberPage);
    memberPage = slice.page;
    slice.items.forEach(m => memberList.appendChild(memberCard(m)));
    pagination.replaceChildren();
    pagination.hidden = slice.pages <= 1;
    if (slice.pages > 1) {
      const previous = createEl('button', '', '← ก่อนหน้า');
      const next = createEl('button', '', 'ถัดไป →');
      previous.type = next.type = 'button';
      previous.disabled = memberPage === 1;
      next.disabled = memberPage === slice.pages;
      const changePage = delta => {memberPage += delta;render();memberList.scrollIntoView({behavior:'smooth',block:'start'});pagination.querySelector(delta > 0 ? 'button:last-child' : 'button:first-child')?.focus({preventScroll:true});};
      previous.addEventListener('click', () => changePage(-1));
      next.addEventListener('click', () => changePage(1));
      pagination.append(previous, createEl('span', '', `${memberPage} / ${slice.pages} · ${members.length} คน`), next);
    }

    $("#ownerBlock").classList.toggle("hide-section", owners.length === 0);
    $("#coreBlock").classList.toggle("hide-section", cores.length === 0);
    $("#supportBlock").classList.toggle("hide-section", supports.length === 0);
    $("#memberBlock").classList.toggle("hide-section", members.length === 0);

    memberCount.textContent = String(visible.length).padStart(2, "0");
    emptyState.classList.toggle("show", visible.length === 0);

    updateRankLabels();
  }

  searchInput.addEventListener("input", () => {memberPage = 1;render();});

  filters.forEach(btn => {
    btn.addEventListener("click", () => {
      filters.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      memberPage = 1;
      render();
    });
  });

  // ---------- POPUP ----------
  const overlay = $("#profileOverlay");
  const modal = $("#profileModal");
  const closeBtn = $("#profileClose");

  function accessFor(role, custom) {
    if (custom) return custom;
    if (role === "owner") return "FULL ACCESS";
    if (role === "core") return "TRUSTED ACCESS";
    if (role === "bigsupport") return "SUPPORT ACCESS";
    return "STANDARD ACCESS";
  }

  function bindPopup(card, m) {
    const open = () => openProfile(m);
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  }

  function openProfile(m) {
    const role = text(m.role, "member").toLowerCase();
    const no = text(m.number, "00");
    const status = text(m.status, "ONLINE").toUpperCase();
    const statusMode = statusKey(status);

    const roleEl = $("#modalRole");
    const statusEl = $("#modalStatus");
    const nameEl = $("#modalName");
    const titleEl = $("#modalTitle");

    if (roleEl) roleEl.textContent = rankLabel(role);
    modal.dataset.role = role;
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.dataset.status = statusMode;
    }
    if (nameEl) nameEl.textContent = text(m.name, "MEMBER");
    if (titleEl) titleEl.textContent = text(m.title, rankLabel(role));

    const facebookUrl = safeUrl(m.facebook);
    const discordUrl = safeUrl(m.discord);
    const facebookBtn = $("#modalFacebook");
    const discordBtn = $("#modalDiscord");

    const showFacebook = !!facebookBtn && m.showFacebook !== false && facebookUrl !== "#";
    const showDiscord = !!discordBtn && m.showDiscord !== false && discordUrl !== "#";

    if (facebookBtn) {
      facebookBtn.href = showFacebook ? facebookUrl : "#";
      facebookBtn.classList.toggle("hidden-by-setting", !showFacebook);
    }
    if (discordBtn) {
      discordBtn.href = showDiscord ? discordUrl : "#";
      discordBtn.classList.toggle("hidden-by-setting", !showDiscord);
    }

    const photo = $("#modalPhoto");
    const photoVideo = $("#modalPhotoVideo");
    const fallback = $("#modalAvatarFallback");
    const imageSrc = window.SwyftShared?.imageFor(m) || m.imageMediaUrl || m.imageData || m.imageUrl || "";

    photo.hidden = true;
    photo.style.display = "none";
    photo.removeAttribute("src");
    photoVideo.hidden = true;
    photoVideo.style.display = "none";
    photoVideo.pause();
    photoVideo.removeAttribute("src");
    fallback.hidden = false;
    fallback.style.display = "grid";
    fallback.textContent = no;

    if (imageSrc) {
      fallback.hidden = true;
      fallback.style.display = "none";
      if (isVideoSource(imageSrc)) {
        photoVideo.src = imageSrc;
        photoVideo.hidden = false;
        photoVideo.style.display = "block";
        const playPromise = photoVideo.play();
        if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
      } else {
        photo.src = imageSrc;
        photo.hidden = false;
        photo.style.display = "block";
        photo.draggable = false;
      }
    }

    const cover = m.coverMediaUrl || m.coverImageData || "";
    const coverImage = $("#modalCoverImage");
    const coverVideo = $("#modalCoverVideo");
    coverImage.hidden = true;
    coverImage.style.display = "none";
    coverImage.removeAttribute("src");
    coverVideo.hidden = true;
    coverVideo.style.display = "none";
    coverVideo.pause();
    coverVideo.removeAttribute("src");

    if (cover) {
      if (isVideoSource(cover)) {
        coverVideo.src = cover;
        coverVideo.hidden = false;
        coverVideo.style.display = "block";
        const playPromise = coverVideo.play();
        if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
      } else {
        coverImage.src = cover;
        coverImage.hidden = false;
        coverImage.style.display = "block";
      }
    } else if (imageSrc && !isVideoSource(imageSrc)) {
      coverImage.src = imageSrc;
      coverImage.hidden = false;
      coverImage.style.display = "block";
    }

    overlay.classList.add("show");
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeProfile() {
    overlay.classList.remove("show");
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    const coverVideo = $("#modalCoverVideo");
    const photoVideo = $("#modalPhotoVideo");
    const coverImage = $("#modalCoverImage");
    document.body.style.overflow = "";
    if (coverVideo) {
      coverVideo.pause();
      coverVideo.hidden = true;
      coverVideo.style.display = "none";
      coverVideo.removeAttribute("src");
    }
    if (coverImage) {
      coverImage.hidden = true;
      coverImage.style.display = "none";
      coverImage.removeAttribute("src");
    }
    if (photoVideo) {
      photoVideo.pause();
      photoVideo.hidden = true;
      photoVideo.style.display = "none";
      photoVideo.removeAttribute("src");
    }
  }

  closeBtn.addEventListener("click", closeProfile);
  overlay.addEventListener("click", closeProfile);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeProfile();
  });

  window.addEventListener("swyft:settings", e => {
    siteSettings = {...siteSettings, ...(e.detail || {})};
    render();
  });

  // ---------- LIVE DATA ----------
  db.collection("members")
    .orderBy("order", "asc")
    .onSnapshot(snapshot => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      window.SwyftShared?.setImages(docs);

      siteSettings = {
        ...siteSettings,
        ...(docs.find(x => x.id === SETTINGS_DOC) || {})
      };

      allMembers = docs.filter(m =>
        !m.id.startsWith("__site_") &&
        !String(m.type || "").startsWith("site")
      );

      loadingState.hidden = true;
      loadingState.style.display = "none";
      firebaseNotice.hidden = true;
      firebaseNotice.style.display = "none";

      render();
    }, error => {
      console.error(error);
      loadingState.hidden = true;
      loadingState.style.display = "none";
      firebaseNotice.hidden = false;
      firebaseNotice.style.display = "";
      firebaseNotice.querySelector("b").textContent = "โหลดข้อมูล Firebase ไม่สำเร็จ";
      firebaseNotice.querySelector("span").textContent = error.message;
    });
})();
