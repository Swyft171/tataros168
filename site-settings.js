(() => {
  const SETTINGS_DOC = "__site_settings";
  const BACKGROUND_DOC = "__site_background";
  const LOGO_DOC = "__site_logo";
  const LOGO_CACHE_KEY = "swyftSiteLogoCache";
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
    hero171ShineSpeed: 6,
    weatherEffect: "snow"
  };

  const config = window.SWYFT_FIREBASE_CONFIG;
  if (!config || !config.apiKey || !window.firebase) return;

  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }

  const db = firebase.firestore();

  let legacyBackground = "";
  let legacyBackgroundBrightness = 78;
  let backgroundOverride = null;
  let backgroundBrightness = 78;
  let legacyWeatherEffect = DEFAULTS.weatherEffect;
  let weatherEffectOverride = null;
  const backgroundVideo = ensureBackgroundVideoLayer();
  const backgroundImageLayer = ensureBackgroundImageLayer();

  function refreshBackground() {
    applyBackground(
      backgroundOverride !== null ? backgroundOverride : legacyBackground,
      backgroundBrightness
    );
  }

  function normalizeWeatherEffect(value) {
    const effect = String(value || "").trim().toLowerCase();
    return ["snow", "rain", "ash", "off"].includes(effect) ? effect : DEFAULTS.weatherEffect;
  }

  function applyWeatherEffect(value) {
    const effect = normalizeWeatherEffect(value);
    document.documentElement.dataset.weatherEffect = effect;
    window.SWYFT_WEATHER_EFFECT = effect;
    window.dispatchEvent(new CustomEvent("swyft:weather", { detail: { effect } }));
  }

  function refreshWeatherEffect() {
    applyWeatherEffect(
      weatherEffectOverride !== null ? weatherEffectOverride : legacyWeatherEffect
    );
  }

  function ensureBackgroundVideoLayer() {
    let layer = document.querySelector("#siteBackgroundMediaLayer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "siteBackgroundMediaLayer";
      layer.innerHTML = '<video id="siteBackgroundVideo" autoplay muted loop playsinline hidden></video>';
      document.body.prepend(layer);
    }
    return layer.querySelector("#siteBackgroundVideo");
  }

  function ensureBackgroundImageLayer() {
    let layer = document.querySelector("#siteBackgroundImageLayer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "siteBackgroundImageLayer";
      document.body.prepend(layer);
    }
    return layer;
  }

  function normalizeMediaUrl(value) {
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
    const v = normalizeMediaUrl(value).toLowerCase();
    return /^data:video\//.test(v) || /\.(mp4|webm|ogg|mov)([?#].*)?$/.test(v);
  }

  function normalizeBrightness(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 78;
    return Math.min(120, Math.max(20, Math.round(n)));
  }

  function applyBackgroundBrightness(value) {
    const normalized = normalizeBrightness(value);
    document.documentElement.style.setProperty("--site-background-brightness", String(normalized / 100));
  }

  function hexToRgb(hex) {
    const clean = String(hex || "").replace("#", "").trim();
    const normalized = clean.length === 3
      ? clean.split("").map(x => x + x).join("")
      : clean;

    if (!/^[0-9a-f]{6}$/i.test(normalized)) return "255,255,255";

    return [
      parseInt(normalized.slice(0,2), 16),
      parseInt(normalized.slice(2,4), 16),
      parseInt(normalized.slice(4,6), 16)
    ].join(",");
  }

  function shineSpeedToDuration(value) {
    const n = Math.round(Number(value));
    const speed = Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 6;
    return Math.max(1.2, 6.2 - speed * 0.5);
  }

  function applySettings(raw) {
    const s = {...DEFAULTS, ...(raw || {})};
    if (/^SWYFT(?:\s*171)?$/i.test(String(s.brandName || "").trim())) s.brandName = "TATAROS";
    if (String(s.ownerRankColor).toLowerCase() === "#88d8ff") s.ownerRankColor = DEFAULTS.ownerRankColor;
    if (String(s.coreRankColor).toLowerCase() === "#fa1e1e") s.coreRankColor = DEFAULTS.coreRankColor;
    if (!s.supportRankName) s.supportRankName = DEFAULTS.supportRankName;
    if (!/^#[0-9a-f]{6}$/i.test(String(s.supportRankColor || ""))) s.supportRankColor = DEFAULTS.supportRankColor;
    if (String(s.memberRankColor).toLowerCase() === "#ffffff") s.memberRankColor = DEFAULTS.memberRankColor;
    if (String(s.hero171Color).toLowerCase() === "#f4f8ff") s.hero171Color = DEFAULTS.hero171Color;
    if (String(s.hero171ShineColor).toLowerCase() === "#8fdcff") s.hero171ShineColor = DEFAULTS.hero171ShineColor;
    window.SWYFT_SITE_SETTINGS = s;

    document.documentElement.style.setProperty("--rank-owner-color", s.ownerRankColor);
    document.documentElement.style.setProperty("--rank-core-color", s.coreRankColor);
    document.documentElement.style.setProperty("--rank-support-color", s.supportRankColor);
    document.documentElement.style.setProperty("--rank-member-color", s.memberRankColor);

    document.documentElement.style.setProperty("--rank-owner-rgb", hexToRgb(s.ownerRankColor));
    document.documentElement.style.setProperty("--rank-core-rgb", hexToRgb(s.coreRankColor));
    document.documentElement.style.setProperty("--rank-support-rgb", hexToRgb(s.supportRankColor));
    document.documentElement.style.setProperty("--rank-member-rgb", hexToRgb(s.memberRankColor));

    document.documentElement.style.setProperty("--hero-171-color", s.hero171Color || DEFAULTS.hero171Color);
    document.documentElement.style.setProperty("--hero-171-shine", s.hero171ShineColor || DEFAULTS.hero171ShineColor);
    document.documentElement.style.setProperty(
      "--hero-171-duration",
      `${shineSpeedToDuration(s.hero171ShineSpeed)}s`
    );

    document.querySelectorAll("[data-site-name]").forEach(el => {
      el.textContent = s.brandName;
    });

    const brandText = String(s.brandName || DEFAULTS.brandName).trim();
    const heroMain = brandText.replace(/\s*171\s*$/i, "").trim() || "TATAROS";

    document.querySelectorAll("[data-hero-brand-main]").forEach(el => {
      el.textContent = heroMain;
    });

    document.querySelectorAll("[data-hero-brand-number]").forEach(el => {
      el.textContent = "171";
      el.setAttribute("data-shine-text", "171");
    });

    const labels = {
      owner: s.ownerRankName,
      core: s.coreRankName,
      bigsupport: s.supportRankName,
      member: s.memberRankName
    };

    Object.entries(labels).forEach(([role, label]) => {
      document.querySelectorAll(`[data-rank-title="${role}"]`).forEach(el => {
        el.textContent = label;
      });
      document.querySelectorAll(`[data-rank-filter="${role}"]`).forEach(el => {
        el.textContent = label;
      });
    });

    const suffix = document.body.classList.contains("members-page") ? "Members" : "Home";
    document.title = `${s.brandName} — ${suffix}`;

    window.dispatchEvent(new CustomEvent("swyft:settings", { detail: s }));
  }

  function applyBackground(value, brightnessValue = 78) {
    const media = normalizeMediaUrl(value);
    const videoMode = isVideoSource(media);

    applyBackgroundBrightness(brightnessValue);

    document.documentElement.style.setProperty("--site-background-image", "none");

    if (videoMode) {
      document.body.classList.remove("video-background-ready");
      document.body.classList.add("has-custom-background", "has-video-background");

      if (backgroundImageLayer) {
        backgroundImageLayer.style.backgroundImage = "none";
        backgroundImageLayer.hidden = true;
      }

      if (backgroundVideo) {
        backgroundVideo.muted = true;
        backgroundVideo.loop = true;
        backgroundVideo.autoplay = true;
        backgroundVideo.playsInline = true;
        backgroundVideo.preload = "auto";
        backgroundVideo.src = media;
        backgroundVideo.hidden = false;
        backgroundVideo.style.display = "block";
        backgroundVideo.load();

        const markReady = () => {
          document.body.classList.add("video-background-ready");
        };

        const tryPlay = () => {
          const playPromise = backgroundVideo.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        };

        backgroundVideo.addEventListener("loadeddata", () => {
          markReady();
          tryPlay();
        }, { once: true });

        backgroundVideo.addEventListener("canplay", () => {
          markReady();
          tryPlay();
        }, { once: true });

        tryPlay();
      }
      return;
    }

    document.body.classList.remove("has-video-background", "video-background-ready");
    if (backgroundVideo) {
      backgroundVideo.pause();
      backgroundVideo.hidden = true;
      backgroundVideo.style.display = "none";
      backgroundVideo.removeAttribute("src");
      backgroundVideo.load();
    }

    if (backgroundImageLayer) {
      if (media) {
        backgroundImageLayer.style.backgroundImage = `url("${media}")`;
        backgroundImageLayer.hidden = false;
        document.body.classList.add("has-custom-background");
      } else {
        backgroundImageLayer.style.backgroundImage = "none";
        backgroundImageLayer.hidden = true;
        document.body.classList.remove("has-custom-background");
      }
    } else {
      if (media) {
        document.body.classList.add("has-custom-background");
      } else {
        document.body.classList.remove("has-custom-background");
      }
    }
  }

  function applyLogo(value) {
    const logo = value || "";

    document.querySelectorAll("[data-site-logo-fallback]").forEach(el => {
      el.hidden = true;
      el.style.display = "none";
      el.textContent = "";
    });

    document.querySelectorAll("[data-site-logo-img]").forEach(img => {
      const box = img.closest(".brand-box");

      if (!logo) {
        img.hidden = true;
        img.style.display = "none";
        img.removeAttribute("src");
        if (box) box.classList.remove("has-logo");
        return;
      }

      if (img.getAttribute("src") === logo) {
        if (img.complete && img.naturalWidth > 0) {
          img.hidden = false;
          img.style.display = "block";
          if (box) box.classList.add("has-logo");
        }
        return;
      }

      img.hidden = true;
      img.style.display = "none";

      img.onload = () => {
        img.hidden = false;
        img.style.display = "block";
        if (box) box.classList.add("has-logo");
      };

      img.onerror = () => {
        img.hidden = true;
        img.style.display = "none";
        img.removeAttribute("src");
        if (box) box.classList.remove("has-logo");
      };

      img.src = logo;

      if (img.complete && img.naturalWidth > 0) {
        img.onload();
      }
    });
  }


  function applyFavicon(value) {
    const icon = value || "";
    let link = document.querySelector("#siteFavicon");

    if (!link) {
      link = document.createElement("link");
      link.id = "siteFavicon";
      link.rel = "icon";
      document.head.appendChild(link);
    }

    if (icon) {
      link.href = icon;
    } else {
      link.removeAttribute("href");
    }
  }

  function readLogoCache() {
    try {
      return JSON.parse(localStorage.getItem(LOGO_CACHE_KEY) || "null") || {};
    } catch {
      return {};
    }
  }

  function saveLogoCache(logoImageData, faviconImageData) {
    try {
      localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify({
        logoImageData: logoImageData || "",
        faviconImageData: faviconImageData || ""
      }));
    } catch {}
  }


  function readBackgroundCache() {
    try {
      return JSON.parse(localStorage.getItem(BG_CACHE_KEY) || "null") || {};
    } catch {
      return {};
    }
  }

  function saveBackgroundCache(data = {}) {
    try {
      localStorage.setItem(BG_CACHE_KEY, JSON.stringify({
        backgroundImageData: data.backgroundImageData || "",
        backgroundMediaUrl: data.backgroundMediaUrl || "",
        backgroundBrightness: normalizeBrightness(data.backgroundBrightness),
        weatherEffect: normalizeWeatherEffect(data.weatherEffect)
      }));
    } catch {}
  }

  const cachedLogo = readLogoCache();
  if (cachedLogo.logoImageData) applyLogo(cachedLogo.logoImageData);
  if (cachedLogo.faviconImageData) applyFavicon(cachedLogo.faviconImageData);

  const cachedBackground = readBackgroundCache();
  if (cachedBackground.backgroundMediaUrl || cachedBackground.backgroundImageData) {
    backgroundOverride = cachedBackground.backgroundMediaUrl || cachedBackground.backgroundImageData || "";
    backgroundBrightness = normalizeBrightness(cachedBackground.backgroundBrightness);
    weatherEffectOverride = cachedBackground.weatherEffect
      ? normalizeWeatherEffect(cachedBackground.weatherEffect)
      : null;
    refreshBackground();
    refreshWeatherEffect();
  }

  db.collection("members").doc(SETTINGS_DOC).onSnapshot(doc => {
    const data = doc.exists ? doc.data() : DEFAULTS;
    applySettings(data);

    // Compatibility with V7 where background was stored in __site_settings.
    legacyBackground = data.backgroundMediaUrl || data.backgroundImageData || "";
    legacyBackgroundBrightness = normalizeBrightness(data.backgroundBrightness);
    legacyWeatherEffect = normalizeWeatherEffect(data.weatherEffect);
    if (backgroundOverride === null) {
      backgroundBrightness = legacyBackgroundBrightness;
    }
refreshBackground();
refreshWeatherEffect();
}, err => {
    console.warn("site settings:", err.message);
});

  db.collection("members").doc(BACKGROUND_DOC).onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data() || {};
      backgroundOverride = data.backgroundMediaUrl || data.backgroundImageData || "";
      backgroundBrightness = normalizeBrightness(data.backgroundBrightness);
      weatherEffectOverride = data.weatherEffect
        ? normalizeWeatherEffect(data.weatherEffect)
        : null;
      saveBackgroundCache({
        backgroundImageData: data.backgroundImageData || "",
        backgroundMediaUrl: data.backgroundMediaUrl || "",
        backgroundBrightness,
        weatherEffect: weatherEffectOverride || legacyWeatherEffect
      });
    } else {
      backgroundOverride = null;
      backgroundBrightness = legacyBackgroundBrightness;
      weatherEffectOverride = null;
    }
refreshBackground();
refreshWeatherEffect();
}, err => {
    console.warn("site background:", err.message);
    const cached = readBackgroundCache();
    if (cached.backgroundMediaUrl || cached.backgroundImageData) {
      backgroundOverride = cached.backgroundMediaUrl || cached.backgroundImageData || "";
      backgroundBrightness = normalizeBrightness(cached.backgroundBrightness);
      weatherEffectOverride = cached.weatherEffect ? normalizeWeatherEffect(cached.weatherEffect) : null;
      refreshBackground();
      refreshWeatherEffect();
    }
});

  db.collection("members").doc(LOGO_DOC).onSnapshot(doc => {
    const data = doc.exists ? doc.data() : {};
    const logoImageData = data.logoImageData || "";
    const faviconImageData = data.faviconImageData || "";
    saveLogoCache(logoImageData, faviconImageData);
    applyLogo(logoImageData);
    applyFavicon(faviconImageData);
  }, err => console.warn("site logo/favicon:", err.message));
})();
