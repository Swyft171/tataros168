(() => {
  "use strict";

  const config = window.SWYFT_FIREBASE_CONFIG || {};
  if (!window.firebase || !config.apiKey || !config.projectId) return;

  if (!firebase.apps.length) firebase.initializeApp(config);
  const db = firebase.firestore();
  const PLAYER_STATE_KEY = "swyftMusicState";
  const PLAYER_COLLAPSED_KEY = "swyftMusicCollapsed";

  const ICONS = {
    previous: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 6l-9 6 9 6V6z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 6l9 6-9 6V6z"/></svg>',
    volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5.3a4 4 0 010 5.4M19 7a7 7 0 010 10"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm12 1l5 5m0-5l-5 5"/></svg>',
    collapse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9l5 5 5-5"/></svg>',
    expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 15l5-5 5 5"/></svg>'
  };

  const player = document.createElement("aside");
  player.className = "swyft-music-player";
  player.setAttribute("aria-label", "TATAROS music player");
  player.hidden = true;
  player.innerHTML = `
    <div class="player-light" aria-hidden="true"></div>
    <button class="player-collapse-button" type="button" aria-label="ย่อเครื่องเล่นเพลง" aria-expanded="true">${ICONS.collapse}</button>
    <div class="player-cover-wrap">
      <img class="player-cover" alt="" hidden>
      <span class="player-cover-fallback">♪</span>
      <span class="player-disc" aria-hidden="true"></span>
    </div>
    <div class="player-main">
      <div class="player-meta-row">
        <div class="player-meta">
          <span class="player-kicker">NOW PLAYING</span>
          <strong class="player-title">กำลังโหลดเพลง...</strong>
          <span class="player-artist">TATAROS</span>
        </div>
        <span class="player-output-icon" aria-hidden="true">†</span>
      </div>
      <div class="player-progress-row">
        <span class="player-time player-current">0:00</span>
        <input class="player-progress" type="range" min="0" max="1000" value="0" aria-label="ตำแหน่งเพลง">
        <span class="player-time player-end">0:00</span>
      </div>
      <div class="player-controls-row">
        <div class="player-transport">
          <button class="player-button player-previous" type="button" aria-label="เพลงก่อนหน้า">${ICONS.previous}</button>
          <button class="player-button player-play" type="button" aria-label="เล่นเพลง">${ICONS.play}</button>
          <button class="player-button player-next" type="button" aria-label="เพลงถัดไป">${ICONS.next}</button>
        </div>
        <div class="player-volume-wrap">
          <button class="player-volume-button" type="button" aria-label="ปิดเสียง">${ICONS.volume}</button>
          <input class="player-volume" type="range" min="0" max="100" value="72" aria-label="ระดับเสียง">
          <span class="player-volume-high" aria-hidden="true">${ICONS.volume}</span>
        </div>
      </div>
      <span class="player-status" role="status" aria-live="polite"></span>
    </div>
    <span class="player-home-indicator" aria-hidden="true"></span>
  `;

  const audio = document.createElement("audio");
  audio.preload = "metadata";
  audio.autoplay = false;
  audio.setAttribute("aria-hidden", "true");
  player.appendChild(audio);
  document.body.appendChild(player);

  const $ = selector => player.querySelector(selector);
  const cover = $(".player-cover");
  const coverFallback = $(".player-cover-fallback");
  const title = $(".player-title");
  const artist = $(".player-artist");
  const currentLabel = $(".player-current");
  const endLabel = $(".player-end");
  const progress = $(".player-progress");
  const playButton = $(".player-play");
  const previousButton = $(".player-previous");
  const nextButton = $(".player-next");
  const volumeButton = $(".player-volume-button");
  const volume = $(".player-volume");
  const status = $(".player-status");
  const collapseButton = $(".player-collapse-button");

  let tracks = [];
  let currentIndex = 0;
  let pendingSeek = null;
  let seeking = false;
  let advancing = false;
  let lastSavedSecond = -1;
  let autoplayUnlockArmed = false;
  let lastCoverSource = "";
  let coverRequestId = 0;

  function readCollapsedPreference() {
    try {
      return localStorage.getItem(PLAYER_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  }

  function setCollapsed(collapsed, persist = true) {
    player.classList.toggle("is-collapsed", collapsed);
    document.body.classList.toggle("music-player-collapsed", collapsed);
    collapseButton.innerHTML = collapsed ? ICONS.expand : ICONS.collapse;
    collapseButton.setAttribute("aria-expanded", String(!collapsed));
    collapseButton.setAttribute("aria-label", collapsed ? "ขยายเครื่องเล่นเพลง" : "ย่อเครื่องเล่นเพลง");
    if (persist) {
      try { localStorage.setItem(PLAYER_COLLAPSED_KEY, collapsed ? "1" : "0"); } catch {}
    }
  }

  collapseButton.addEventListener("click", event => {
    event.stopPropagation();
    setCollapsed(!player.classList.contains("is-collapsed"));
  });

  setCollapsed(readCollapsedPreference(), false);

  function clearAutoplayUnlock() {
    if (!autoplayUnlockArmed) return;
    autoplayUnlockArmed = false;
    document.removeEventListener("click", resumeAfterInteraction);
    document.removeEventListener("touchend", resumeAfterInteraction);
    document.removeEventListener("keydown", resumeAfterInteraction);
  }

  function resumeAfterInteraction() {
    clearAutoplayUnlock();
    if (audio.paused) playAudio();
  }

  function armAutoplayUnlock() {
    if (autoplayUnlockArmed) return;
    autoplayUnlockArmed = true;
    document.addEventListener("click", resumeAfterInteraction, { once: true });
    document.addEventListener("touchend", resumeAfterInteraction, { once: true });
    document.addEventListener("keydown", resumeAfterInteraction, { once: true });
  }

  function safeMediaUrl(value) {
    const raw = String(value || "").trim().replace(/&&+/g, "&");
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.href);
      if (/^(www\.)?dropbox\.com$/i.test(url.hostname)) {
        url.searchParams.delete("dl");
        url.searchParams.delete("st");
        url.searchParams.set("raw", "1");
        return url.href;
      }
      if (["http:", "https:", "data:", "blob:"].includes(url.protocol)) return url.href;
    } catch {}
    return "";
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const total = Math.floor(value);
    const minutes = Math.floor(total / 60);
    const seconds = String(total % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function activeTrack() {
    return tracks[currentIndex] || null;
  }

  function segmentStart(track = activeTrack()) {
    return Math.max(0, number(track?.startTime, 0));
  }

  function segmentEnd(track = activeTrack()) {
    const start = segmentStart(track);
    const savedEnd = number(track?.endTime, 0);
    if (savedEnd > start) return savedEnd;
    if (Number.isFinite(audio.duration) && audio.duration > start) return audio.duration;
    return start;
  }

  function readSavedState() {
    try {
      const persistent = localStorage.getItem(PLAYER_STATE_KEY);
      const legacy = sessionStorage.getItem(PLAYER_STATE_KEY);
      return JSON.parse(persistent || legacy || "null") || {};
    } catch {
      return {};
    }
  }

  function saveState(force = false) {
    const track = activeTrack();
    if (!track) return;
    const second = Math.floor(audio.currentTime || segmentStart(track));
    if (!force && second === lastSavedSecond) return;
    lastSavedSecond = second;
    const savedTrack = {
      trackId: track.id,
      currentTime: audio.currentTime || segmentStart(track),
      title: track.title || "UNTITLED TRACK",
      artist: track.artist || "TATAROS",
      audioUrl: safeMediaUrl(track.audioUrl),
      coverUrl: lastCoverSource || safeMediaUrl(track.coverUrl) || safeMediaUrl(readSavedState().coverUrl),
      startTime: segmentStart(track),
      endTime: number(track.endTime, 0)
    };

    try {
      const serialized = JSON.stringify(savedTrack);
      localStorage.setItem(PLAYER_STATE_KEY, serialized);
      sessionStorage.setItem(PLAYER_STATE_KEY, serialized);
    } catch {
      // A very large data-URL cover can exceed the browser storage quota.
      // Preserve the song and playback position even if the cover cannot be cached.
      try {
        savedTrack.coverUrl = "";
        const serialized = JSON.stringify(savedTrack);
        localStorage.setItem(PLAYER_STATE_KEY, serialized);
        sessionStorage.setItem(PLAYER_STATE_KEY, serialized);
      } catch {}
    }
  }

  function setStatus(message = "") {
    status.textContent = message;
    player.classList.toggle("has-player-status", Boolean(message));
  }

  function updatePlayState() {
    const playing = !audio.paused && !audio.ended;
    player.classList.toggle("is-playing", playing);
    playButton.innerHTML = playing ? ICONS.pause : ICONS.play;
    playButton.setAttribute("aria-label", playing ? "หยุดเพลงชั่วคราว" : "เล่นเพลง");
  }

  function updateVolumeUi() {
    const muted = audio.muted || audio.volume === 0;
    volumeButton.innerHTML = muted ? ICONS.muted : ICONS.volume;
    volumeButton.setAttribute("aria-label", muted ? "เปิดเสียง" : "ปิดเสียง");
    player.style.setProperty("--player-volume", `${Math.round((muted ? 0 : audio.volume) * 100)}%`);
  }

  function updateProgress() {
    const start = segmentStart();
    const end = segmentEnd();
    const duration = Math.max(0.01, end - start);
    const current = Math.min(end, Math.max(start, audio.currentTime || start));
    const ratio = Math.min(1, Math.max(0, (current - start) / duration));

    if (!seeking) progress.value = String(Math.round(ratio * 1000));
    progress.style.setProperty("--player-progress", `${ratio * 100}%`);
    currentLabel.textContent = formatTime(Math.max(0, current - start));
    endLabel.textContent = formatTime(duration);
  }

  function renderCover(track) {
    const requestedSource = safeMediaUrl(track?.coverUrl);
    const cachedSource = safeMediaUrl(readSavedState().coverUrl);
    const source = requestedSource || lastCoverSource || cachedSource;
    const coverWrap = cover.closest(".player-cover-wrap");
    const requestId = ++coverRequestId;
    coverFallback.textContent = "†";

    if (!source) {
      coverWrap?.classList.remove("is-cover-loading");
      if (cover.complete && cover.naturalWidth > 0 && cover.getAttribute("src")) {
        cover.hidden = false;
        coverFallback.hidden = true;
      } else {
        cover.hidden = true;
        coverFallback.hidden = false;
      }
      return;
    }

    if (cover.dataset.source === source && cover.getAttribute("src")) {
      if (cover.complete && cover.naturalWidth > 0) {
        cover.hidden = false;
        coverFallback.hidden = true;
        coverWrap?.classList.remove("is-cover-loading");
      }
      return;
    }

    coverFallback.hidden = true;
    coverWrap?.classList.add("is-cover-loading");

    const loader = new Image();
    loader.onload = () => {
      if (requestId !== coverRequestId) return;
      cover.src = source;
      cover.dataset.source = source;
      cover.hidden = false;
      coverFallback.hidden = true;
      coverWrap?.classList.remove("is-cover-loading");
      lastCoverSource = source;
      saveState(true);
    };
    loader.onerror = () => {
      if (requestId !== coverRequestId) return;
      coverWrap?.classList.remove("is-cover-loading");
      if (cover.complete && cover.naturalWidth > 0 && cover.getAttribute("src")) {
        cover.hidden = false;
        coverFallback.hidden = true;
      } else {
        cover.hidden = true;
        coverFallback.hidden = false;
      }
    };
    loader.src = source;
  }

  function renderTrack(track) {
    title.textContent = track?.title || "UNTITLED TRACK";
    artist.textContent = track?.artist || "TATAROS";
    renderCover(track);
    updateProgress();
  }

  function loadTrack(index, options = {}) {
    if (!tracks.length) return;

    const shouldPlay = options.play === true;
    currentIndex = (index + tracks.length) % tracks.length;
    const track = activeTrack();
    const source = safeMediaUrl(track.audioUrl);

    audio.pause();
    advancing = false;
    pendingSeek = Number.isFinite(options.seek) ? options.seek : segmentStart(track);
    if (!source) {
      audio.removeAttribute("src");
      renderTrack(track);
      setStatus("ไม่พบไฟล์เสียงของเพลงนี้");
      return;
    }
    audio.src = source;
    audio.load();
    renderTrack(track);
    setStatus("");
    saveState(true);

    if (shouldPlay && source) {
      const playWhenReady = () => {
        audio.removeEventListener("canplay", playWhenReady);
        playAudio();
      };
      audio.addEventListener("canplay", playWhenReady);
    }
  }

  async function playAudio() {
    if (window.SWYFT_CONTROL?.showMusic === false || window.SwyftEntry?.active) return;
    if (!activeTrack() || !audio.src) return;
    const start = segmentStart();
    const end = segmentEnd();
    if (!Number.isFinite(audio.currentTime) || audio.currentTime < start || (end > start && audio.currentTime >= end)) {
      audio.currentTime = start;
    }
    try {
      await audio.play();
      clearAutoplayUnlock();
      setStatus("");
    } catch {
      setStatus("แตะที่หน้าเว็บเพื่อเริ่มเพลง");
      armAutoplayUnlock();
    }
  }

  function togglePlay() {
    if (audio.paused) playAudio();
    else audio.pause();
  }

  function advance(step, autoplay = !audio.paused) {
    if (!tracks.length || advancing) return;

    if (tracks.length === 1) {
      advancing = true;
      audio.currentTime = segmentStart();
      updateProgress();
      saveState(true);
      advancing = false;
      if (autoplay) playAudio();
      else audio.pause();
      return;
    }

    advancing = true;
    loadTrack(currentIndex + step, { play: autoplay });
  }

  playButton.addEventListener("click", togglePlay);
  nextButton.addEventListener("click", () => advance(1, !audio.paused));
  previousButton.addEventListener("click", () => {
    const start = segmentStart();
    if (audio.currentTime > start + 3) {
      audio.currentTime = start;
      updateProgress();
      return;
    }
    advance(-1, !audio.paused);
  });

  progress.addEventListener("input", () => {
    seeking = true;
    const ratio = number(progress.value) / 1000;
    progress.style.setProperty("--player-progress", `${ratio * 100}%`);
    const start = segmentStart();
    const end = segmentEnd();
    currentLabel.textContent = formatTime(Math.max(0, (end - start) * ratio));
  });

  progress.addEventListener("change", () => {
    const start = segmentStart();
    const end = segmentEnd();
    audio.currentTime = start + ((end - start) * number(progress.value) / 1000);
    seeking = false;
    updateProgress();
    saveState(true);
  });

  volume.addEventListener("input", () => {
    audio.muted = false;
    audio.volume = number(volume.value, 72) / 100;
    try { localStorage.setItem("swyftMusicVolume", String(audio.volume)); } catch {}
    updateVolumeUi();
  });

  volumeButton.addEventListener("click", () => {
    audio.muted = !audio.muted;
    updateVolumeUi();
  });

  audio.addEventListener("loadedmetadata", () => {
    const start = segmentStart();
    const end = segmentEnd();
    const requested = Number.isFinite(pendingSeek) ? pendingSeek : start;
    audio.currentTime = Math.min(end || audio.duration || requested, Math.max(start, requested));
    pendingSeek = null;
    updateProgress();
  });

  audio.addEventListener("timeupdate", () => {
    updateProgress();
    saveState();
    const end = segmentEnd();
    if (!audio.paused && end > segmentStart() && audio.currentTime >= end - 0.08) {
      advance(1, true);
    }
  });

  audio.addEventListener("play", updatePlayState);
  audio.addEventListener("pause", updatePlayState);
  audio.addEventListener("ended", () => advance(1, true));
  audio.addEventListener("error", () => {
    setStatus("โหลดเพลงไม่สำเร็จ กรุณาตรวจสอบว่า AUDIO URL เป็นลิงก์ไฟล์เสียงโดยตรง");
    updatePlayState();
  });

  window.addEventListener("pagehide", () => saveState(true));

  try {
    const savedVolume = localStorage.getItem("swyftMusicVolume");
    const storedVolume = savedVolume === null ? (window.SWYFT_CONTROL?.musicVolume ?? 72) / 100 : number(savedVolume, 0.72);
    audio.volume = Math.min(1, Math.max(0, storedVolume));
    volume.value = String(Math.round(audio.volume * 100));
  } catch {
    audio.volume = 0.72;
  }
  updateVolumeUi();

  function applyControlPreferences() {
    if (window.SWYFT_CONTROL?.showMusic === false) {audio.pause();clearAutoplayUnlock();}
    try {
      if (localStorage.getItem('swyftMusicVolume') === null) {
        audio.volume = Math.max(0, Math.min(1, (window.SWYFT_CONTROL?.musicVolume ?? 72) / 100));
        volume.value = String(Math.round(audio.volume * 100));
        updateVolumeUi();
      }
    } catch {}
  }
  window.addEventListener('swyft:control', applyControlPreferences);
  window.addEventListener('swyft:entry-ready', () => {if(window.SWYFT_CONTROL?.showMusic !== false)playAudio();});
  applyControlPreferences();

  db.collection("tracks")
    .orderBy("order", "asc")
    .onSnapshot(snapshot => {
      const previousId = activeTrack()?.id;
      const saved = readSavedState();
      tracks = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(track => track.enabled !== false && safeMediaUrl(track.audioUrl));

      if (!tracks.length) {
        audio.pause();
        player.hidden = true;
        document.body.classList.remove("music-player-ready");
        return;
      }

      player.hidden = false;
      requestAnimationFrame(() => document.body.classList.add("music-player-ready"));

      const wantedId = previousId || saved.trackId;
      const wantedIndex = Math.max(0, tracks.findIndex(track => track.id === wantedId));
      const currentStillLoaded = previousId && tracks[wantedIndex]?.id === previousId && audio.src;

      if (currentStillLoaded) {
        currentIndex = wantedIndex;
        renderTrack(activeTrack());
        saveState(true);
      } else {
        const seek = tracks[wantedIndex]?.id === saved.trackId ? number(saved.currentTime, segmentStart(tracks[wantedIndex])) : segmentStart(tracks[wantedIndex]);
        loadTrack(wantedIndex, { seek, play: true });
      }
    }, error => {
      console.warn("music player:", error.message);
      if (!tracks.length) player.hidden = true;
    });

  const cached = readSavedState();
  const cachedAudioUrl = safeMediaUrl(cached.audioUrl);
  if (cachedAudioUrl) {
    tracks = [{
      id: String(cached.trackId || "cached-track"),
      title: cached.title || "UNTITLED TRACK",
      artist: cached.artist || "TATAROS",
      audioUrl: cachedAudioUrl,
      coverUrl: safeMediaUrl(cached.coverUrl),
      startTime: number(cached.startTime, 0),
      endTime: number(cached.endTime, 0),
      enabled: true
    }];
    player.hidden = false;
    requestAnimationFrame(() => document.body.classList.add("music-player-ready"));
    loadTrack(0, {
      seek: number(cached.currentTime, segmentStart(tracks[0])),
      play: true
    });
  }
})();
