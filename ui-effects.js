(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body;

  try {
    if (sessionStorage.getItem("swyftPageTransition") === "zoom") {
      body.classList.add("page-arrive-zoom");
      sessionStorage.removeItem("swyftPageTransition");
    }
  } catch {}

  requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add("site-motion-ready")));

  function isInternalPageLink(anchor) {
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
    if (anchor.href.includes("#") && anchor.pathname === location.pathname) return false;
    try {
      const url = new URL(anchor.href, location.href);
      return url.origin === location.origin && /\.(html)?$|\/$/.test(url.pathname);
    } catch {
      return false;
    }
  }

  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest("a");
    if (!isInternalPageLink(anchor)) return;

    const destination = new URL(anchor.href, location.href);
    if (destination.href === location.href) return;

    event.preventDefault();
    body.classList.add("site-leaving");
    try { sessionStorage.setItem("swyftPageTransition", "zoom"); } catch {}
    window.setTimeout(() => { location.href = destination.href; }, reducedMotion ? 80 : 520);
  });

  if (!reducedMotion) {
    const setPointer = event => {
      const intensity = (window.SWYFT_CONTROL?.motionIntensity ?? 100) / 100;
      const x = (event.clientX / Math.max(1, innerWidth) - 0.5) * 2 * intensity;
      const y = (event.clientY / Math.max(1, innerHeight) - 0.5) * 2 * intensity;
      body.style.setProperty("--pointer-x", x.toFixed(3));
      body.style.setProperty("--pointer-y", y.toFixed(3));
    };
    window.addEventListener("pointermove", setPointer, { passive: true });

    let scrollTick = false;
    const updateScrollZoom = () => {
      const zoom = Math.min(1, window.scrollY / Math.max(500, innerHeight)) * ((window.SWYFT_CONTROL?.motionIntensity ?? 100) / 100);
      body.style.setProperty("--scroll-zoom", zoom.toFixed(3));
      scrollTick = false;
    };
    window.addEventListener("scroll", () => {
      if (!scrollTick) {
        scrollTick = true;
        requestAnimationFrame(updateScrollZoom);
      }
    }, { passive: true });
    updateScrollZoom();
  }

  const observed = new WeakSet();
  const observer = "IntersectionObserver" in window && !reducedMotion
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("motion-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6%" })
    : null;

  function registerReveal(root = document) {
    root.querySelectorAll?.(".tactical-hero, .tactical-toolbar, .rank-block, .profile-card").forEach((element, index) => {
      if (observed.has(element)) return;
      observed.add(element);
      element.classList.add("motion-reveal");
      element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 55}ms`);
      if (observer) observer.observe(element);
      else element.classList.add("motion-visible");
    });
  }

  registerReveal();
  const mutations = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.matches?.(".profile-card, .rank-block")) registerReveal(node.parentElement || document);
      else registerReveal(node);
    }));
  });
  mutations.observe(document.body, { childList: true, subtree: true });

  function initWeatherAtmosphere() {
    const canvas = document.createElement("canvas");
    canvas.className = "swyft-weather-canvas";
    canvas.setAttribute("aria-hidden", "true");

    const fog = document.createElement("div");
    fog.className = "swyft-fog-layer";
    fog.setAttribute("aria-hidden", "true");

    body.append(canvas, fog);

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      canvas.remove();
      return;
    }

    let width = 0;
    let height = 0;
    let particles = [];
    let frame = 0;
    let previousTime = performance.now();
    let effect = "snow";

    function normalizeEffect(value) {
      const normalized = String(value || "").trim().toLowerCase();
      return ["snow", "rain", "ash", "off"].includes(normalized) ? normalized : "snow";
    }

    function makeParticle(randomY = true) {
      if (effect === "rain") {
        return {
          x: Math.random() * width,
          y: randomY ? Math.random() * height : -30,
          length: 12 + Math.random() * 18,
          speed: (8 + Math.random() * 10) * (reducedMotion ? 0.35 : 1),
          drift: -1.4 - Math.random() * 1.4,
          opacity: 0.25 + Math.random() * 0.38
        };
      }

      if (effect === "ash") {
        const size = 1.5 + Math.random() * 3.4;
        return {
          x: Math.random() * width,
          y: randomY ? Math.random() * height : -24,
          size,
          speed: (0.28 + Math.random() * 0.58) * (reducedMotion ? 0.38 : 1),
          drift: (-0.35 + Math.random() * 0.7) * (reducedMotion ? 0.45 : 1),
          phase: Math.random() * Math.PI * 2,
          opacity: 0.28 + Math.random() * 0.54,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (-0.012 + Math.random() * 0.024) * (reducedMotion ? 0.35 : 1)
        };
      }

      const size = 4.8 + Math.random() * 5.4;
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : -24,
        size,
        speed: (0.28 + size * 0.065) * (reducedMotion ? 0.38 : 1),
        drift: (-0.18 + Math.random() * 0.36) * (reducedMotion ? 0.45 : 1),
        phase: Math.random() * Math.PI * 2,
        opacity: 0.5 + Math.random() * 0.4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (-0.004 + Math.random() * 0.008) * (reducedMotion ? 0.35 : 1)
      };
    }

    function drawSnowflake(flake) {
      const size = flake.size;
      context.save();
      context.translate(flake.x, flake.y);
      context.rotate(flake.rotation);
      context.beginPath();

      for (let arm = 0; arm < 6; arm += 1) {
        context.moveTo(0, 0);
        context.lineTo(0, -size);
        context.moveTo(0, -size * 0.58);
        context.lineTo(-size * 0.28, -size * 0.76);
        context.moveTo(0, -size * 0.58);
        context.lineTo(size * 0.28, -size * 0.76);
        context.rotate(Math.PI / 3);
      }

      context.strokeStyle = `rgba(224,244,255,${flake.opacity})`;
      context.lineWidth = Math.max(0.75, size * 0.11);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.shadowColor = "rgba(116,205,255,.78)";
      context.shadowBlur = size * 0.7;
      context.stroke();
      context.restore();
    }

    function drawRain(drop) {
      context.beginPath();
      context.moveTo(drop.x, drop.y);
      context.lineTo(drop.x - drop.drift * 0.9, drop.y - drop.length);
      context.strokeStyle = `rgba(176,222,248,${drop.opacity})`;
      context.lineWidth = 0.75;
      context.lineCap = "round";
      context.shadowColor = "rgba(93,178,231,.38)";
      context.shadowBlur = 2;
      context.stroke();
    }

    function drawAsh(ember) {
      const size = ember.size;
      context.save();
      context.translate(ember.x, ember.y);
      context.rotate(ember.rotation);
      context.beginPath();
      context.moveTo(0, -size * 1.7);
      context.lineTo(size, 0);
      context.lineTo(0, size * 1.7);
      context.lineTo(-size, 0);
      context.closePath();
      context.fillStyle = `rgba(255,151,92,${ember.opacity})`;
      context.shadowColor = "rgba(255,76,31,.85)";
      context.shadowBlur = size * 2.2;
      context.fill();
      context.restore();
    }

    function targetParticleCount() {
      if (effect === 'snow' && window.SWYFT_CONTROL) {
        const amount = Math.max(10, Math.min(60, Number(window.SWYFT_CONTROL.snowAmount) || 36));
        return reducedMotion ? Math.max(5, Math.round(amount * .4)) : amount;
      }
      const mobile = width <= 620;
      const area = width * height;

      if (effect === "rain") {
        const count = Math.max(42, Math.min(mobile ? 72 : 132, Math.round(area / 10500)));
        return reducedMotion ? Math.max(20, Math.round(count * 0.42)) : count;
      }

      if (effect === "ash") {
        const count = Math.max(22, Math.min(mobile ? 34 : 64, Math.round(area / 27000)));
        return reducedMotion ? Math.max(12, Math.round(count * 0.48)) : count;
      }

      const count = Math.max(18, Math.min(mobile ? 26 : 54, Math.round(area / (mobile ? 19000 : 32000))));
      return reducedMotion ? Math.max(10, Math.round(count * 0.45)) : count;
    }

    function resizeWeather() {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      const pixelRatio = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      if (effect === "off") return;
      const targetCount = targetParticleCount();
      if (particles.length > targetCount) particles.length = targetCount;
      while (particles.length < targetCount) particles.push(makeParticle(true));
    }

    function drawWeather(time) {
      if (effect === "off" || document.hidden) {
        frame = 0;
        return;
      }

      const elapsed = Math.min(2, Math.max(0.2, (time - previousTime) / 16.67));
      previousTime = time;
      context.clearRect(0, 0, width, height);
      const wind = Math.sin(time * 0.00016) * 0.16;

      particles.forEach(particle => {
        if (effect === "rain") {
          particle.x += particle.drift * elapsed;
          particle.y += particle.speed * elapsed;
          if (particle.y > height + particle.length || particle.x < -40) {
            Object.assign(particle, makeParticle(false));
            particle.x = Math.random() * (width + 80);
          }
          drawRain(particle);
          return;
        }

        particle.phase += (effect === "ash" ? 0.02 : 0.008) * elapsed;
        particle.x += (particle.drift + wind + Math.sin(particle.phase) * (effect === "ash" ? 0.22 : 0.08)) * elapsed;
        particle.y += particle.speed * elapsed;
        particle.rotation += particle.rotationSpeed * elapsed;

        if (particle.y > height + 24) Object.assign(particle, makeParticle(false));
        if (particle.x < -24) particle.x = width + 24;
        if (particle.x > width + 24) particle.x = -24;

        if (effect === "ash") drawAsh(particle);
        else drawSnowflake(particle);
      });

      frame = requestAnimationFrame(drawWeather);
    }

    function startWeather() {
      if (frame || effect === "off" || document.hidden) return;
      previousTime = performance.now();
      frame = requestAnimationFrame(drawWeather);
    }

    function stopWeather() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      context.clearRect(0, 0, width, height);
    }

    function setEffect(value) {
      const nextEffect = normalizeEffect(value);
      const changed = nextEffect !== effect;
      effect = nextEffect;
      canvas.dataset.effect = effect;
      fog.dataset.effect = effect;
      canvas.hidden = effect === "off";
      fog.hidden = effect === "off";

      if (effect === "off") {
        particles = [];
        stopWeather();
        return;
      }

      if (changed) particles = [];
      resizeWeather();
      startWeather();
    }

    window.addEventListener("resize", resizeWeather, { passive: true });
    window.addEventListener('swyft:control', () => {
      resizeWeather();
      if (Number(window.SWYFT_CONTROL?.motionIntensity) === 0) {
        body.style.setProperty('--pointer-x','0');body.style.setProperty('--pointer-y','0');body.style.setProperty('--scroll-zoom','0');
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopWeather();
      } else {
        startWeather();
      }
    });

    window.addEventListener("swyft:weather", event => {
      setEffect(event.detail?.effect);
    });

    resizeWeather();
    setEffect(document.documentElement.dataset.weatherEffect || window.SWYFT_WEATHER_EFFECT || "snow");
  }

  initWeatherAtmosphere();
})();
