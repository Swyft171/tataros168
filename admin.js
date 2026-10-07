(() => {
  const $ = q => document.querySelector(q);

  const SETTINGS_DOC = "__site_settings";
  const BACKGROUND_DOC = "__site_background";
  const LOGO_DOC = "__site_logo";
  const BG_CACHE_KEY = "tatarosBackgroundCache";

  const DEFAULTS = {
    brandName: "TATAROS",
    ownerRankName: "OWNER",
    coreRankName: "Leader",
    supportRankName: "BIGSUPPORT",
    memberRankName: "MEMBERS",
    ownerRankColor: "#d4af37",
    coreRankColor: "#c7ad59",
    supportRankColor: "#7fd6ff",
    memberRankColor: "#aaa69d",
    hero171Color: "#e8d8a5",
    hero171ShineColor: "#fff1b8",
    hero171ShineSpeed: 6
  };

  function migrateIdentitySettings(raw = {}) {
    const next = {...DEFAULTS, ...(raw || {})};
    if (/^SWYFT(?:\s*171)?$/i.test(String(next.brandName || "").trim())) next.brandName = "TATAROS";
    if (String(next.ownerRankColor).toLowerCase() === "#88d8ff") next.ownerRankColor = DEFAULTS.ownerRankColor;
    if (String(next.coreRankColor).toLowerCase() === "#fa1e1e") next.coreRankColor = DEFAULTS.coreRankColor;
    if (!next.supportRankName) next.supportRankName = DEFAULTS.supportRankName;
    if (!/^#[0-9a-f]{6}$/i.test(String(next.supportRankColor || ""))) next.supportRankColor = DEFAULTS.supportRankColor;
    if (String(next.memberRankColor).toLowerCase() === "#ffffff") next.memberRankColor = DEFAULTS.memberRankColor;
    if (String(next.hero171Color).toLowerCase() === "#f4f8ff") next.hero171Color = DEFAULTS.hero171Color;
    if (String(next.hero171ShineColor).toLowerCase() === "#8fdcff") next.hero171ShineColor = DEFAULTS.hero171ShineColor;
    return next;
  }

  function isPermissionError(err) {
    return /missing or insufficient permissions|permission-denied/i.test(String(err && err.message || err || ""));
  }

  function saveBackgroundCacheLocal(payload = {}) {
    try {
      localStorage.setItem(BG_CACHE_KEY, JSON.stringify({
        backgroundImageData: payload.backgroundImageData || "",
        backgroundMediaUrl: payload.backgroundMediaUrl || "",
        backgroundBrightness: normalizeBrightness(payload.backgroundBrightness),
        weatherEffect: normalizeWeatherEffect(payload.weatherEffect)
      }));
    } catch {}
  }

  function clearBackgroundCacheLocal() {
    try { localStorage.removeItem(BG_CACHE_KEY); } catch {}
  }

  const loginPanel = $("#loginPanel");
  const dashboard = $("#dashboard");
  const loginForm = $("#loginForm");
  const loginMessage = $("#loginMessage");
  const logoutBtn = $("#logoutBtn");

  const siteNameInput = $("#siteName");
  const ownerRankNameInput = $("#ownerRankName");
  const coreRankNameInput = $("#coreRankName");
  const supportRankNameInput = $("#supportRankName");
  const memberRankNameInput = $("#memberRankName");
  const ownerRankColorInput = $("#ownerRankColor");
  const coreRankColorInput = $("#coreRankColor");
  const supportRankColorInput = $("#supportRankColor");
  const memberRankColorInput = $("#memberRankColor");
  const ownerColorText = $("#ownerColorText");
  const coreColorText = $("#coreColorText");
  const supportColorText = $("#supportColorText");
  const memberColorText = $("#memberColorText");
  const hero171ColorInput = $("#hero171Color");
  const hero171ShineColorInput = $("#hero171ShineColor");
  const hero171ColorText = $("#hero171ColorText");
  const hero171ShineColorText = $("#hero171ShineColorText");
  const hero171Preview = $("#hero171Preview");
  const hero171SpeedInput = $("#hero171Speed");
  const hero171SpeedValue = $("#hero171SpeedValue");
  const saveIdentityBtn = $("#saveIdentityBtn");
  const identityMessage = $("#identityMessage");

  const logoInput = $("#siteLogo");
  const logoPreview = $("#logoPreview");
  const logoFallback = $("#logoFallback");
  const removeLogoBtn = $("#removeLogoBtn");

  const faviconInput = $("#siteFaviconInput");
  const faviconPreview = $("#faviconPreview");
  const faviconFallback = $("#faviconFallback");
  const removeFaviconBtn = $("#removeFaviconBtn");
  const faviconLink = $("#siteFavicon");

  const backgroundInput = $("#backgroundImage");
  const backgroundPreview = $("#backgroundPreview");
  const backgroundFallback = $("#backgroundFallback");
  const backgroundMediaUrlInput = $("#backgroundMediaUrl");
  const backgroundBrightnessInput = $("#backgroundBrightness");
  const backgroundBrightnessValue = $("#backgroundBrightnessValue");
  const weatherEffectInput = $("#weatherEffect");
  const saveBackgroundBtn = $("#saveBackgroundBtn");
  const removeBackgroundBtn = $("#removeBackgroundBtn");
  const siteMessage = $("#siteMessage");
  const backgroundProgress = $("#backgroundProgress");
  const backgroundProgressFill = $("#backgroundProgressFill");
  const backgroundProgressText = $("#backgroundProgressText");

  const form = $("#memberForm");
  const formTitle = $("#formTitle");
  const formMessage = $("#formMessage");
  const saveBtn = $("#saveBtn");
  const cancelEditBtn = $("#cancelEditBtn");
  const resetBtn = $("#resetBtn");

  const docId = $("#memberDocId");
  const nameInput = $("#memberName");
  const numberInput = $("#memberNumber");
  const roleInput = $("#memberRole");
  const visibleInput = $("#memberVisible");
  const statusInput = $("#memberStatus");
  const titleInput = $("#memberTitle");
  const sinceInput = $("#memberSince");
  const orderInput = $("#memberOrder");
  const accessInput = $("#memberAccess");
  const facebookInput = $("#memberFacebook");
  const discordInput = $("#memberDiscord");
  const showAccessInput = $("#memberShowAccess");
  const showFacebookInput = $("#memberShowFacebook");
  const showDiscordInput = $("#memberShowDiscord");
  const aboutInput = $("#memberAbout");

  const imageInput = $("#memberImage");
  const imagePreview = $("#imagePreview");
  const imageFallback = $("#imageFallback");
  const imageUrlInput = $("#memberImageUrl");

  const emblemUploadArea = $("#emblemUploadArea");
  const emblemInput = $("#memberEmblem");
  const emblemPreview = $("#emblemPreview");
  const emblemFallback = $("#emblemFallback");
  const emblemUrlInput = $("#memberEmblemUrl");
  const clearEmblemBtn = $("#clearEmblemBtn");

  const coverInput = $("#memberCover");
  const coverPreview = $("#coverPreview");
  const coverFallback = $("#coverFallback");
  const coverUrlInput = $("#memberCoverUrl");
  const clearCoverBtn = $("#clearCoverBtn");

  const uploadProgress = $("#uploadProgress");
  const progressFill = $("#progressFill");
  const progressText = $("#progressText");

  const adminMemberList = $("#adminMemberList");
  const adminCount = $("#adminCount");
  const adminEmpty = $("#adminEmpty");
  const adminSearch = $("#adminSearch");

  let db, auth;
  let members = [];
  let siteSettings = {...DEFAULTS};
  let backgroundSettings = {};
  let logoSettings = {};
  let editingMember = null;

  let pendingImageData = "";
  let pendingEmblemData = "";
  let pendingCoverData = "";
  let pendingLogoData = "";
  let pendingFaviconData = "";
  let pendingBackgroundData = "";
  let backgroundUrlDirty = false;

  let clearExistingEmblem = false;
  let clearExistingCover = false;
  let clearExistingLogo = false;
  let clearExistingFavicon = false;

  let unsubscribeMembers = null;

  function message(el, text, type = "") {
    const raw = String(text || "");
    const friendly = /missing or insufficient permissions|permission-denied/i.test(raw)
      ? "Firestore ยังไม่อนุญาตสิทธิ์เขียน — ให้นำ firestore.rules ใน ZIP นี้ไปวางที่ Firestore Database > Rules แล้วกด Publish (ฟรี ไม่ต้องเปิด Storage)"
      : raw;
    el.textContent = friendly;
    el.className = "admin-message" + (type ? " " + type : "");
  }

  function normalizeShineSpeed(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return 6;
    return Math.min(10, Math.max(1, n));
  }

  function shineSpeedToDuration(value) {
    const speed = normalizeShineSpeed(value);
    // 1 = slow (~5.7s), 10 = fast (~1.2s)
    return Math.max(1.2, 6.2 - (speed * 0.5));
  }

  function configured() {
    const c = window.SWYFT_FIREBASE_CONFIG || {};
    return c.apiKey && c.projectId;
  }

  function cleanMediaUrl(value) {
    let v = String(value || "").trim().replace(/&&+/g, "&");
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
    const v = cleanMediaUrl(value).toLowerCase();
    return /^data:video\//.test(v) || /\.(mp4|webm|ogg|mov)([?#].*)?$/.test(v);
  }

  function isGifFile(file) {
    return !!file && /^image\/gif$/i.test(file.type || "");
  }

  function normalizeBrightness(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 78;
    return Math.min(120, Math.max(20, Math.round(n)));
  }

  function readFileAsDataUrl(file, maxBytes = 600000) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve("");
      if (file.size > maxBytes) {
        reject(new Error("GIF ใหญ่เกินไป แนะนำใช้ URL ตรงแทน"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
      reader.readAsDataURL(file);
    });
  }

  if (!configured() || !window.firebase) {
    message(loginMessage, "Firebase config ยังไม่พร้อม", "error");
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.SWYFT_FIREBASE_CONFIG);
  }
  auth = firebase.auth();
  db = firebase.firestore();

  function isAllowedAdmin(user) {
    const allowed = String(window.SWYFT_ADMIN_EMAIL || "").trim().toLowerCase();
    return !!user && !!allowed && user.email &&
      user.email.toLowerCase() === allowed;
  }

  function normalizeAdminLogin(value) {
    const raw = String(value || "").trim().toLowerCase();
    const alias = String(window.SWYFT_ADMIN_ALIAS || "admin").trim().toLowerCase();
    const allowedEmail = String(window.SWYFT_ADMIN_EMAIL || "").trim();

    // หน้า Login รับเฉพาะ ADMIN ID เท่านั้น
    // ผู้ใช้ไม่ต้องกรอกหรือเห็นอีเมล Firebase
    if (raw !== alias) {
      throw new Error("ADMIN ID ไม่ถูกต้อง");
    }
    if (!allowedEmail) {
      throw new Error("ยังไม่ได้ตั้งค่าอีเมล Admin ใน Firebase config");
    }
    return allowedEmail;
  }

  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    message(loginMessage, "กำลังเข้าสู่ระบบ...");

    try {
      const credential = await auth.signInWithEmailAndPassword(
        normalizeAdminLogin($("#loginEmail").value),
        $("#loginPassword").value
      );

      if (!isAllowedAdmin(credential.user)) {
        await auth.signOut();
        throw new Error("บัญชีนี้ไม่ได้รับสิทธิ์ Admin");
      }
    } catch (err) {
      const code = String(err && err.code || "");
      const msg = String(err && err.message || "");

      if (code === "auth/invalid-credential" ||
          code === "auth/wrong-password" ||
          code === "auth/user-not-found" ||
          code === "auth/invalid-email") {
        message(loginMessage, "ADMIN ID หรือ PASSWORD ไม่ถูกต้อง", "error");
      } else if (msg === "ADMIN ID ไม่ถูกต้อง") {
        message(loginMessage, "ADMIN ID หรือ PASSWORD ไม่ถูกต้อง", "error");
      } else {
        message(loginMessage, msg || "เข้าสู่ระบบไม่สำเร็จ", "error");
      }
    }
  });

  logoutBtn.addEventListener("click", () => auth.signOut());

  auth.onAuthStateChanged(user => {
    window.dispatchEvent(new CustomEvent('swyft:admin-auth', {detail: isAllowedAdmin(user) ? {email: user.email, uid: user.uid, alias: String(window.SWYFT_ADMIN_ALIAS || 'admin')} : null}));
    if (isAllowedAdmin(user)) {
      loginPanel.hidden = true;
      dashboard.hidden = false;
      startLiveData();
    } else {
      if (unsubscribeMembers) {
        unsubscribeMembers();
        unsubscribeMembers = null;
      }
      loginPanel.hidden = false;
      dashboard.hidden = true;
      members = [];
      adminMemberList.replaceChildren();
      resetForm();
    }
  });

  function startLiveData() {
    if (unsubscribeMembers) unsubscribeMembers();
    let firstSnapshot = true;

    unsubscribeMembers = db.collection("members")
      .orderBy("order", "asc")
      .onSnapshot(snap => {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.SwyftShared?.setImages(docs);
        const previousIdentity = JSON.stringify([siteSettings, logoSettings]);
        const previousBackground = JSON.stringify(backgroundSettings);

        siteSettings = migrateIdentitySettings(docs.find(x => x.id === SETTINGS_DOC) || {});
        backgroundSettings =
          docs.find(x => x.id === BACKGROUND_DOC) ||
          docs.find(x => x.id === SETTINGS_DOC) ||
          {};
        logoSettings = docs.find(x => x.id === LOGO_DOC) || {};

        members = docs.filter(x =>
          !x.id.startsWith("__site_") &&
          !String(x.type || "").startsWith("site")
        );

        // Member and add-on writes must not overwrite unsaved brand/background inputs.
        if (firstSnapshot || previousIdentity !== JSON.stringify([siteSettings, logoSettings])) renderIdentitySettings();
        if (firstSnapshot || previousBackground !== JSON.stringify(backgroundSettings)) renderBackgroundPreview();
        firstSnapshot = false;
        renderAdminList();
        window.dispatchEvent(new CustomEvent('swyft:admin-data', {detail: {members, settings: siteSettings, fromCache: Boolean(snap.metadata?.fromCache)}}));
      }, err => {
        message(formMessage, err.message, "error");
        window.dispatchEvent(new Event('swyft:admin-error'));
      });
  }

  // ---------- IMAGE HELPERS ----------
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
      };
      img.src = url;
    });
  }

  async function compressImage(file, maxDimension, targetChars, minQuality = 0.38) {
    if (!file) return "";

    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      throw new Error("รองรับเฉพาะ JPG / PNG / WEBP");
    }

    if (file.size > 16 * 1024 * 1024) {
      throw new Error("ไฟล์ต้นฉบับใหญ่เกิน 16MB");
    }

    const img = await loadImage(file);

    let width = img.naturalWidth;
    let height = img.naturalHeight;
    const scale = Math.min(1, maxDimension / Math.max(width, height));

    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#070b12";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.80;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);

    while (dataUrl.length > targetChars && quality > minQuality) {
      quality -= 0.07;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    if (dataUrl.length > targetChars * 1.12) {
      throw new Error("รูปยังใหญ่เกินไป กรุณาเลือกรูปที่เล็กลง");
    }

    return dataUrl;
  }


  // Preserve alpha transparency for OWNER emblem, Logo and Favicon.
  async function compressTransparentImage(file, maxDimension, targetChars, minQuality = 0.36) {
    if (!file) return "";

    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      throw new Error("รองรับเฉพาะ JPG / PNG / WEBP");
    }

    if (file.size > 16 * 1024 * 1024) {
      throw new Error("ไฟล์ต้นฉบับใหญ่เกิน 16MB");
    }

    const img = await loadImage(file);

    let width = img.naturalWidth;
    let height = img.naturalHeight;
    const scale = Math.min(1, maxDimension / Math.max(width, height));

    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    // alpha:true + no background fill = transparency is preserved.
    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.84;
    let dataUrl = canvas.toDataURL("image/webp", quality);

    while (dataUrl.length > targetChars && quality > minQuality) {
      quality -= 0.07;
      dataUrl = canvas.toDataURL("image/webp", quality);
    }

    // Very old browser fallback: PNG still preserves alpha.
    if (!dataUrl.startsWith("data:image/webp")) {
      dataUrl = canvas.toDataURL("image/png");
    }

    if (dataUrl.length > targetChars * 1.15) {
      throw new Error("รูปโปร่งใสยังใหญ่เกินไป กรุณาเลือกรูปที่เล็กลง");
    }

    return dataUrl;
  }

  function setPreview(imgEl, fallbackEl, src, fallbackText) {
    const parent = imgEl.parentElement;
    let videoEl = parent.querySelector("video.preview-video");
    if (!videoEl) {
      videoEl = document.createElement("video");
      videoEl.className = "preview-video";
      videoEl.muted = true;
      videoEl.loop = true;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.preload = "auto";
      videoEl.hidden = true;
      parent.insertBefore(videoEl, fallbackEl);
    }

    const value = cleanMediaUrl(src);

    if (value) {
      if (isVideoSource(value)) {
        imgEl.hidden = true;
        imgEl.removeAttribute("src");
        videoEl.src = value;
        videoEl.hidden = false;
        fallbackEl.hidden = true;
        fallbackEl.textContent = fallbackText;
        videoEl.load();

        const tryPlay = () => {
          const playPromise = videoEl.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        };

        videoEl.addEventListener("canplay", tryPlay, { once: true });
        tryPlay();
      } else {
        videoEl.pause();
        videoEl.hidden = true;
        videoEl.removeAttribute("src");
        videoEl.load();
        imgEl.src = value;
        imgEl.hidden = false;
        fallbackEl.hidden = true;
      }
    } else {
      videoEl.pause();
      videoEl.hidden = true;
      videoEl.removeAttribute("src");
      videoEl.load();
      imgEl.hidden = true;
      imgEl.removeAttribute("src");
      fallbackEl.hidden = false;
      fallbackEl.textContent = fallbackText;
    }
  }

  // ---------- BRAND + RANK SETTINGS ----------
  function renderIdentitySettings() {
    siteNameInput.value = siteSettings.brandName || DEFAULTS.brandName;
    ownerRankNameInput.value = siteSettings.ownerRankName || DEFAULTS.ownerRankName;
    coreRankNameInput.value = siteSettings.coreRankName || DEFAULTS.coreRankName;
    supportRankNameInput.value = siteSettings.supportRankName || DEFAULTS.supportRankName;
    memberRankNameInput.value = siteSettings.memberRankName || DEFAULTS.memberRankName;

    ownerRankColorInput.value = siteSettings.ownerRankColor || DEFAULTS.ownerRankColor;
    coreRankColorInput.value = siteSettings.coreRankColor || DEFAULTS.coreRankColor;
    supportRankColorInput.value = siteSettings.supportRankColor || DEFAULTS.supportRankColor;
    memberRankColorInput.value = siteSettings.memberRankColor || DEFAULTS.memberRankColor;
    hero171ColorInput.value = siteSettings.hero171Color || DEFAULTS.hero171Color;
    hero171ShineColorInput.value = siteSettings.hero171ShineColor || DEFAULTS.hero171ShineColor;
    hero171SpeedInput.value = String(normalizeShineSpeed(siteSettings.hero171ShineSpeed));

    updateColorText();
    updateHero171Preview();

    // Member editor role dropdown follows the rank names from Admin.
    if (roleInput && roleInput.options.length >= 4) {
      roleInput.options[0].textContent = siteSettings.ownerRankName || DEFAULTS.ownerRankName;
      roleInput.options[1].textContent = siteSettings.coreRankName || DEFAULTS.coreRankName;
      roleInput.options[2].textContent = siteSettings.supportRankName || DEFAULTS.supportRankName;
      roleInput.options[3].textContent = siteSettings.memberRankName || DEFAULTS.memberRankName;
    }

    const logoSrc = pendingLogoData || (clearExistingLogo ? "" : logoSettings.logoImageData || "");
    setPreview(logoPreview, logoFallback, logoSrc, "T");

    const faviconSrc =
      pendingFaviconData ||
      (clearExistingFavicon ? "" : logoSettings.faviconImageData || "");
    setPreview(faviconPreview, faviconFallback, faviconSrc, "T");

    if (faviconLink) {
      if (faviconSrc) faviconLink.href = faviconSrc;
      else faviconLink.removeAttribute("href");
    }
  }

  function updateColorText() {
    ownerColorText.textContent = ownerRankColorInput.value;
    coreColorText.textContent = coreRankColorInput.value;
    supportColorText.textContent = supportRankColorInput.value;
    memberColorText.textContent = memberRankColorInput.value;
    hero171ColorText.textContent = hero171ColorInput.value;
    hero171ShineColorText.textContent = hero171ShineColorInput.value;
  }

  function updateHero171Preview() {
    const base = hero171ColorInput.value;
    const shine = hero171ShineColorInput.value;
    const speed = normalizeShineSpeed(hero171SpeedInput.value);
    const duration = shineSpeedToDuration(speed);

    hero171SpeedValue.textContent = `${speed} / 10`;
    hero171Preview.style.backgroundImage =
      `linear-gradient(105deg, ${base} 0%, ${base} 32%, ${shine} 47%, #ffffff 50%, ${shine} 53%, ${base} 68%, ${base} 100%)`;
    hero171Preview.style.animationDuration = `${duration}s`;
  }

  [ownerRankColorInput, coreRankColorInput, supportRankColorInput, memberRankColorInput].forEach(input => {
    input.addEventListener("input", updateColorText);
  });

  [hero171ColorInput, hero171ShineColorInput].forEach(input => {
    input.addEventListener("input", () => {
      updateColorText();
      updateHero171Preview();
    });
  });

  hero171SpeedInput.addEventListener("input", updateHero171Preview);

  logoInput.addEventListener("change", async () => {
    const file = logoInput.files[0];
    if (!file) return;

    message(identityMessage, "กำลังย่อโลโก้...");
    try {
      pendingLogoData = await compressTransparentImage(file, 420, 150000);
      clearExistingLogo = false;
      setPreview(logoPreview, logoFallback, pendingLogoData, "T");
      message(identityMessage, "โลโก้พร้อม กด SAVE BRAND & RANKS", "success");
    } catch (err) {
      pendingLogoData = "";
      logoInput.value = "";
      message(identityMessage, err.message, "error");
    }
  });

  removeLogoBtn.addEventListener("click", () => {
    pendingLogoData = "";
    clearExistingLogo = true;
    logoInput.value = "";
    setPreview(logoPreview, logoFallback, "", "T");
    message(identityMessage, "โลโก้จะถูกลบเมื่อกด SAVE BRAND & RANKS", "success");
  });


  faviconInput.addEventListener("change", async () => {
    const file = faviconInput.files[0];
    if (!file) return;

    message(identityMessage, "กำลังทำ Website Icon...");

    try {
      pendingFaviconData = await compressTransparentImage(file, 192, 70000, 0.32);
      clearExistingFavicon = false;

      setPreview(faviconPreview, faviconFallback, pendingFaviconData, "T");

      if (faviconLink) faviconLink.href = pendingFaviconData;

      message(identityMessage, "Website Icon พร้อม กด SAVE BRAND & RANKS", "success");
    } catch (err) {
      pendingFaviconData = "";
      faviconInput.value = "";
      message(identityMessage, err.message, "error");
    }
  });

  removeFaviconBtn.addEventListener("click", () => {
    pendingFaviconData = "";
    clearExistingFavicon = true;
    faviconInput.value = "";

    setPreview(faviconPreview, faviconFallback, "", "T");

    if (faviconLink) faviconLink.removeAttribute("href");

    message(identityMessage, "Website Icon จะถูกลบเมื่อกด SAVE BRAND & RANKS", "success");
  });

  saveIdentityBtn.addEventListener("click", async () => {
    saveIdentityBtn.disabled = true;
    message(identityMessage, "กำลังบันทึก...");

    try {
      const batch = db.batch();

      const settingsRef = db.collection("members").doc(SETTINGS_DOC);
      batch.set(settingsRef, {
        type: "siteSettings",
        role: "settings",
        order: 999997,
        brandName: siteNameInput.value.trim() || DEFAULTS.brandName,
        ownerRankName: ownerRankNameInput.value.trim() || DEFAULTS.ownerRankName,
        coreRankName: coreRankNameInput.value.trim() || DEFAULTS.coreRankName,
        supportRankName: supportRankNameInput.value.trim() || DEFAULTS.supportRankName,
        memberRankName: memberRankNameInput.value.trim() || DEFAULTS.memberRankName,
        ownerRankColor: ownerRankColorInput.value,
        coreRankColor: coreRankColorInput.value,
        supportRankColor: supportRankColorInput.value,
        memberRankColor: memberRankColorInput.value,
        hero171Color: hero171ColorInput.value,
        hero171ShineColor: hero171ShineColorInput.value,
        hero171ShineSpeed: normalizeShineSpeed(hero171SpeedInput.value),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      if (
        pendingLogoData ||
        clearExistingLogo ||
        pendingFaviconData ||
        clearExistingFavicon
      ) {
        const logoRef = db.collection("members").doc(LOGO_DOC);

        const finalLogo =
          clearExistingLogo
            ? ""
            : (pendingLogoData || logoSettings.logoImageData || "");

        const finalFavicon =
          clearExistingFavicon
            ? ""
            : (pendingFaviconData || logoSettings.faviconImageData || "");

        batch.set(logoRef, {
          type: "siteLogo",
          role: "settings",
          order: 999998,
          logoImageData: finalLogo,
          faviconImageData: finalFavicon,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      await batch.commit();

      pendingLogoData = "";
      pendingFaviconData = "";
      clearExistingLogo = false;
      clearExistingFavicon = false;
      message(identityMessage, "บันทึกชื่อเว็บ โลโก้ Website Icon ชื่อยศ สี และเอฟเฟกต์ Hero เรียบร้อย", "success");
    } catch (err) {
      message(identityMessage, err.message, "error");
    } finally {
      saveIdentityBtn.disabled = false;
    }
  });

  // ---------- BACKGROUND ----------
  function applyBackgroundPreviewBrightness() {
    const amount = normalizeBrightness(backgroundBrightnessInput.value);
    backgroundBrightnessValue.textContent = amount + "%";

    backgroundPreview.style.filter = `brightness(${amount / 100})`;

    const previewVideo = backgroundPreview.parentElement.querySelector("video.preview-video");
    if (previewVideo) {
      previewVideo.style.filter = `brightness(${amount / 100})`;
    }
  }

  function normalizeWeatherEffect(value) {
    const effect = String(value || "").trim().toLowerCase();
    return ["snow", "rain", "ash", "off"].includes(effect) ? effect : "snow";
  }

  function renderBackgroundPreview() {
    const savedUrl = backgroundSettings.backgroundMediaUrl || "";
    if (!pendingBackgroundData && !backgroundUrlDirty && document.activeElement !== backgroundMediaUrlInput) {
      backgroundMediaUrlInput.value = savedUrl;
    }

    if (document.activeElement !== backgroundBrightnessInput) {
      backgroundBrightnessInput.value = String(normalizeBrightness(backgroundSettings.backgroundBrightness));
    }

    if (weatherEffectInput && document.activeElement !== weatherEffectInput) {
      weatherEffectInput.value = normalizeWeatherEffect(backgroundSettings.weatherEffect);
    }

    const current = pendingBackgroundData || cleanMediaUrl(backgroundMediaUrlInput.value) || backgroundSettings.backgroundImageData || "";
    setPreview(backgroundPreview, backgroundFallback, current, "NO CUSTOM BACKGROUND");
    applyBackgroundPreviewBrightness();
  }

  backgroundBrightnessInput.addEventListener("input", applyBackgroundPreviewBrightness);

  backgroundInput.addEventListener("change", async () => {
    const file = backgroundInput.files[0];
    if (!file) return;

    backgroundProgress.hidden = false;
    backgroundProgressFill.style.width = "25%";
    backgroundProgressText.textContent = "Preparing background...";
    message(siteMessage, "กำลังเตรียมพื้นหลัง...");

    try {
      if (isGifFile(file)) {
        pendingBackgroundData = await readFileAsDataUrl(file, 600000);
      } else {
        pendingBackgroundData = await compressImage(file, 1600, 500000, 0.30);
      }
      backgroundMediaUrlInput.value = "";
      backgroundUrlDirty = true;
      renderBackgroundPreview();
      backgroundProgressFill.style.width = "100%";
      backgroundProgressText.textContent = "Background ready";
      message(siteMessage, "พื้นหลังพร้อม กด SAVE BACKGROUND", "success");
      setTimeout(() => backgroundProgress.hidden = true, 600);
    } catch (err) {
      pendingBackgroundData = "";
      backgroundInput.value = "";
      backgroundProgress.hidden = true;
      message(siteMessage, err.message, "error");
    }
  });

  saveBackgroundBtn.addEventListener("click", async () => {
    const urlValue = pendingBackgroundData ? "" : cleanMediaUrl(backgroundMediaUrlInput.value);
    if (urlValue) backgroundMediaUrlInput.value = urlValue;
    const dataValue = urlValue ? "" : (pendingBackgroundData || backgroundSettings.backgroundImageData || "");
    const brightnessValue = normalizeBrightness(backgroundBrightnessInput.value);
    const weatherEffect = normalizeWeatherEffect(weatherEffectInput?.value);

    saveBackgroundBtn.disabled = true;
    message(siteMessage, "กำลังบันทึกพื้นหลัง...");

    try {
      await db.collection("members").doc(BACKGROUND_DOC).set({
        type: "siteBackground",
        role: "settings",
        order: 999999,
        backgroundImageData: dataValue,
        backgroundMediaUrl: urlValue,
        backgroundBrightness: brightnessValue,
        weatherEffect,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      pendingBackgroundData = "";
      backgroundSettings.backgroundMediaUrl = urlValue;
      backgroundSettings.backgroundImageData = dataValue;
      backgroundUrlDirty = false;
      backgroundSettings.backgroundBrightness = brightnessValue;
      backgroundSettings.weatherEffect = weatherEffect;
      saveBackgroundCacheLocal({
        backgroundImageData: dataValue,
        backgroundMediaUrl: urlValue,
        backgroundBrightness: brightnessValue,
        weatherEffect
      });
      message(siteMessage, "อัปเดตพื้นหลังและเอฟเฟกต์เว็บไซต์เรียบร้อย", "success");
    } catch (err) {
      if (isPermissionError(err)) {
        pendingBackgroundData = "";
        backgroundSettings.backgroundMediaUrl = urlValue;
        backgroundSettings.backgroundImageData = dataValue;
        backgroundUrlDirty = false;
        backgroundSettings.backgroundBrightness = brightnessValue;
        backgroundSettings.weatherEffect = weatherEffect;
        saveBackgroundCacheLocal({
          backgroundImageData: dataValue,
          backgroundMediaUrl: urlValue,
          backgroundBrightness: brightnessValue,
          weatherEffect
        });
        renderBackgroundPreview();
        message(siteMessage, "บันทึกพื้นหลังในเครื่องนี้แล้ว (Local mode) — ถ้าต้องการให้ทุกเครื่องเห็นเหมือนกัน ค่อย Publish Firebase Rules ภายหลัง", "success");
      } else {
        message(siteMessage, err.message, "error");
      }
    } finally {
      saveBackgroundBtn.disabled = false;
    }
  });

  removeBackgroundBtn.addEventListener("click", async () => {
    if (!confirm("กลับไปใช้พื้นหลัง Default ใช่ไหม?")) return;

    removeBackgroundBtn.disabled = true;
    try {
      await db.collection("members").doc(BACKGROUND_DOC).set({
        type: "siteBackground",
        role: "settings",
        order: 999999,
        backgroundImageData: "",
        backgroundMediaUrl: "",
        backgroundBrightness: 78,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      pendingBackgroundData = "";
      backgroundInput.value = "";
      backgroundMediaUrlInput.value = "";
      backgroundBrightnessInput.value = "78";
      backgroundUrlDirty = false;
      backgroundSettings.backgroundMediaUrl = "";
      backgroundSettings.backgroundImageData = "";
      backgroundSettings.backgroundBrightness = 78;
      backgroundSettings.weatherEffect = normalizeWeatherEffect(weatherEffectInput?.value);
      clearBackgroundCacheLocal();
      renderBackgroundPreview();
      message(siteMessage, "กลับไปใช้พื้นหลัง Default แล้ว", "success");
    } catch (err) {
      if (isPermissionError(err)) {
        pendingBackgroundData = "";
        backgroundInput.value = "";
        backgroundMediaUrlInput.value = "";
        backgroundBrightnessInput.value = "78";
        backgroundUrlDirty = false;
        backgroundSettings.backgroundMediaUrl = "";
        backgroundSettings.backgroundImageData = "";
        backgroundSettings.backgroundBrightness = 78;
        backgroundSettings.weatherEffect = normalizeWeatherEffect(weatherEffectInput?.value);
        clearBackgroundCacheLocal();
        renderBackgroundPreview();
        message(siteMessage, "ลบพื้นหลังเฉพาะในเครื่องนี้แล้ว (Local mode)", "success");
      } else {
        message(siteMessage, err.message, "error");
      }
    } finally {
      removeBackgroundBtn.disabled = false;
    }
  });

  // ---------- MEMBER HELPERS ----------
  function memberImage(m) {
    return window.SwyftShared?.imageFor(m) || m?.imageMediaUrl || m?.imageData || m?.imageUrl || "";
  }

  function memberEmblem(m) {
    return m?.emblemMediaUrl || m?.emblemImageData || "";
  }

  function memberCover(m) {
    return m?.coverMediaUrl || m?.coverImageData || "";
  }

  function rankLabel(role) {
    if (role === "owner") return siteSettings.ownerRankName || DEFAULTS.ownerRankName;
    if (role === "core") return siteSettings.coreRankName || DEFAULTS.coreRankName;
    if (role === "bigsupport") return siteSettings.supportRankName || DEFAULTS.supportRankName;
    return siteSettings.memberRankName || DEFAULTS.memberRankName;
  }

  function renderAdminList() {
    const term = (adminSearch.value || "").trim().toLowerCase();

    const visible = members.filter(m =>
      [m.name, m.title, m.role, m.number]
        .map(v => String(v || "").toLowerCase())
        .join(" ")
        .includes(term)
    ).sort((a, b) => String(a?.name || "").localeCompare(
      String(b?.name || ""),
      ["en", "th"],
      { sensitivity: "base", numeric: true }
    ));

    adminMemberList.innerHTML = "";
    adminCount.textContent = String(members.length).padStart(2, "0");
    adminEmpty.classList.toggle("show", visible.length === 0);

    const pageItems = window.SwyftPeople?.renderSlice(visible) || visible;
    adminEmpty.classList.toggle('show', pageItems.length === 0);
    pageItems.forEach(m => {
      const row = document.createElement("div");
      row.className = "admin-member";
      if (m.visible === false) row.classList.add("is-hidden-member");

      const photo = document.createElement("div");
      photo.className = "admin-member-photo";

      const src = memberImage(m);
      if (src) {
        if (isVideoSource(src)) {
          const video = document.createElement("video");
          video.src = src;
          video.muted = true;
          video.loop = true;
          video.autoplay = true;
          video.playsInline = true;
          video.addEventListener("error", () => {
            video.remove();
            photo.textContent = m.number || "00";
          });
          photo.appendChild(video);
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
        } else {
          const img = document.createElement("img");
          img.src = src;
          img.alt = m.name || "Member";
          img.onerror = () => {
            img.remove();
            photo.textContent = m.number || "00";
          };
          photo.appendChild(img);
        }
      } else {
        photo.textContent = m.number || "00";
      }

      const info = document.createElement("div");
      info.className = "admin-member-info";

      const b = document.createElement("b");
      b.textContent = m.name || "MEMBER";

      const sub = document.createElement("span");
      sub.textContent = `${m.number || "--"} · ${m.title || "House Member"}`;

      const badges = document.createElement("div");
      badges.className = "admin-badges";

      const role = document.createElement("span");
      role.className = "role-tag";
      role.textContent = rankLabel(m.role || "member");

      const vis = document.createElement("span");
      vis.className = "visibility-tag " + (m.visible === false ? "hidden-tag" : "shown-tag");
      vis.textContent = m.visible === false ? "HIDDEN" : "SHOWING";

      badges.append(role, vis);
      info.append(b, sub, badges);

      const actions = document.createElement("div");
      actions.className = "admin-member-actions";

      const toggle = document.createElement("button");
      toggle.className = "small-action visibility-action";
      toggle.type = "button";
      toggle.textContent = m.visible === false ? "◉" : "◌";
      toggle.title = m.visible === false ? "Show member" : "Hide member";
      toggle.addEventListener("click", () => toggleMemberVisibility(m));

      const edit = document.createElement("button");
      edit.className = "small-action";
      edit.type = "button";
      edit.textContent = "✎";
      edit.title = "Edit";
      edit.addEventListener("click", () => editMember(m));

      const del = document.createElement("button");
      del.className = "small-action delete";
      del.type = "button";
      del.textContent = "×";
      del.title = "Delete";
      del.addEventListener("click", () => deleteMember(m));

      actions.append(toggle, edit, del);
      row.append(photo, info, actions);
      window.SwyftPeople?.decorate(row, m);
      adminMemberList.appendChild(row);
    });
  }

  adminSearch.addEventListener("input", () => {window.SwyftPeople?.resetPage();renderAdminList();});
  window.addEventListener('swyft:render-admin', renderAdminList);

  async function toggleMemberVisibility(m) {
    try {
      await db.collection("members").doc(m.id).update({
        visible: m.visible === false,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      alert(err.message);
    }
  }

  // ---------- MEMBER IMAGE EVENTS ----------
  imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];
    if (!file) return;

    uploadProgress.hidden = false;
    progressFill.style.width = "30%";
    progressText.textContent = "Preparing profile...";
    message(formMessage, "กำลังเตรียมรูปโปรไฟล์...");

    try {
      pendingImageData = isGifFile(file)
        ? await readFileAsDataUrl(file, 900000)
        : await compressImage(file, 600, 360000);
      setPreview(imagePreview, imageFallback, pendingImageData, "IMG");
      progressFill.style.width = "100%";
      progressText.textContent = "Profile ready";
      message(formMessage, "รูปโปรไฟล์พร้อมบันทึก", "success");
      setTimeout(() => uploadProgress.hidden = true, 500);
    } catch (err) {
      pendingImageData = "";
      imageInput.value = "";
      uploadProgress.hidden = true;
      message(formMessage, err.message, "error");
    }
  });

  emblemInput.addEventListener("change", async () => {
    const file = emblemInput.files[0];
    if (!file) return;

    uploadProgress.hidden = false;
    progressFill.style.width = "30%";
    progressText.textContent = "Preparing owner image...";
    message(formMessage, "กำลังเตรียมรูปช่องซ้าย OWNER...");

    try {
      pendingEmblemData = isGifFile(file)
        ? await readFileAsDataUrl(file, 900000)
        : await compressTransparentImage(file, 500, 170000);
      clearExistingEmblem = false;
      setPreview(emblemPreview, emblemFallback, pendingEmblemData, "✦");
      progressFill.style.width = "100%";
      progressText.textContent = "Owner image ready";
      message(formMessage, "รูปช่องซ้าย OWNER พร้อมบันทึก", "success");
      setTimeout(() => uploadProgress.hidden = true, 500);
    } catch (err) {
      pendingEmblemData = "";
      emblemInput.value = "";
      uploadProgress.hidden = true;
      message(formMessage, err.message, "error");
    }
  });

  coverInput.addEventListener("change", async () => {
    const file = coverInput.files[0];
    if (!file) return;

    uploadProgress.hidden = false;
    progressFill.style.width = "30%";
    progressText.textContent = "Preparing popup cover...";
    message(formMessage, "กำลังเตรียม Cover ของ Popup...");

    try {
      pendingCoverData = isGifFile(file)
        ? await readFileAsDataUrl(file, 900000)
        : await compressImage(file, 1200, 250000, 0.30);
      clearExistingCover = false;
      setPreview(coverPreview, coverFallback, pendingCoverData, "COVER");
      progressFill.style.width = "100%";
      progressText.textContent = "Cover ready";
      message(formMessage, "Popup Cover พร้อมบันทึก", "success");
      setTimeout(() => uploadProgress.hidden = true, 500);
    } catch (err) {
      pendingCoverData = "";
      coverInput.value = "";
      uploadProgress.hidden = true;
      message(formMessage, err.message, "error");
    }
  });

  [backgroundMediaUrlInput, imageUrlInput, emblemUrlInput, coverUrlInput].forEach(input => {
    input.addEventListener("input", () => {
      if (input === backgroundMediaUrlInput) {
        backgroundUrlDirty = true;
        pendingBackgroundData = "";
        backgroundInput.value = "";
        renderBackgroundPreview();
      } else if (input === imageUrlInput) {
        setPreview(imagePreview, imageFallback, cleanMediaUrl(imageUrlInput.value) || pendingImageData, "IMG");
      } else if (input === emblemUrlInput) {
        setPreview(emblemPreview, emblemFallback, cleanMediaUrl(emblemUrlInput.value) || pendingEmblemData, "✦");
      } else if (input === coverUrlInput) {
        setPreview(coverPreview, coverFallback, cleanMediaUrl(coverUrlInput.value) || pendingCoverData, "COVER");
      }
    });
  });

  clearEmblemBtn.addEventListener("click", () => {
    pendingEmblemData = "";
    clearExistingEmblem = true;
    emblemInput.value = "";
    setPreview(emblemPreview, emblemFallback, "", "PROFILE");
    message(formMessage, "ช่องซ้าย OWNER จะใช้รูป Profile แทน", "success");
  });

  clearCoverBtn.addEventListener("click", () => {
    pendingCoverData = "";
    clearExistingCover = true;
    coverInput.value = "";
    setPreview(coverPreview, coverFallback, "", "COVER");
    message(formMessage, "Popup Cover จะถูกลบเมื่อกดบันทึก", "success");
  });

  function toggleEmblemEditor() {
    emblemUploadArea.hidden = roleInput.value !== "owner";
  }
  roleInput.addEventListener("change", toggleEmblemEditor);

  // ---------- MEMBER FORM ----------
  function resetForm() {
    editingMember = null;
    pendingImageData = "";
    pendingEmblemData = "";
    pendingCoverData = "";
    clearExistingEmblem = false;
    clearExistingCover = false;

    form.reset();
    docId.value = "";
    orderInput.value = "100";
    roleInput.value = "member";
    visibleInput.value = "true";
    statusInput.value = "ONLINE";
    showAccessInput.checked = true;
    showFacebookInput.checked = true;
    showDiscordInput.checked = true;
    imageUrlInput.value = "";
    emblemUrlInput.value = "";
    coverUrlInput.value = "";

    formTitle.textContent = "ADD MEMBER";
    saveBtn.textContent = "SAVE MEMBER";
    cancelEditBtn.hidden = true;

    imageInput.value = "";
    emblemInput.value = "";
    coverInput.value = "";
    setPreview(imagePreview, imageFallback, "", "IMG");
    setPreview(emblemPreview, emblemFallback, "", "✦");
    setPreview(coverPreview, coverFallback, "", "COVER");

    uploadProgress.hidden = true;
    progressFill.style.width = "0%";
    message(formMessage, "");
    toggleEmblemEditor();
  }

  resetBtn.addEventListener("click", resetForm);
  cancelEditBtn.addEventListener("click", resetForm);

  function editMember(m) {
    editingMember = m;
    pendingImageData = "";
    pendingEmblemData = "";
    pendingCoverData = "";
    clearExistingEmblem = false;
    clearExistingCover = false;

    docId.value = m.id;
    nameInput.value = m.name || "";
    numberInput.value = m.number || "";
    roleInput.value = m.role || "member";
    visibleInput.value = m.visible === false ? "false" : "true";
    statusInput.value = m.status || "ONLINE";
    titleInput.value = m.title || "";
    sinceInput.value = "";
    orderInput.value = Number.isFinite(Number(m.order)) ? Number(m.order) : 100;
    accessInput.value = m.access || "";
    facebookInput.value = m.facebook || "";
    discordInput.value = m.discord || "";
    showAccessInput.checked = m.showAccess !== false;
    showFacebookInput.checked = m.showFacebook !== false;
    showDiscordInput.checked = m.showDiscord !== false;
    imageUrlInput.value = m.imageMediaUrl || m.imageUrl || "";
    emblemUrlInput.value = m.emblemMediaUrl || "";
    coverUrlInput.value = m.coverMediaUrl || "";
    aboutInput.value = m.about || "";

    setPreview(imagePreview, imageFallback, imageUrlInput.value || memberImage(m), m.number || "IMG");
    setPreview(emblemPreview, emblemFallback, emblemUrlInput.value || memberEmblem(m), memberImage(m) ? "PROFILE" : "✦");
    setPreview(coverPreview, coverFallback, coverUrlInput.value || memberCover(m), "COVER");

    formTitle.textContent = "EDIT MEMBER";
    saveBtn.textContent = "UPDATE MEMBER";
    cancelEditBtn.hidden = false;
    toggleEmblemEditor();
    window.dispatchEvent(new Event('swyft:edit-member'));
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    saveBtn.disabled = true;
    message(formMessage, "กำลังบันทึก...");

    try {
      const existingProfileData = editingMember?.imageData || "";
      const existingEmblemData = editingMember?.emblemImageData || "";
      const existingCoverData = editingMember?.coverImageData || "";

      const imageMediaUrl = cleanMediaUrl(imageUrlInput.value);
      const emblemMediaUrl = cleanMediaUrl(emblemUrlInput.value);
      const coverMediaUrl = cleanMediaUrl(coverUrlInput.value);

      const imageData = imageMediaUrl ? "" : (pendingImageData || existingProfileData || "");

      let emblemImageData = emblemMediaUrl ? "" : (pendingEmblemData || existingEmblemData || "");
      if (clearExistingEmblem && !emblemMediaUrl) emblemImageData = "";

      let coverImageData = coverMediaUrl ? "" : (pendingCoverData || existingCoverData || "");
      if (clearExistingCover && !coverMediaUrl) coverImageData = "";

      const data = {
        name: nameInput.value.trim(),
        number: numberInput.value.trim(),
        role: roleInput.value,
        visible: visibleInput.value !== "false",
        status: statusInput.value,
        title: titleInput.value.trim(),
        since: "",
        order: Number(orderInput.value || 100),
        access: accessInput.value.trim(),
        facebook: facebookInput.value.trim(),
        discord: discordInput.value.trim(),
        showAccess: !!showAccessInput.checked,
        showFacebook: !!showFacebookInput.checked,
        showDiscord: !!showDiscordInput.checked,
        about: aboutInput.value.trim(),
        imageData,
        imageUrl: "",
        imageMediaUrl,
        sharedImageId: imageMediaUrl || pendingImageData ? '' : (editingMember?.sharedImageId || ''),
        emblemImageData,
        emblemMediaUrl,
        coverImageData,
        coverMediaUrl,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (editingMember) {
        await db.collection("members").doc(editingMember.id).update(data);
        message(formMessage, "อัปเดตสมาชิกเรียบร้อย", "success");
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("members").add(data);
        message(formMessage, "เพิ่มสมาชิกเรียบร้อย", "success");
      }

      setTimeout(resetForm, 700);
    } catch (err) {
      let friendly = err.message || "บันทึกไม่สำเร็จ";
      if (
        String(err.code || "").includes("resource-exhausted") ||
        String(err.message || "").toLowerCase().includes("maximum")
      ) {
        friendly = "ข้อมูลรูปใหญ่เกิน Firestore กรุณาใช้รูปที่เล็กลงหรือใช้ URL";
      }
      message(formMessage, friendly, "error");
    } finally {
      saveBtn.disabled = false;
    }
  });

  async function deleteMember(m) {
    if (!confirm(`ลบ ${m.name || "สมาชิก"} ใช่ไหม?`)) return;

    try {
      await db.collection("members").doc(m.id).delete();
      if (editingMember?.id === m.id) resetForm();
    } catch (err) {
      alert(err.message);
    }
  }

  resetForm();
})();
