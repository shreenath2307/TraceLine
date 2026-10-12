(function () {
  var root = document.documentElement;
  var KEY = "tl-paused";

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var video = document.getElementById("bgvideo");
  var btn = document.getElementById("pauseBtn");
  var label = btn ? btn.querySelector("span") : null;

  // One switch for everything that moves: background video, scroll reveals, charts, console simulation.
  function setPaused(p, save) {
    root.classList.toggle("paused", p);
    window.TL = window.TL || {};
    window.TL.paused = p;
    if (video) {
      if (p) { video.pause(); }
      else { var pr = video.play(); if (pr && pr.catch) pr.catch(function () {}); }
    }
    if (btn) {
      btn.setAttribute("aria-pressed", String(p));
      btn.setAttribute("aria-label", p ? "Play animation" : "Pause animation");
      if (label) label.textContent = p ? "Play animation" : "Pause animation";
    }
    if (save) write(p ? "1" : "0");
    document.dispatchEvent(new CustomEvent("tl:pause", { detail: p }));
  }

  var stored = read();
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setPaused(stored === null ? reduce : stored === "1", false);
  if (btn) btn.addEventListener("click", function () { setPaused(!root.classList.contains("paused"), true); });

  // nav: mark current page, mobile menu
  var here = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  document.querySelectorAll(".links a").forEach(function (a) {
    var h = (a.getAttribute("href") || "").split("#")[0].replace(/\.html$/, "");
    if (h === here || (here === "" && h === "index")) a.setAttribute("aria-current", "page");
  });
  var menu = document.querySelector(".menu");
  var links = document.getElementById("links");
  if (menu && links) {
    menu.addEventListener("click", function () {
      var o = links.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(o));
    });
    links.addEventListener("click", function (e) { if (e.target.tagName === "A") { links.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); } });
  }

  // bottom-to-top reveal: content rises into place as it enters from the bottom of the screen
  var items = document.querySelectorAll(".rise");
  var seen = new Map();
  items.forEach(function (el) {
    var p = el.parentElement, i = seen.get(p) || 0;
    el.style.setProperty("--d", Math.min(i, 6) * 80 + "ms");
    seen.set(p, i + 1);
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  // plans: 2 BHK / 3 BHK estimate switch
  var sizer = document.getElementById("sizer");
  if (sizer) {
    var data = {
      "2": { area: "about 900 sq ft", anchors: "4 anchors", tags: "2 tags", dense: "6 anchors" },
      "3": { area: "about 1,350 sq ft", anchors: "6 anchors", tags: "3 tags", dense: "9 anchors" }
    };
    function show(k) {
      sizer.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.bhk === k)); });
      document.querySelectorAll("[data-bhk-price]").forEach(function (el) {
        var v = JSON.parse(el.getAttribute("data-bhk-price"));
        el.textContent = v[k];
      });
      document.querySelectorAll("[data-bhk-sub]").forEach(function (el) {
        var v = JSON.parse(el.getAttribute("data-bhk-sub"));
        el.textContent = v[k];
      });
      document.querySelectorAll("[data-bhk-brk]").forEach(function (el) {
        var v = JSON.parse(el.getAttribute("data-bhk-brk"));
        el.textContent = v[k];
      });
      var d = data[k];
      var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
      set("a-area", d.area); set("a-anch", d.anchors); set("a-tags", d.tags); set("a-dense", d.dense);
    }
    sizer.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (b) show(b.dataset.bhk);
    });
    show("2");
  }

  // enquiry form
  var form = document.getElementById("enq");
  if (form) {
    var note = document.getElementById("formNote");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var body = new URLSearchParams(fd).toString();
      note.className = ""; note.textContent = "Sending…";
      fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body })
        .then(function (r) { if (!r.ok) throw new Error(); note.textContent = "Thanks. The team has your enquiry and will reply to the email you gave."; form.reset(); })
        .catch(function () { note.className = "err"; note.textContent = "The enquiry could not be sent from here. Try again once the site is live."; });
    });
  }
})();
