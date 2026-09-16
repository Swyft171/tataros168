(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const config = window.SWYFT_FIREBASE_CONFIG || {};
  if (!window.firebase || !config.apiKey || !config.projectId || !$("#trackForm")) return;

  if (!firebase.apps.length) firebase.initializeApp(config);
  const auth = firebase.auth();
  const db = firebase.firestore();

  const form = $("#trackForm");
  const docId = $("#trackDocId");
  const titleInput = $("#trackTitle");
  const artistInput = $("#trackArtist");
  const orderInput = $("#trackOrder");
  const enabledInput = $("#trackEnabled");
  const audioFileInput = $("#trackAudioFile");
  const audioUrlInput = $("#trackAudioUrl");
  const audioFileName = $("#trackAudioFileName");
  const coverFileInput = $("#trackCoverFile");
  const coverUrlInput = $("#trackCoverUrl");
  const coverImage = $("#trackCoverPreviewImage");
  const coverFallback = $("#trackCoverFallback");
  const previewAudio = $("#trackPreviewAudio");
  const startInput = $("#trackStart");
  const endInput = $("#trackEnd");
  const startRange = $("#trackStartRange");
  const endRange = $("#trackEndRange");
  const durationLabel = $("#trackDurationLabel");
  const setStartButton = $("#setTrackStartBtn");
  const setEndButton = $("#setTrackEndBtn");
  const previewClipButton = $("#previewClipBtn");
  const saveButton = $("#saveTrackBtn");
  const cancelButton = $("#cancelTrackEditBtn");
  const messageBox = $("#trackFormMessage");
  const progressWrap = $("#trackUploadProgress");
  const progressFill = $("#trackUploadProgressFill");
  const progressText = $("#trackUploadProgressText");
  const list = $("#adminTrackList");
  const count = $("#adminTrackCount");
  const empty = $("#adminTrackEmpty");

  let tracks = [];
  let editingTrack = null;
  let pendingCoverData = "";
  let unsubscribeTracks = null;
  let clipPreviewActive = false;

  function message(text, type = "") {
    const raw = String(text || "");
    const friendly = /missing or insufficient permissions|permission-denied/i.test(raw)
      ? "Firestore ยังไม่อนุญาตสิทธิ์เขียน — ไปที่ Firestore Database > Rules แล้ววาง firestore.rules จาก ZIP นี้ จากนั้นกด Publish (ไม่ต้องเปิด Storage / Blaze)"
      : raw;
    messageBox.textContent = friendly;
    messageBox.className = "admin-message" + (type ? ` ${type}` : "");
  }

  function isAdmin(user) {
    const allowed = String(window.SWYFT_ADMIN_EMAIL || "").trim().toLowerCase();
    return Boolean(user?.email && allowed && user.email.toLowerCase() === allowed);
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function cleanUrl(value, allowData = false) {
    const raw = String(value || "").trim().replace(/&&+/g, "&");
    if (!raw) return "";
    if (allowData && /^data:image\//i.test(raw)) return raw;
    try {
      const url = new URL(raw, window.location.href);
      if (/^(www\.)?dropbox\.com$/i.test(url.hostname)) {
        url.searchParams.delete("dl");
        url.searchParams.delete("st");
        url.searchParams.set("raw", "1");
        return url.href;
      }
      return ["http:", "https:", "blob:", ...(allowData ? ["data:"] : [])].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return "00:00";
    const total = Math.floor(value);
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function setProgress(percent, text) {
    progressWrap.hidden = false;
    progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    progressText.textContent = text;
  }

  function hideProgressLater() {
    setTimeout(() => {
      progressWrap.hidden = true;
      progressFill.style.width = "0%";
    }, 600);
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("อ่านรูปปกไม่สำเร็จ")); };
      img.src = url;
    });
  }

  async function compressCover(file) {
    if (!file) return "";
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type || "")) throw new Error("รูปปกรองรับ JPG / PNG / WEBP");
    if (file.size > 10 * 1024 * 1024) throw new Error("รูปปกต้นฉบับใหญ่เกิน 10MB");

    const img = await loadImage(file);
    const max = 700;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = .78;
    let data = canvas.toDataURL("image/jpeg", quality);
    while (data.length > 300000 && quality > .35) {
      quality -= .07;
      data = canvas.toDataURL("image/jpeg", quality);
    }
    if (data.length > 360000) throw new Error("รูปปกยังใหญ่เกินไป กรุณาใช้รูปที่เล็กลงหรือ Cover URL");
    return data;
  }

  function setCoverPreview(source) {
    coverImage.hidden = true;
    coverImage.removeAttribute("src");
    coverFallback.hidden = false;
    const url = cleanUrl(source, true);
    if (!url) return;
    coverImage.onload = () => { coverImage.hidden = false; coverFallback.hidden = true; };
    coverImage.onerror = () => { coverImage.hidden = true; coverFallback.hidden = false; };
    coverImage.src = url;
  }

  function loadAudioPreview() {
    clipPreviewActive = false;
    previewAudio.pause();
    const source = cleanUrl(audioUrlInput.value) || cleanUrl(editingTrack?.audioUrl);
    if (!source) {
      previewAudio.removeAttribute("src");
      previewAudio.load();
      durationLabel.textContent = "00:00";
      return;
    }
    previewAudio.src = source;
    previewAudio.load();
  }

  function duration() {
    return Number.isFinite(previewAudio.duration) && previewAudio.duration > 0
      ? previewAudio.duration
      : Math.max(number(endInput.value, 0), 100);
  }

  function normalizeClipInputs(changed = "") {
    const max = Math.max(0.1, duration());
    let start = Math.min(max, Math.max(0, number(startInput.value, 0)));
    let end = endInput.value === "" ? max : Math.min(max, Math.max(0, number(endInput.value, max)));
    if (end <= start) {
      if (changed === "start") end = Math.min(max, start + 0.1);
      else start = Math.max(0, end - 0.1);
    }
    startInput.value = String(Math.round(start * 10) / 10);
    if (endInput.value !== "" || changed) endInput.value = String(Math.round(end * 10) / 10);
    startRange.max = String(max);
    endRange.max = String(max);
    startRange.value = String(start);
    endRange.value = String(end);
    durationLabel.textContent = formatTime(max);
  }

  function renderTracks() {
    list.innerHTML = "";
    count.textContent = String(tracks.length).padStart(2, "0");
    empty.classList.toggle("show", tracks.length === 0);

    tracks.forEach((track, index) => {
      const row = document.createElement("article");
      row.className = "admin-track-row";
      if (track.enabled === false) row.classList.add("is-hidden-track");

      const coverBox = document.createElement("div");
      coverBox.className = "admin-track-cover";
      const coverUrl = cleanUrl(track.coverUrl, true);
      if (coverUrl) {
        const image = document.createElement("img");
        image.src = coverUrl;
        image.alt = "";
        image.onerror = () => { image.remove(); coverBox.textContent = "♪"; };
        coverBox.appendChild(image);
      } else coverBox.textContent = "♪";

      const info = document.createElement("div");
      info.className = "admin-track-info";
      const heading = document.createElement("b");
      heading.textContent = track.title || "UNTITLED TRACK";
      const sub = document.createElement("span");
      sub.textContent = track.artist || "TATAROS";
      const clip = document.createElement("small");
      const start = Math.max(0, number(track.startTime, 0));
      const end = number(track.endTime, 0);
      clip.textContent = `${String(index + 1).padStart(2, "0")} · ${formatTime(start)} → ${end > start ? formatTime(end) : "END"}`;
      info.append(heading, sub, clip);

      const badge = document.createElement("span");
      badge.className = `track-visibility ${track.enabled === false ? "is-hidden" : "is-live"}`;
      badge.textContent = track.enabled === false ? "HIDDEN" : "LIVE";

      const actions = document.createElement("div");
      actions.className = "admin-track-actions";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "small-action visibility-action";
      toggle.textContent = track.enabled === false ? "◉" : "◌";
      toggle.addEventListener("click", () => toggleTrack(track));
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "small-action";
      edit.textContent = "✎";
      edit.addEventListener("click", () => editTrack(track));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "small-action delete";
      remove.textContent = "×";
      remove.addEventListener("click", () => deleteTrack(track));
      actions.append(toggle, edit, remove);
      row.append(coverBox, info, badge, actions);
      list.appendChild(row);
    });
  }

  function resetForm() {
    previewAudio.pause();
    editingTrack = null;
    pendingCoverData = "";
    form.reset();
    docId.value = "";
    orderInput.value = "100";
    enabledInput.value = "true";
    startInput.value = "0";
    endInput.value = "";
    startRange.max = "100";
    endRange.max = "100";
    startRange.value = "0";
    endRange.value = "100";
    audioFileName.textContent = "FREE MODE: ใช้ Audio URL โดยตรง (ไม่ใช้ Firebase Storage)";
    saveButton.textContent = "SAVE TRACK";
    cancelButton.hidden = true;
    setCoverPreview("");
    previewAudio.removeAttribute("src");
    previewAudio.load();
    durationLabel.textContent = "00:00";
    progressWrap.hidden = true;
    message("");
  }

  function editTrack(track) {
    previewAudio.pause();
    editingTrack = track;
    pendingCoverData = "";
    docId.value = track.id;
    titleInput.value = track.title || "";
    artistInput.value = track.artist || "";
    orderInput.value = Number.isFinite(Number(track.order)) ? Number(track.order) : 100;
    enabledInput.value = track.enabled === false ? "false" : "true";
    audioUrlInput.value = track.audioUrl || "";
    coverUrlInput.value = /^data:image\//i.test(track.coverUrl || "") ? "" : (track.coverUrl || "");
    startInput.value = String(Math.max(0, number(track.startTime, 0)));
    endInput.value = number(track.endTime, 0) > number(track.startTime, 0) ? String(number(track.endTime)) : "";
    audioFileName.textContent = "FREE MODE: ใช้ Audio URL ที่บันทึกไว้";
    saveButton.textContent = "UPDATE TRACK";
    cancelButton.hidden = false;
    setCoverPreview(track.coverUrl || "");
    loadAudioPreview();
    message("กำลังแก้ไขเพลงนี้", "success");
    $("#musicManagerCard")?.scrollIntoView({behavior:"smooth", block:"start"});
  }

  async function toggleTrack(track) {
    try {
      await db.collection("tracks").doc(track.id).update({
        enabled: track.enabled === false,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) { message(error.message, "error"); }
  }

  async function deleteTrack(track) {
    if (!confirm(`ลบเพลง ${track.title || "นี้"} ใช่ไหม?`)) return;
    try {
      await db.collection("tracks").doc(track.id).delete();
      if (editingTrack?.id === track.id) resetForm();
      message("ลบเพลงเรียบร้อย", "success");
    } catch (error) { message(error.message, "error"); }
  }

  if (audioFileInput) {
    audioFileInput.disabled = true;
    audioFileInput.addEventListener("change", () => {
      audioFileInput.value = "";
      message("FREE MODE ไม่ใช้ Firebase Storage — กรุณาใส่ Audio URL แทน", "error");
    });
  }

  audioUrlInput.addEventListener("change", loadAudioPreview);
  audioUrlInput.addEventListener("input", () => {
    if (audioUrlInput.value.trim()) audioFileName.textContent = "ใช้ Audio URL — ไม่เสียค่า Firebase Storage";
  });

  coverFileInput.addEventListener("change", async () => {
    const file = coverFileInput.files[0];
    if (!file) return;
    try {
      setProgress(25, "Compressing cover...");
      pendingCoverData = await compressCover(file);
      coverUrlInput.value = "";
      setCoverPreview(pendingCoverData);
      setProgress(100, "Cover ready — saved in Firestore");
      message("รูปปกพร้อมแล้ว จะเก็บใน Firestore โดยตรง", "success");
      hideProgressLater();
    } catch (error) {
      pendingCoverData = "";
      coverFileInput.value = "";
      progressWrap.hidden = true;
      message(error.message, "error");
    }
  });

  coverUrlInput.addEventListener("input", () => {
    if (coverUrlInput.value.trim()) {
      pendingCoverData = "";
      coverFileInput.value = "";
      setCoverPreview(coverUrlInput.value);
    } else if (!pendingCoverData) setCoverPreview(editingTrack?.coverUrl || "");
  });

  previewAudio.addEventListener("loadedmetadata", () => {
    normalizeClipInputs();
    const start = Math.max(0, number(startInput.value, 0));
    if (Number.isFinite(start) && start < previewAudio.duration) previewAudio.currentTime = start;
  });
  previewAudio.addEventListener("timeupdate", () => {
    if (!clipPreviewActive) return;
    const end = number(endInput.value, previewAudio.duration);
    if (end > 0 && previewAudio.currentTime >= end - 0.05) {
      previewAudio.pause();
      clipPreviewActive = false;
      previewAudio.currentTime = Math.max(0, number(startInput.value, 0));
    }
  });

  startInput.addEventListener("input", () => normalizeClipInputs("start"));
  endInput.addEventListener("input", () => normalizeClipInputs("end"));
  startRange.addEventListener("input", () => { startInput.value = startRange.value; normalizeClipInputs("start"); });
  endRange.addEventListener("input", () => { endInput.value = endRange.value; normalizeClipInputs("end"); });
  setStartButton.addEventListener("click", () => { startInput.value = String(Math.round((previewAudio.currentTime || 0) * 10) / 10); normalizeClipInputs("start"); });
  setEndButton.addEventListener("click", () => { endInput.value = String(Math.round((previewAudio.currentTime || 0) * 10) / 10); normalizeClipInputs("end"); });

  previewClipButton.addEventListener("click", async () => {
    if (!previewAudio.src) { message("กรุณาใส่ Audio URL ก่อน", "error"); return; }
    const start = Math.max(0, number(startInput.value, 0));
    const end = number(endInput.value, previewAudio.duration);
    if (end <= start) { message("เวลาจบต้องมากกว่าเวลาเริ่ม", "error"); return; }
    previewAudio.currentTime = start;
    clipPreviewActive = true;
    try {
      await previewAudio.play();
      message(`กำลังเล่นท่อน ${formatTime(start)} → ${formatTime(end)}`, "success");
    } catch { message("Browser ไม่สามารถเล่น URL นี้ได้ ตรวจว่าเป็นลิงก์ไฟล์เสียงโดยตรง", "error"); }
  });

  cancelButton.addEventListener("click", resetForm);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const audioUrl = cleanUrl(audioUrlInput.value) || cleanUrl(editingTrack?.audioUrl);
    if (!title) { message("กรุณาใส่ชื่อเพลง", "error"); return; }
    if (!audioUrl) { message("กรุณาใส่ Audio URL โดยตรง", "error"); return; }

    const startTime = Math.max(0, number(startInput.value, 0));
    const endTime = endInput.value === "" ? 0 : Math.max(0, number(endInput.value, 0));
    if (endTime && endTime <= startTime) { message("เวลาจบต้องมากกว่าเวลาเริ่ม", "error"); return; }

    const directCover = cleanUrl(coverUrlInput.value, true);
    const coverUrl = pendingCoverData || directCover || editingTrack?.coverUrl || "";

    saveButton.disabled = true;
    cancelButton.disabled = true;
    setProgress(30, "Saving to Firestore...");
    try {
      const data = {
        title,
        artist: artistInput.value.trim(),
        order: number(orderInput.value, 100),
        enabled: enabledInput.value !== "false",
        audioUrl,
        audioPath: "",
        coverUrl,
        coverPath: "",
        startTime,
        endTime,
        storageMode: "firestore-url",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (editingTrack) await db.collection("tracks").doc(editingTrack.id).update(data);
      else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("tracks").add(data);
      }
      setProgress(100, "Track saved");
      message(editingTrack ? "อัปเดตเพลงเรียบร้อย — ไม่ใช้ Firebase Storage" : "เพิ่มเพลงเรียบร้อย — ไม่ใช้ Firebase Storage", "success");
      hideProgressLater();
      setTimeout(resetForm, 550);
    } catch (error) {
      progressWrap.hidden = true;
      message(error.message || "บันทึกเพลงไม่สำเร็จ", "error");
    } finally {
      saveButton.disabled = false;
      cancelButton.disabled = false;
    }
  });

  auth.onAuthStateChanged(user => {
    if (!isAdmin(user)) {
      if (unsubscribeTracks) unsubscribeTracks();
      unsubscribeTracks = null;
      return;
    }
    if (unsubscribeTracks) unsubscribeTracks();
    unsubscribeTracks = db.collection("tracks").orderBy("order", "asc").onSnapshot(snapshot => {
      tracks = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      renderTracks();
    }, error => message(error.message, "error"));
  });

  resetForm();
})();
