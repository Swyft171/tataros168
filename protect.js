(() => {
  document.documentElement.classList.add("copy-guard");

  document.addEventListener("contextmenu", e => {
    if (!e.target.closest("input, textarea")) e.preventDefault();
  });

  document.addEventListener("dragstart", e => {
    if (e.target.closest("img, a")) e.preventDefault();
  });

  document.addEventListener("keydown", e => {
    const key = String(e.key || "").toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;

    const blocked =
      e.key === "F12" ||
      (ctrl && key === "u") ||
      (ctrl && key === "s") ||
      (ctrl && e.shiftKey && ["i", "j", "c"].includes(key));

    if (blocked) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();
