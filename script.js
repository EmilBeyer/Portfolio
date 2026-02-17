/* ============================
   BOOTSTRAP
============================ */
document.addEventListener("DOMContentLoaded", () => {
  initializeAfterGSAP();
});

function initializeAfterGSAP() {
  if (!window.gsap) {
    setTimeout(initializeAfterGSAP, 50);
    return;
  }

  const isOLTPage = document.body.classList.contains("page-olt");

  // Register plugins once
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (window.Draggable) gsap.registerPlugin(Draggable);
  if (window.CustomEase) gsap.registerPlugin(CustomEase);

  // Custom ease (used by Dropping Cards Stack)
  if (window.CustomEase) {
    try { CustomEase.create("osmo", "0.625, 0.05, 0, 1"); } catch (_) {}
  }

  // Init UI
  initTwostepScalingNavigation();
  initVariableFontWeightHover();
  initMomentumBasedHover();

  // Scroll system (Lenis on all except OLT, where you use custom smooth scroll)
  if (isOLTPage) {
    initOLTScrollBridge();
  } else {
    initLenisScrollBridge();
  }

  // Components
  initDroppingCardsStack();
  initMagneticEffect();
  initStickyFeatures();
  initFooterParallax();

  // One refresh after ALL ScrollTriggers are created
  if (window.ScrollTrigger) ScrollTrigger.refresh();

  // And a safe refresh after images/layout are fully settled
  window.addEventListener("load", () => {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });

  // Unicorn (safe init)
  if (window.UnicornStudio && typeof window.UnicornStudio.init === "function") {
    try { UnicornStudio.init(); } catch (_) {}
    setTimeout(() => { try { UnicornStudio.init(); } catch (_) {} }, 400);
  }
}

/* ============================
   SCROLL BRIDGES
============================ */

// OLT: your “makeshift smooth scroll”, but ScrollTrigger stays in sync
function initOLTScrollBridge() {
  let targetScroll = window.scrollY || 0;
  let currentScroll = window.scrollY || 0;
  const ease = 0.045;

  function clampTarget() {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    targetScroll = Math.max(0, Math.min(targetScroll, max));
  }

  function step() {
    clampTarget();
    currentScroll += (targetScroll - currentScroll) * ease;

    if (Math.abs(targetScroll - currentScroll) < 0.1) currentScroll = targetScroll;

    window.scrollTo(0, currentScroll);

    if (window.ScrollTrigger) ScrollTrigger.update();
    requestAnimationFrame(step);
  }

  window.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      targetScroll += e.deltaY;
      clampTarget();
    },
    { passive: false }
  );

  window.addEventListener("resize", () => {
    clampTarget();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });

  requestAnimationFrame(step);

  // Important: pinned sections change layout, so refresh once the loop is running
  if (window.ScrollTrigger) ScrollTrigger.refresh();
}

// Non OLT: Lenis with proper ScrollTrigger sync
function initLenisScrollBridge() {
  if (typeof Lenis === "undefined") return;

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => 1 - Math.pow(1 - t, 4),
    smooth: true,
    smoothTouch: false
  });

  // Use GSAP ticker as the single RAF driver (avoid double RAF loops)
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  if (window.ScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
  }
}

/* ============================
   NAV
============================ */
function initTwostepScalingNavigation() {
  const navElement = document.querySelector("[data-twostep-nav]");
  const navStatusEl = document.querySelector("[data-nav-status]");
  if (!navElement || !navStatusEl) return;

  const setNavStatus = (status) => navStatusEl.setAttribute("data-nav-status", status);
  const isActive = () => navStatusEl.getAttribute("data-nav-status") === "active";

  const openNav = () => setNavStatus("active");
  const closeNav = () => setNavStatus("not-active");
  const toggleNav = () => (isActive() ? closeNav() : openNav());

  document.querySelectorAll('[data-nav-toggle="toggle"]').forEach((btn) => {
    btn.addEventListener("click", toggleNav);
  });

  document.querySelectorAll('[data-nav-toggle="close"]').forEach((btn) => {
    btn.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isActive()) closeNav();
  });
}

/* ============================
   VARIABLE FONT HOVER
============================ */
function initVariableFontWeightHover() {
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!supportsHover) return;

  const el = document.querySelector("[data-vf-hover]");
  if (!el) return;

  const text = el.textContent;
  el.textContent = "";

  const frag = document.createDocumentFragment();
  for (const ch of text) {
    const span = document.createElement("span");
    span.className = "vf-char";
    span.textContent = ch === " " ? "\u00A0" : ch;
    frag.appendChild(span);
  }
  el.appendChild(frag);

  const chars = Array.from(el.querySelectorAll(".vf-char"));

  const MIN_W = 300;
  const MAX_W = 900;
  const RADIUS = 350;

  let rects = [];
  const measure = () => {
    rects = chars.map((c) => c.getBoundingClientRect());
  };

  const setAll = (w) => {
    chars.forEach((c) =>
      gsap.to(c, {
        "--wght": w,
        duration: 0.35,
        ease: "power3.out",
        overwrite: true
      })
    );
  };

  const onMove = (e) => {
    const mx = e.clientX;
    const my = e.clientY;

    rects.forEach((r, i) => {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;

      const dx = mx - cx;
      const dy = my - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const t = Math.max(0, Math.min(1, 1 - dist / RADIUS));
      const w = MIN_W + (MAX_W - MIN_W) * t;

      gsap.to(chars[i], {
        "--wght": w,
        duration: 0.25,
        ease: "power3.out",
        overwrite: true
      });
    });
  };

  el.addEventListener("mouseenter", measure);
  el.addEventListener("mousemove", onMove);
  el.addEventListener("mouseleave", () => setAll(400));
  window.addEventListener("resize", measure);
}

/* ============================
   MOMENTUM HOVER
============================ */
function initMomentumBasedHover() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const xyMultiplier = 30;
  const rotationMultiplier = 20;

  const clampXY = gsap.utils.clamp(-1080, 1080);
  const clampRot = gsap.utils.clamp(-60, 60);

  document.querySelectorAll("[data-momentum-hover-init]").forEach((root) => {
    let prevX = 0,
      prevY = 0;
    let velX = 0,
      velY = 0;
    let rafId = null;

    root.addEventListener("mousemove", (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        velX = e.clientX - prevX;
        velY = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;
        rafId = null;
      });
    });

    root.querySelectorAll("[data-momentum-hover-element]").forEach((el) => {
      el.addEventListener("mouseenter", (e) => {
        const target = el.querySelector("[data-momentum-hover-target]");
        if (!target) return;

        const { left, top, width, height } = target.getBoundingClientRect();
        const centerX = left + width / 2;
        const centerY = top + height / 2;

        const offsetX = e.clientX - centerX;
        const offsetY = e.clientY - centerY;

        const rawTorque = offsetX * velY - offsetY * velX;
        const leverDist = Math.hypot(offsetX, offsetY) || 1;
        const angularForce = rawTorque / leverDist;

        const velocityX = clampXY(velX * xyMultiplier);
        const velocityY = clampXY(velY * xyMultiplier);
        const rotationVelocity = clampRot(angularForce * rotationMultiplier);

        gsap.killTweensOf(target);

        gsap.to(target, {
          x: velocityX * 0.08,
          y: velocityY * 0.08,
          rotation: rotationVelocity * 0.25,
          duration: 0.35,
          ease: "power3.out",
          overwrite: true,
          onComplete: () => {
            gsap.to(target, {
              x: 0,
              y: 0,
              rotation: 0,
              duration: 0.45,
              ease: "power4.out",
              overwrite: true
            });
          }
        });
      });
    });
  });
}

/* ============================
   FOOTER PARALLAX
============================ */
function initFooterParallax() {
  if (!window.ScrollTrigger) return;

  document.querySelectorAll("[data-footer-parallax]").forEach((el) => {
    const inner = el.querySelector("[data-footer-parallax-inner]");
    const dark = el.querySelector("[data-footer-parallax-dark]");

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "clamp(top bottom)",
        end: "clamp(top top)",
        scrub: 0.6,
        invalidateOnRefresh: true
      }
    });

    if (inner) tl.from(inner, { yPercent: -25, ease: "none" });
    if (dark) tl.from(dark, { opacity: 0.5, ease: "none" }, "<");
  });
}

/* ============================
   DROPPING CARDS STACK
============================ */
function initDroppingCardsStack() {
  const stacks = document.querySelectorAll("[data-dropping-stack-init]");
  if (!stacks.length) return;
  if (!window.Draggable) return;

  const visibleCount = 4;
  const minTotalForLoop = 5;
  const duration = 0.75;
  const mainEase = "osmo";
  const dragThresholdPercent = 20;

  const getUnitValue = (val, depth) => {
    const num = parseFloat(val) || 0;
    const unit = String(val).replace(/[0-9.-]/g, "") || "px";
    return num * depth + unit;
  };

  stacks.forEach((stackEl) => {
    const nextBtn = stackEl.querySelector("[data-dropping-stack-next]");
    const prevBtn = stackEl.querySelector("[data-dropping-stack-prev]");
    const list = stackEl.querySelector(".dropping-stack__list");
    if (!list) return;

    let cards = Array.from(list.querySelectorAll("[data-dropping-stack-item]"));
    if (cards.length < 3) return;

    const originalCount = cards.length;
    if (cards.length < minTotalForLoop) {
      const setsNeeded = Math.ceil(minTotalForLoop / originalCount);
      const clonesToAdd = setsNeeded * originalCount - originalCount;

      for (let i = 0; i < clonesToAdd; i++) {
        const clone = cards[i % originalCount].cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        list.appendChild(clone);
      }
      cards = Array.from(list.querySelectorAll("[data-dropping-stack-item]"));
    }

    const total = cards.length;
    let activeIndex = 0;
    let isAnimating = false;

    let dragCard = null;
    let draggableInstance = null;

    let limitX = 1;
    let limitY = 1;

    let offsetX = "0em";
    let offsetY = "0em";

    let isActive = false;

    const mod = (n, m) => ((n % m) + m) % m;
    const cardAt = (offset) => cards[mod(activeIndex + offset, total)];

    function updateOffsetsFromPadding() {
      const collectionEl = stackEl.querySelector("[data-dropping-stack-collection]");
      if (!collectionEl) return;

      const styles = getComputedStyle(collectionEl);
      const padRight = parseFloat(styles.paddingRight) || 0;
      const padLeft = parseFloat(styles.paddingLeft) || 0;
      const padBottom = parseFloat(styles.paddingBottom) || 0;
      const padTop = parseFloat(styles.paddingTop) || 0;

      const steps = Math.max(1, visibleCount - 1);

      const usePadX = Math.max(padRight, padLeft);
      const usePadY = Math.max(padBottom, padTop);

      const signX = padLeft > padRight ? -1 : 1;
      const signY = padTop > padBottom ? -1 : 1;

      const xStep = (usePadX / steps) * signX;
      const yStep = (usePadY / steps) * signY;

      offsetX = xStep + "px";
      offsetY = yStep + "px";
    }

    function updateDragLimits() {
      if (!dragCard) return;
      const cardRect = dragCard.getBoundingClientRect();
      limitX = cardRect.width || 1;
      limitY = cardRect.height || 1;
    }

    function applyState() {
      updateOffsetsFromPadding();

      cards.forEach((card) => {
        gsap.set(card, {
          opacity: 0,
          pointerEvents: "none",
          zIndex: 0,
          x: 0,
          y: 0,
          xPercent: 0,
          yPercent: 0
        });
      });

      for (let depth = 0; depth < visibleCount; depth++) {
        const card = cardAt(depth);
        const xVal = getUnitValue(offsetX, depth);
        const yVal = getUnitValue(offsetY, depth);

        const state = {
          opacity: 1,
          zIndex: 999 - depth,
          pointerEvents: depth === 0 ? "auto" : "none"
        };

        if (offsetX.includes("%")) state.xPercent = parseFloat(xVal);
        else state.x = xVal;

        if (offsetY.includes("%")) state.yPercent = parseFloat(yVal);
        else state.y = yVal;

        gsap.set(card, state);
      }

      dragCard = cardAt(0);
      gsap.set(dragCard, { touchAction: "none" });

      updateDragLimits();

      if (draggableInstance) {
        draggableInstance.kill();
        draggableInstance = null;
      }

      const magnetize = (raw, limit) => {
        const sign = Math.sign(raw) || 1;
        const abs = Math.abs(raw);
        const out = limit * Math.tanh(abs / limit);
        return sign * out;
      };

      draggableInstance = Draggable.create(dragCard, {
        type: "x,y",
        inertia: false,
        onPress: function () {
          if (isAnimating) return;
          gsap.killTweensOf(dragCard);
          gsap.set(dragCard, { zIndex: 2000, opacity: 1 });
        },
        onDrag: function () {
          if (isAnimating) return;

          const x = magnetize(this.x, limitX);
          const y = magnetize(this.y, limitY);

          gsap.set(dragCard, { x, y, opacity: 1 });
        },
        onRelease: function () {
          if (isAnimating) return;

          const currentX = gsap.getProperty(dragCard, "x");
          const currentY = gsap.getProperty(dragCard, "y");

          const movedXPercent = (Math.abs(currentX) / limitX) * 100;
          const movedYPercent = (Math.abs(currentY) / limitY) * 100;
          const movedPercent = Math.max(movedXPercent, movedYPercent);

          if (movedPercent >= dragThresholdPercent) {
            animateNext(true, currentX, currentY);
            return;
          }

          gsap.to(dragCard, {
            x: 0,
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "elastic.out(1, 0.7)",
            onComplete: applyState
          });
        }
      })[0];
    }

    function animateNext(fromDrag = false, releaseX = 0, releaseY = 0) {
      if (isAnimating) return;
      isAnimating = true;

      const outgoing = cardAt(0);
      const incomingBack = cardAt(visibleCount);

      const tl = gsap.timeline({
        defaults: { duration, ease: mainEase },
        onComplete: () => {
          activeIndex = mod(activeIndex + 1, total);
          applyState();
          isAnimating = false;
        }
      });

      gsap.set(outgoing, { zIndex: 2000, opacity: 1 });
      if (fromDrag) gsap.set(outgoing, { x: releaseX, y: releaseY });

      tl.to(outgoing, { yPercent: 200 }, 0);
      tl.to(outgoing, { opacity: 0, duration: duration * 0.2, ease: "none" }, duration * 0.4);

      for (let depth = 1; depth < visibleCount; depth++) {
        const xVal = getUnitValue(offsetX, depth - 1);
        const yVal = getUnitValue(offsetY, depth - 1);
        const move = { zIndex: 999 - (depth - 1) };

        if (offsetX.includes("%")) move.xPercent = parseFloat(xVal);
        else move.x = xVal;

        if (offsetY.includes("%")) move.yPercent = parseFloat(yVal);
        else move.y = yVal;

        tl.to(cardAt(depth), move, 0);
      }

      const backX = getUnitValue(offsetX, visibleCount);
      const backY = getUnitValue(offsetY, visibleCount);
      const startX = getUnitValue(offsetX, visibleCount - 1);
      const startY = getUnitValue(offsetY, visibleCount - 1);

      const incomingSet = { opacity: 0, zIndex: 999 - visibleCount };
      if (offsetX.includes("%")) incomingSet.xPercent = parseFloat(backX);
      else incomingSet.x = backX;
      if (offsetY.includes("%")) incomingSet.yPercent = parseFloat(backY);
      else incomingSet.y = backY;

      gsap.set(incomingBack, incomingSet);

      const incomingTo = { opacity: 1 };
      if (offsetX.includes("%")) incomingTo.xPercent = parseFloat(startX);
      else incomingTo.x = startX;
      if (offsetY.includes("%")) incomingTo.yPercent = parseFloat(startY);
      else incomingTo.y = startY;

      tl.to(incomingBack, incomingTo, 0);
    }

    function animatePrev() {
      if (isAnimating) return;
      isAnimating = true;

      const incomingTop = cardAt(-1);
      const leavingBack = cardAt(visibleCount - 1);

      const tl = gsap.timeline({
        defaults: { duration, ease: mainEase },
        onComplete: () => {
          activeIndex = mod(activeIndex - 1, total);
          applyState();
          isAnimating = false;
        }
      });

      gsap.set(leavingBack, { zIndex: 1 });

      gsap.set(incomingTop, { opacity: 0, x: 0, xPercent: 0, yPercent: -200, zIndex: 2000 });
      tl.to(incomingTop, { yPercent: 0 }, 0);
      tl.to(incomingTop, { opacity: 1, duration: duration * 0.2, ease: "none" }, duration * 0.3);

      for (let depth = 0; depth < visibleCount - 1; depth++) {
        const xVal = getUnitValue(offsetX, depth + 1);
        const yVal = getUnitValue(offsetY, depth + 1);
        const move = { zIndex: 999 - (depth + 1) };

        if (offsetX.includes("%")) move.xPercent = parseFloat(xVal);
        else move.x = xVal;

        if (offsetY.includes("%")) move.yPercent = parseFloat(yVal);
        else move.y = yVal;

        tl.to(cardAt(depth), move, 0);
      }

      const backX = getUnitValue(offsetX, visibleCount);
      const backY = getUnitValue(offsetY, visibleCount);

      const hideBack = { opacity: 0 };
      if (offsetX.includes("%")) hideBack.xPercent = parseFloat(backX);
      else hideBack.x = backX;

      if (offsetY.includes("%")) hideBack.yPercent = parseFloat(backY);
      else hideBack.y = backY;

      tl.to(leavingBack, hideBack, 0);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isActive = entry.isIntersecting && entry.intersectionRatio >= 0.6;
        });
      },
      { threshold: [0, 0.6, 1] }
    );

    observer.observe(stackEl);

    const onKeyDown = (e) => {
      if (!isActive) return;
      if (isAnimating) return;

      const tag = e.target?.tagName ? e.target.tagName.toLowerCase() : "";
      const isTyping =
        tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable;
      if (isTyping) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        animateNext(false);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        animatePrev();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    applyState();

    if (nextBtn) nextBtn.addEventListener("click", () => animateNext(false));
    if (prevBtn) prevBtn.addEventListener("click", animatePrev);

    window.addEventListener("resize", applyState);
  });
}

/* ============================
   MAGNETIC
============================ */
function initMagneticEffect() {
  const magnets = document.querySelectorAll("[data-magnetic-strength]");
  if (!magnets.length) return;
  if (window.innerWidth <= 991) return;

  const resetEl = (el, immediate) => {
    if (!el) return;
    gsap.killTweensOf(el);
    (immediate ? gsap.set : gsap.to)(el, {
      x: "0em",
      y: "0em",
      rotate: "0deg",
      clearProps: "all",
      ...(!immediate && { ease: "elastic.out(1, 0.3)", duration: 1.6 })
    });
  };

  const resetOnEnter = (e) => {
    const m = e.currentTarget;
    resetEl(m, true);
    resetEl(m.querySelector("[data-magnetic-inner-target]"), true);
  };

  const moveMagnet = (e) => {
    const m = e.currentTarget;
    const b = m.getBoundingClientRect();

    const strength = parseFloat(m.getAttribute("data-magnetic-strength")) || 25;
    const inner = m.querySelector("[data-magnetic-inner-target]");
    const innerStrength =
      parseFloat(m.getAttribute("data-magnetic-strength-inner")) || strength;

    const offsetX = ((e.clientX - b.left) / m.offsetWidth - 0.5) * (strength / 16);
    const offsetY = ((e.clientY - b.top) / m.offsetHeight - 0.5) * (strength / 16);

    gsap.to(m, { x: offsetX + "em", y: offsetY + "em", rotate: "0.001deg", ease: "power4.out", duration: 1.6 });

    if (inner) {
      const innerOffsetX = ((e.clientX - b.left) / m.offsetWidth - 0.5) * (innerStrength / 16);
      const innerOffsetY = ((e.clientY - b.top) / m.offsetHeight - 0.5) * (innerStrength / 16);

      gsap.to(inner, { x: innerOffsetX + "em", y: innerOffsetY + "em", rotate: "0.001deg", ease: "power4.out", duration: 2 });
    }
  };

  const resetMagnet = (e) => {
    const m = e.currentTarget;
    const inner = m.querySelector("[data-magnetic-inner-target]");

    gsap.to(m, { x: "0em", y: "0em", ease: "elastic.out(1, 0.3)", duration: 1.6, clearProps: "all" });
    if (inner) gsap.to(inner, { x: "0em", y: "0em", ease: "elastic.out(1, 0.3)", duration: 2, clearProps: "all" });
  };

  magnets.forEach((m) => {
    m.addEventListener("mouseenter", resetOnEnter);
    m.addEventListener("mousemove", moveMagnet);
    m.addEventListener("mouseleave", resetMagnet);
  });
}

/* ============================
   STICKY FEATURES (OSMO)
============================ */
function initStickyFeatures(root) {
  if (!window.ScrollTrigger) return;

  const wraps = Array.from((root || document).querySelectorAll("[data-sticky-feature-wrap]"));
  if (!wraps.length) return;

  wraps.forEach((w) => {
    const visualWraps = Array.from(w.querySelectorAll("[data-sticky-feature-visual-wrap]"));
    const items = Array.from(w.querySelectorAll("[data-sticky-feature-item]"));
    const progressBar = w.querySelector("[data-sticky-feature-progress]");

    let count;
    const isAbout = window.location.pathname.includes('about.html');
    if (isAbout) {
      count = items.length;
    } else {
      count = Math.min(visualWraps.length, items.length);
    }
    if (count < 1) return;

    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DURATION = rm ? 0.01 : 0.75;
    const EASE = "power4.inOut";
    const SCROLL_AMOUNT = 0.9;
    // Use a larger scroll distance per step on mobile
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const END_MULTIPLIER = isMobile ? 400 : 200;

    const getTexts = (el) => Array.from(el.querySelectorAll("[data-sticky-feature-text]"));

    if (visualWraps[0]) gsap.set(visualWraps[0], { clipPath: "inset(0% round 0.75em)" });
    gsap.set(items[0], { autoAlpha: 1 });

    function animateOut(itemEl) {
      const texts = getTexts(itemEl);
      gsap.to(texts, {
        autoAlpha: 0,
        y: -30,
        ease: "power4.out",
        duration: 0.4,
        onComplete: () => gsap.set(itemEl, { autoAlpha: 0 })
      });
    }

    function animateIn(itemEl) {
      const texts = getTexts(itemEl);
      gsap.set(itemEl, { autoAlpha: 1 });
      gsap.fromTo(
        texts,
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, ease: "power4.out", duration: DURATION, stagger: 0.1 }
      );
    }

    function transition(fromIndex, toIndex) {
      if (fromIndex === toIndex) return;

      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });

      if (fromIndex < toIndex) {
        tl.to(
          visualWraps[toIndex],
          { clipPath: "inset(0% round 0.75em)", duration: DURATION, ease: EASE },
          0
        );
      } else {
        tl.to(
          visualWraps[fromIndex],
          { clipPath: "inset(50% round 0.75em)", duration: DURATION, ease: EASE },
          0
        );
      }

      animateOut(items[fromIndex]);
      animateIn(items[toIndex]);
    }

    const steps = Math.max(1, count - 1);
    let lastIdx = 0;

    ScrollTrigger.create({
      trigger: w,
      start: "center center",
      end: () => `+=${steps * END_MULTIPLIER}%`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = Math.min(self.progress, SCROLL_AMOUNT) / SCROLL_AMOUNT;
        const rawIdx = p * steps;

        let idx = Math.round(rawIdx);
        idx = Math.max(0, Math.min(steps, idx));

        if (progressBar) {
          gsap.set(progressBar, { scaleX: p, ease: "none" });
        }

        if (idx !== lastIdx) {
          transition(lastIdx, idx);
          lastIdx = idx;
        }
      }
    });
  });
}