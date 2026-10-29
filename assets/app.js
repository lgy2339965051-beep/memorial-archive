/* =========================================================
   app.js · 路由与交互
   ========================================================= */

(function () {
  "use strict";

  var S = window.STORE;
  var V = window.VIEWS;
  var E = window.EDITOR;

  var els = {
    header: document.getElementById("site-header"),
    app: document.getElementById("app"),
    footer: document.getElementById("site-footer"),
    search: document.getElementById("search-overlay"),
    searchInput: document.getElementById("search-input"),
    searchResults: document.getElementById("search-results"),
    lightbox: document.getElementById("lightbox"),
    lbFigure: document.getElementById("lightbox-figure"),
    lbCounter: document.getElementById("lightbox-counter"),
    lbWatermark: document.getElementById("lightbox-watermark"),
    confirm: document.getElementById("confirm"),
    confirmTitle: document.getElementById("confirm-title"),
    confirmMessage: document.getElementById("confirm-message"),
    toast: document.getElementById("toast")
  };

  var route = { path: "/home", query: {} };
  var lbItems = [];
  var lbIndex = 0;
  var confirmCb = null;
  var toastTimer = null;

  /* ---------------- 占位图 ---------------- */

  function placeholder(char) {
    var ch = char || "纪";
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#1a2721"/><stop offset="1" stop-color="#090e0c"/></linearGradient></defs>' +
      '<rect width="600" height="800" fill="url(#g)"/>' +
      '<rect x="24" y="24" width="552" height="752" fill="none" stroke="#2a3a32" stroke-width="1"/>' +
      '<text x="300" y="430" font-size="132" fill="#3d4d44" text-anchor="middle" font-family="serif">' + ch + "</text>" +
      "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  window.__imgFail = function (el) {
    el.onerror = null;
    el.src = placeholder(el.getAttribute("data-ph"));
    el.style.objectFit = "cover";
  };

  /* ---------------- 路由 ---------------- */

  function parseRoute() {
    var raw = location.hash.replace(/^#/, "") || "/home";
    var qIndex = raw.indexOf("?");
    var path = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    var queryStr = qIndex >= 0 ? raw.slice(qIndex + 1) : "";
    var query = {};
    queryStr.split("&").forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split("=");
      query[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || "").replace(/\+/g, " "));
    });
    if (!path || path === "/") path = "/home";
    return { path: path, query: query };
  }

  function routeView(r) {
    if (r.path === "/home") return V.home(r);
    if (r.path === "/members") return V.members(r);
    if (r.path === "/timeline") return V.timeline(r);
    if (r.path === "/gallery") return V.gallery(r);
    if (r.path.indexOf("/member") === 0) return V.member(r);
    if (r.path === "/admin") return E.render(r);
    return V.notFound(r);
  }

  function render() {
    route = parseRoute();
    var isAdmin = route.path === "/admin";

    els.header.innerHTML = V.header(route);
    els.header.style.display = isAdmin ? "none" : "";
    els.footer.innerHTML = isAdmin ? "" : V.footer();
    els.footer.style.display = isAdmin ? "none" : "";

    try {
      els.app.innerHTML = routeView(route);
    } catch (err) {
      console.error(err);
      els.app.innerHTML = '<div class="container" style="padding:140px 0"><h1 style="font-size:32px">页面出错了</h1><p style="color:#a49d90">' + String(err.message || err) + "</p></div>";
    }

    var site = S.state.data.site;
    document.title = isAdmin ? "录入与管理 · " + (site.name || "纪念档案") : (site.name || "纪念档案") + (site.motto ? " · " + site.motto : "");

    observeReveal();
    updateHeaderState();
    if (els.lbWatermark) els.lbWatermark.textContent = (site.watermark || "纪念档案") + " · 私人留存";
  }

  function rerender() {
    var y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }

  /* ---------------- 滚动与标题栏 ---------------- */

  function updateHeaderState() {
    if (!els.header) return;
    els.header.classList.toggle("is-stuck", window.scrollY > 24);
  }

  var revealObserver = null;
  function observeReveal() {
    var nodes = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            revealObserver.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    nodes.forEach(function (n) { revealObserver.observe(n); });
  }

  /* ---------------- 搜索 ---------------- */

  function openSearch() {
    els.search.hidden = false;
    document.body.classList.add("is-locked");
    els.searchInput.value = "";
    els.searchResults.innerHTML = hintSearch();
    setTimeout(function () { els.searchInput.focus(); }, 60);
  }

  function closeSearch() {
    els.search.hidden = true;
    document.body.classList.remove("is-locked");
  }

  function hintSearch() {
    return '<p style="color:#777267;font-size:12.5px;padding:16px 0">试试输入一个人的名字、一个年份，或者一句你记得的话。</p>';
  }

  function runSearch(q) {
    if (!q.trim()) {
      els.searchResults.innerHTML = hintSearch();
      return;
    }
    var res = S.search(q);
    if (!res.length) {
      els.searchResults.innerHTML = '<p style="color:#777267;font-size:12.5px;padding:16px 0">没有找到和「' + S.esc(q) + '」有关的内容。</p>';
      return;
    }
    els.searchResults.innerHTML = res
      .map(function (r) {
        return (
          '<a class="search-result" href="' + r.href + '" data-action="search-go">' +
          "<div><div class=\"search-result__title\">" + S.esc(r.title) + "</div>" +
          '<div class="search-result__meta">' + S.esc(r.meta || "") + "</div></div>" +
          '<span class="search-result__kind">' + S.esc(r.kind) + "</span></a>"
        );
      })
      .join("");
  }

  /* ---------------- 灯箱 ---------------- */

  function openLightbox(el) {
    lbItems = Array.prototype.slice.call(document.querySelectorAll("[data-lb]"));
    lbIndex = Math.max(0, lbItems.indexOf(el));
    showLightbox();
    els.lightbox.hidden = false;
    document.body.classList.add("is-locked");
  }

  function showLightbox() {
    var el = lbItems[lbIndex];
    if (!el) return;
    var data;
    try { data = JSON.parse(el.getAttribute("data-lb")); } catch (e) { return; }

    var html = "";
    if (data.type === "image") {
      html = '<img src="' + S.esc(data.src) + '" alt="' + S.esc(data.title || "") + '" data-ph="影" onerror="window.__imgFail(this)">';
    } else {
      var src = S.parseVideo(data.src);
      if (src.kind === "embed") {
        html = '<iframe src="' + S.esc(src.url) + '" allow="autoplay; fullscreen; encrypted-media" allowfullscreen referrerpolicy="no-referrer"></iframe>';
      } else if (src.kind === "file") {
        html = '<video src="' + S.esc(src.url) + '" controls autoplay playsinline></video>';
      } else {
        html = '<div style="padding:80px 20px;text-align:center;color:#a49d90;border:1px solid rgba(233,226,210,.13)">视频源不可用。<br><span style="font-size:12px;color:#777267">如果是从本机上传的视频，换台电脑或清过缓存后就找不到了。</span></div>';
      }
    }

    html +=
      "<figcaption><b>" + S.esc(data.title || "未命名") + "</b>" +
      (data.meta ? "<span>" + S.esc(data.meta) + "</span>" : "") +
      "</figcaption>";
    els.lbFigure.innerHTML = html;

    els.lbCounter.textContent = String(lbIndex + 1).padStart(2, "0") + " / " + String(lbItems.length).padStart(2, "0");
    var navs = els.lightbox.querySelectorAll(".lightbox__nav");
    navs[0].disabled = false;
    navs[1].disabled = false;
  }

  function stepLightbox(dir) {
    if (!lbItems.length) return;
    lbIndex = (lbIndex + dir + lbItems.length) % lbItems.length;
    showLightbox();
  }

  function closeLightbox() {
    els.lightbox.hidden = true;
    els.lbFigure.innerHTML = "";
    document.body.classList.remove("is-locked");
  }

  /* ---------------- 确认框 / Toast ---------------- */

  function confirmBox(title, message, cb) {
    els.confirmTitle.textContent = title;
    els.confirmMessage.textContent = message;
    confirmCb = cb;
    els.confirm.hidden = false;
    document.body.classList.add("is-locked");
  }

  function closeConfirm() {
    els.confirm.hidden = true;
    confirmCb = null;
    document.body.classList.remove("is-locked");
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 2600);
  }

  /* ---------------- 移动端菜单 ---------------- */

  function openMenu() {
    if (document.querySelector(".mobile-menu")) return;
    var items = [
      { path: "/home", label: "首页" },
      { path: "/members", label: "人物档案" },
      { path: "/timeline", label: "时间轴" },
      { path: "/gallery", label: "影像库" }
    ];
    var nav = document.createElement("div");
    nav.className = "mobile-menu";
    nav.innerHTML =
      '<div class="mobile-menu__list">' +
      items
        .map(function (it) {
          var active = route.path === it.path || (it.path === "/members" && route.path.indexOf("/member") === 0);
          return '<a class="mobile-menu__link' + (active ? " is-active" : "") + '" href="#' + it.path + '" data-action="close-menu">' + it.label + "</a>";
        })
        .join("") +
      '<a class="mobile-menu__link" href="#/admin" data-action="close-menu">录入与管理</a>' +
      "</div>" +
      '<div class="mobile-menu__foot">' + S.esc(S.state.data.site.motto || "") + "</div>";
    nav.addEventListener("click", function (e) {
      if (e.target.closest("[data-action='close-menu']")) {
        nav.remove();
        document.body.classList.remove("is-locked");
      }
    });
    document.body.appendChild(nav);
    document.body.classList.add("is-locked");
  }

  /* ---------------- 全局事件 ---------------- */

  document.addEventListener("click", function (ev) {
    var t = ev.target;

    // 媒体点击
    var media = t.closest("[data-lb]");
    if (media && !t.closest("[data-action]")) {
      ev.preventDefault();
      openLightbox(media);
      return;
    }

    var el = t.closest("[data-action]");
    if (!el) return;
    var action = el.getAttribute("data-action");

    switch (action) {
      case "open-search": openSearch(); break;
      case "close-search": closeSearch(); break;
      case "search-go": closeSearch(); break;
      case "open-menu": openMenu(); break;
      case "close-lightbox": closeLightbox(); break;
      case "lightbox-prev": stepLightbox(-1); break;
      case "lightbox-next": stepLightbox(1); break;
      case "confirm-cancel": closeConfirm(); break;
      case "confirm-ok":
        var cb = confirmCb;
        closeConfirm();
        if (cb) cb();
        break;
    }
  });

  document.addEventListener("input", function (ev) {
    if (ev.target === els.searchInput) runSearch(ev.target.value);

    if (ev.target.matches('[data-action="members-search"]')) {
      var q = ev.target.value;
      clearTimeout(ev.target.__t);
      ev.target.__t = setTimeout(function () {
        var base = "#/members";
        var params = [];
        if (route.query.tag) params.push("tag=" + encodeURIComponent(route.query.tag));
        if (q) params.push("q=" + encodeURIComponent(q));
        var target = base + (params.length ? "?" + params.join("&") : "");
        if (location.hash === target) return;
        history.replaceState(null, "", target);
        route = parseRoute();
        var box = els.app.querySelector(".member-grid, .empty");
        // 仅更新列表，保留输入框焦点
        var listEl = els.app.querySelector(".member-grid") || els.app.querySelector(".empty");
        if (listEl) {
          var temp = document.createElement("div");
          temp.innerHTML = V.members(route);
          var newList = temp.querySelector(".member-grid") || temp.querySelector(".empty");
          if (newList) listEl.replaceWith(newList);
          observeReveal();
        }
      }, 180);
    }
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      if (!els.lightbox.hidden) closeLightbox();
      else if (!els.confirm.hidden) closeConfirm();
      else if (!els.search.hidden) closeSearch();
    }
    if (!els.lightbox.hidden) {
      if (ev.key === "ArrowLeft") stepLightbox(-1);
      if (ev.key === "ArrowRight") stepLightbox(1);
    }
    // ⌘K / Ctrl+K
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
      ev.preventDefault();
      if (els.search.hidden) openSearch();
      else closeSearch();
    }
  });

  window.addEventListener("scroll", updateHeaderState, { passive: true });

  window.addEventListener("hashchange", function () {
    var prevPath = route.path;
    render();
    if (prevPath !== route.path) window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
    else window.scrollTo(0, 0);
  });

  /* ---------------- 启动 ---------------- */

  function boot() {
    document.documentElement.classList.add("has-js");
    S.load();
    E.bind();
    S.hydrateMedia().then(function () {
      render();
      if (!location.hash) location.replace("#/home");
    });
  }

  window.APP = { render: render, rerender: rerender, toast: toast, confirm: confirmBox, openLightbox: openLightbox };

  boot();
})();
