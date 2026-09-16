const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);

// Search + filter
const cards = [...$$(".profile-card")];
const searchInput = $("#memberSearch");
const filters = [...$$(".filter")];
const memberCount = $("#memberCount");
const emptyState = $("#emptyState");
const rankBlocks = [...$$(".rank-block")];
let activeFilter = "all";

function updateCards(){
  if(!cards.length) return;

  const term = (searchInput?.value || "").trim().toLowerCase();
  let visible = 0;

  cards.forEach(card => {
    const name = (card.dataset.name || "").toLowerCase();
    const role = (card.dataset.role || "").toLowerCase();
    const title = (card.dataset.title || "").toLowerCase();

    const filterMatch = activeFilter === "all" || role === activeFilter;
    const searchMatch = !term || name.includes(term) || role.includes(term) || title.includes(term);
    const show = filterMatch && searchMatch;

    card.classList.toggle("hide", !show);
    if(show) visible++;
  });

  rankBlocks.forEach(block => {
    const blockCards = [...block.querySelectorAll(".profile-card")];
    const anyVisible = blockCards.some(card => !card.classList.contains("hide"));
    block.classList.toggle("hide-section", !anyVisible);
  });

  if(memberCount) memberCount.textContent = String(visible).padStart(2, "0");
  emptyState?.classList.toggle("show", visible === 0);
}

searchInput?.addEventListener("input", updateCards);
filters.forEach(btn => {
  btn.addEventListener("click", () => {
    filters.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    updateCards();
  });
});
updateCards();

// Popup
const profileOverlay = $("#profileOverlay");
const profileModal = $("#profileModal");
const profileClose = $("#profileClose");

function openProfile(card){
  const role = (card.dataset.role || "member").toUpperCase();
  const name = card.dataset.name || "MEMBER";
  const no = card.dataset.no || "00";
  const title = card.dataset.title || "House Member";
  const status = card.dataset.status || "ONLINE";
  const since = card.dataset.since || "";
  const access = card.dataset.access || "STANDARD ACCESS";
  const about = card.dataset.about || "";
  const facebook = card.dataset.facebook || "#";
  const discord = card.dataset.discord || "#";

  $("#modalRole").textContent = role;

  $("#modalAvatar").textContent = name === "TATAROS" ? "T" : no;
  $("#modalStatus").textContent = (status === "ONLINE" ? "● " : "○ ") + status;
  $("#modalName").textContent = name;
  $("#modalTitle").textContent = title;
  $("#modalAbout").textContent = about;
  $("#modalId").textContent = `TT-${no}`;
  $("#modalSince").textContent = since;
  $("#modalAccess").textContent = access;
  $("#modalFacebook").href = facebook;
  $("#modalDiscord").href = discord;

  profileOverlay.classList.add("show");
  profileModal.classList.add("show");
  profileModal.setAttribute("aria-hidden", "false");
}

function closeProfile(){
  profileOverlay?.classList.remove("show");
  profileModal?.classList.remove("show");
  profileModal?.setAttribute("aria-hidden", "true");
}

cards.forEach(card => {
  card.addEventListener("click", () => openProfile(card));
});

profileClose?.addEventListener("click", closeProfile);
profileOverlay?.addEventListener("click", closeProfile);

document.addEventListener("keydown", e => {
  if(e.key === "Escape") closeProfile();
});
