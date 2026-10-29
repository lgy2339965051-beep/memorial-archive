/* =========================================================
   views.js · 页面渲染
   ========================================================= */

(function () {
  "use strict";

  var S = window.STORE;
  var esc = S.esc;

  /* ---------------- 通用小组件 ---------------- */

  function arrow() { return '<span class="arrow" aria-hidden="true">&rarr;</span>'; }

  function img(src, alt, cls, phChar, extra) {
    if (!src) {
      return '<div class="' + (cls || "") + ' img-fallback" data-ph="' + esc(phChar || "纪") + '"></div>';
    }
    return (
      '<img class="' + (cls || "") + '" src="' + esc(src) + '" alt="' + esc(alt || "") + '" loading="lazy" ' +
      'data-ph="' + esc(phChar || "纪") + '" onerror="window.__imgFail(this)" ' + (extra || "") + ">"
    );
  }

  function sectionHead(eyebrow, title, desc, linkHref, linkLabel) {
    return (
      '<div class="section-head reveal">' +
      "<div>" +
      '<p class="eyebrow"><span class="eyebrow__line"></span>' + esc(eyebrow) + "</p>" +
      '<h2 class="section-head__title">' + esc(title) + "</h2>" +
      (desc ? '<p class="section-head__desc">' + esc(desc) + "</p>" : "") +
      "</div>" +
      (linkHref ? '<a class="text-link" href="' + linkHref + '">' + esc(linkLabel) + arrow() + "</a>" : "") +
      "</div>"
    );
  }

  function empty(title, desc, href, label) {
    return (
      '<div class="empty reveal">' +
      '<h3 class="empty__title">' + esc(title) + "</h3>" +
      '<p class="empty__desc">' + esc(desc) + "</p>" +
      (href ? '<a class="btn btn--ghost btn--sm" href="' + href + '">' + esc(label) + "</a>" : "") +
      "</div>"
    );
  }

  function lbData(obj) {
    var json = JSON.stringify(obj).replace(/'/g, "&#39;");
    return "data-lb='" + json + "'";
  }

  /* ---------------- 页头 ---------------- */

  function header(route) {
    var site = S.state.data.site;
    var items = [
      { path: "/home", label: "首页" },
      { path: "/members", label: "人物档案" },
      { path: "/timeline", label: "时间轴" },
      { path: "/gallery", label: "影像库" }
    ];
    var isActive = function (p) {
      if (p === "/members") return route.path === "/members" || route.path.indexOf("/member") === 0;
      return route.path === p;
    };
    var nav = items
      .map(function (it) {
        return '<a class="nav__link' + (isActive(it.path) ? " is-active" : "") + '" href="#' + it.path + '">' + it.label + "</a>";
      })
      .join("");

    return (
      '<div class="header__inner">' +
      '<a class="brand" href="#/home">' +
      '<span class="brand__seal">' + esc((site.name || "纪").slice(0, 1)) + "</span>" +
      '<span class="brand__text">' +
      '<span class="brand__name">' + esc(site.name || "纪念档案") + "</span>" +
      '<span class="brand__sub">' + esc(site.en || "MEMORIAL ARCHIVE") + "</span>" +
      "</span></a>" +
      '<nav class="nav">' + nav + "</nav>" +
      '<div class="header__tools">' +
      '<button class="icon-btn" type="button" data-action="open-search" aria-label="检索档案">' +
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/></svg>' +
      "</button>" +
      '<a class="icon-btn" href="#/admin" aria-label="编辑档案">' +
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M13.4 3.2 16.8 6.6 7.6 15.8 3.4 16.6 4.2 12.4z"/><path d="M12 4.6 15.4 8"/></svg>' +
      "</a>" +
      '<button class="icon-btn menu-btn" type="button" data-action="open-menu" aria-label="打开菜单">' +
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 6h14M3 10h14M3 14h14"/></svg>' +
      "</button>" +
      "</div></div>"
    );
  }

  function footer() {
    var site = S.state.data.site;
    var ms = S.visibleMembers();
    return (
      '<div class="container">' +
      '<div class="footer__grid">' +
      "<div>" +
      '<div class="footer__brand">' +
      '<span class="brand__seal">' + esc((site.name || "纪").slice(0, 1)) + "</span>" +
      '<span class="brand__text"><span class="brand__name">' + esc(site.name || "纪念档案") + "</span>" +
      '<span class="brand__sub">' + esc(site.en || "MEMORIAL ARCHIVE") + "</span></span>" +
      "</div>" +
      '<p class="footer__note">' + esc(site.footerNote || "这份档案由家人与朋友共同维护。") + "</p>" +
      "</div>" +
      "<div>" +
      '<p class="footer__col-title">浏览</p>' +
      '<div class="footer__links">' +
      '<a href="#/members">人物档案</a><a href="#/timeline">时间轴</a><a href="#/gallery">影像库</a>' +
      "</div></div>" +
      "<div>" +
      '<p class="footer__col-title">档案</p>' +
      '<div class="footer__links">' +
      '<a href="#/admin">录入与编辑</a>' +
      '<a href="#/admin/data">数据备份</a>' +
      '<a href="#/home">回到首页</a>' +
      "</div></div>" +
      "<div>" +
      '<p class="footer__col-title">概况</p>' +
      '<div class="footer__links">' +
      "<span style=\"color:var(--muted);font-size:12.5px\">" + ms.length + " 位人物 · " + S.allPhotos().length + " 件影像 · " + S.allVideos().length + " 段视频</span>" +
      "</div></div>" +
      "</div>" +
      '<div class="footer__bottom">' +
      "<span>" + esc(site.location || "") + (site.est ? " · EST. " + esc(site.est) : "") + "</span>" +
      "<span>私人纪念 · 请勿外传</span>" +
      "</div></div>"
    );
  }

  /* ---------------- 首页 ---------------- */

  function heroHome() {
    var site = S.state.data.site;
    var st = S.stats();
    var lede = String(site.lede || "").split("\n").map(function (l) { return esc(l); }).join("<br>");
    return (
      '<section class="hero">' +
      '<div class="hero__bg"></div>' +
      (site.heroImage ? img(site.heroImage, "", "hero__image", (site.name || "纪").slice(0, 1), 'fetchpriority="high"') : "") +
      '<div class="hero__veil"></div>' +
      '<div class="hero__content container">' +
      '<p class="hero__kicker"><span></span>PRIVATE MEMORIAL ARCHIVE' + (site.est ? " · EST. " + esc(site.est) : "") + "</p>" +
      '<h1 class="hero__title">' + esc(site.name || "纪念档案") + "</h1>" +
      '<div class="hero__motto-row">' +
      '<p class="hero__motto">' + esc(site.motto || "") + "</p>" +
      '<span class="hero__seal" aria-hidden="true">' + (st.memberCount < 10 ? "0" : "") + st.memberCount + "</span>" +
      "</div>" +
      '<p class="hero__lede">' + lede + "</p>" +
      '<div class="hero__actions">' +
      '<a class="btn btn--solid" href="#/members">进入人物档案<span aria-hidden="true">&rarr;</span></a>' +
      '<a class="btn btn--ghost" href="#/timeline">沿时间回望</a>' +
      "</div></div>" +
      (site.location ? '<div class="hero__aside" aria-hidden="true"><span>' + esc(site.location) + "</span><span>" + esc(site.en || "") + "</span></div>" : "") +
      '<a class="scroll-cue" href="#/members" aria-label="向下浏览"><span>向下浏览</span><i></i></a>' +
      "</section>"
    );
  }

  function numberStrip() {
    var st = S.stats();
    return (
      '<section class="number-strip" aria-label="档案概览">' +
      '<div class="container number-strip__inner">' +
      "<div><b>" + (st.memberCount < 10 ? "0" : "") + st.memberCount + "</b><span>位人物</span></div>" +
      "<div><b>" + (st.timelineCount < 10 ? "0" : "") + st.timelineCount + "</b><span>条时间</span></div>" +
      "<div><b>" + (st.mediaCount < 10 ? "0" : "") + st.mediaCount + "</b><span>件影像</span></div>" +
      "<div><b>" + esc(st.startYear || "—") + "</b><span>起始年份</span></div>" +
      "</div></section>"
    );
  }

  function memberCard(m, i) {
    return (
      '<a class="member-card reveal" href="#/member/' + esc(m.id) + '" style="--reveal-delay:' + (i % 4) * 70 + 'ms">' +
      '<div class="member-card__frame">' +
      (m.cover || m.avatar ? img(m.cover || m.avatar, m.name, "member-card__img", m.initial) :
        '<div class="member-card__img img-fallback" data-ph="' + esc(m.initial) + '"></div>') +
      '<div class="member-card__shade"></div>' +
      '<span class="member-card__index">' + String(i + 1).padStart(2, "0") + "</span>" +
      (m.tags && m.tags.length
        ? '<div class="member-card__tags">' + m.tags.slice(0, 2).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>"
        : "") +
      '<div class="member-card__name-wrap">' +
      '<h3 class="member-card__name">' + esc(m.name) + "</h3>" +
      '<p class="member-card__tagline">' + esc(m.tagline || m.shortBio || "") + "</p>" +
      "</div>" +
      '<span class="member-card__line"></span>' +
      "</div></a>"
    );
  }

  function home() {
    var site = S.state.data.site;
    var ms = S.visibleMembers();
    var anns = S.upcomingAnniversaries(4);
    var latest = S.events().slice(0, 4);
    var photos = S.allPhotos().slice(0, 4);
    var q = S.stats().quote;
    var st = S.stats();

    var people = ms.length
      ? '<div class="member-grid">' + ms.slice(0, 8).map(memberCard).join("") + "</div>"
      : empty("还没有人物档案", "进入录入页，先把一个人的姓名、日期和故事放进来。", "#/admin", "开始录入");

    var annHTML = anns.length
      ? anns
          .map(function (a) {
            var m = a.member;
            return (
              '<a class="anniversary-row" href="#/member/' + esc(m.id) + '">' +
              '<span class="anniversary-row__date">' + esc(S.monthDay(m.memorialDate)) + "</span>" +
              '<span><span class="anniversary-row__name">' + esc(m.name) + "</span>" +
              '<span class="anniversary-row__label">' + esc(m.memorialLabel || "纪念日") + (a.years ? " · " + a.years + " 年" : "") + "</span></span>" +
              '<span class="anniversary-row__days">' + (a.days === 0 ? "就是今天" : "还有 " + a.days + " 天") + "</span>" +
              "</a>"
            );
          })
          .join("")
      : '<p style="color:var(--faint);font-size:13px">还没有设置纪念日。</p>';

    var archiveHTML = latest.length
      ? '<div class="archive-list">' +
        latest
          .map(function (e) {
            var names = e.memberIds.map(function (id) { var m = S.getMember(id); return m ? m.name : ""; }).filter(Boolean);
            return (
              '<a class="archive-row reveal" href="#/timeline">' +
              '<span class="archive-row__year">' + esc(e.year || "") + "</span>" +
              '<span><span class="archive-row__title">' + esc(e.title) + "</span>" +
              '<span class="archive-row__desc">' + esc([names.join(" · "), e.location].filter(Boolean).join(" · ")) + "</span></span>" +
              '<span class="archive-row__type">' + esc(e.type || "") + "</span>" +
              arrow() +
              "</a>"
            );
          })
          .join("") +
        "</div>"
      : empty("时间轴还是空的", "把重要的日子一条条加进来，它们会在这里按时间排好。", "#/admin", "添加记录");

    var stripHTML = photos.length
      ? '<div class="strip">' +
        photos
          .map(function (p, i) {
            return (
              '<div class="strip__item reveal" ' + lbData({ type: "image", src: p.src, title: p.title, meta: [p.memberName, p.date].filter(Boolean).join(" · ") }) + ">" +
              img(p.src, p.title || "", "", "影") +
              '<span class="strip__cap">' + esc(p.title || p.caption || "") + "</span>" +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      : empty("还没有影像", "上传照片，或在人物档案里添加影像。", "#/admin", "去上传");

    return (
      heroHome() +
      numberStrip() +
      '<section class="section container" id="portraits">' +
      sectionHead("PORTRAITS · 人物档案", "被记着的人", "他们各自有一条完整的时间，也有一段共同的时间。", "#/members", "查看全部档案") +
      people +
      "</section>" +

      '<section class="anniversary-section">' +
      '<div class="container anniversary-layout">' +
      '<div class="anniversary-intro reveal">' +
      '<p class="eyebrow"><span class="eyebrow__line"></span>ANNIVERSARIES</p>' +
      "<h2>临近的<br>纪念日</h2>" +
      "<p>日期不是终点。它只是一次提醒：有些人、有些事，值得被重新想起。</p>" +
      '<a class="text-link" href="#/timeline">看完整时间轴' + arrow() + "</a>" +
      "</div>" +
      '<div class="anniversary-list">' + annHTML + "</div>" +
      "</div></section>" +

      '<section class="section container">' +
      sectionHead("RECENT ARCHIVE · 最近入档", "最近被记下的事", "从共同的时间线上，取最近的几段。", "#/timeline", "全部记录") +
      archiveHTML +
      "</section>" +

      (q
        ? '<section class="quote-band"><div class="container reveal">' +
          '<div class="quote-band__mark" aria-hidden="true">&ldquo;</div>' +
          '<p class="quote-band__text">' + esc(q.text) + "</p>" +
          '<p class="quote-band__by">' + esc(q.by) + "</p>" +
          "</div></section>"
        : "") +

      '<section class="section container">' +
      sectionHead("IMAGES · 影像", "照片留下的地方", "有些事说不清，但一张照片就够了。", "#/gallery", "进入影像库") +
      stripHTML +
      "</section>"
    );
  }

  /* ---------------- 人物列表 ---------------- */

  function members(route) {
    var ms = S.visibleMembers();
    var allTags = [];
    ms.forEach(function (m) {
      (m.tags || []).forEach(function (t) { if (allTags.indexOf(t) < 0) allTags.push(t); });
    });
    var tag = route.query.tag || "";
    var q = (route.query.q || "").toLowerCase();

    var list = ms.filter(function (m) {
      var okTag = !tag || (m.tags || []).indexOf(tag) >= 0;
      var okQ = !q || (m.name + " " + (m.alias || "") + " " + (m.tagline || "") + " " + (m.shortBio || "") + " " + (m.role || "")).toLowerCase().indexOf(q) >= 0;
      return okTag && okQ;
    });

    var chips =
      '<a class="chip' + (!tag ? " is-active" : "") + '" href="#/members">全部</a>' +
      allTags.map(function (t) {
        return '<a class="chip' + (tag === t ? " is-active" : "") + '" href="#/members?tag=' + encodeURIComponent(t) + '">' + esc(t) + "</a>";
      }).join("");

    var rows = list.length
      ? '<div class="member-grid">' + list.map(memberCard).join("") + "</div>"
      : empty("没有找到", "换个关键词，或者看看全部档案。", "#/members", "查看全部");

    return (
      '<section class="page-hero container">' +
      '<p class="eyebrow"><span class="eyebrow__line"></span>PORTRAITS</p>' +
      '<h1 class="page-hero__title">人物档案</h1>' +
      '<p class="page-hero__desc">每个人一份。这里放着他们的姓名、他们做过的事，和那些只有亲近的人才记得的细节。</p>' +
      "</section>" +
      '<div class="container">' +
      '<div class="filters">' +
      '<div class="filters__group">' + chips + "</div>" +
      '<label class="search-box"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8.6" cy="8.6" r="5.6"/><path d="M12.8 12.8 17 17"/></svg>' +
      '<input type="search" placeholder="搜索姓名、身份、关键词" value="' + esc(route.query.q || "") + '" data-action="members-search">' +
      "</label></div>" +
      rows +
      "</div>"
    );
  }

  /* ---------------- 人物详情 ---------------- */

  var TABS = [
    { key: "profile", label: "概览" },
    { key: "story", label: "背景故事" },
    { key: "timeline", label: "时间轴" },
    { key: "album", label: "影像" },
    { key: "video", label: "视频" }
  ];

  function member(route) {
    var m = S.getMember(route.query.id || String(route.path).replace("/member/", ""));
    if (!m) {
      return '<section class="page-hero container"><h1 class="page-hero__title">找不到这份档案</h1>' +
        '<p class="page-hero__desc">它可能被删除了，或者链接不对。</p>' +
        '<p style="margin-top:26px"><a class="btn btn--ghost" href="#/members">回到人物档案</a></p></section>';
    }
    var tab = route.query.tab || "profile";
    if (!TABS.some(function (t) { return t.key === tab; })) tab = "profile";

    var dates = "";
    if (m.born) {
      dates = esc(String(m.born).slice(0, 4)) + (m.passed ? '<i></i>' + esc(String(m.passed).slice(0, 4)) : "");
    }

    var hero =
      '<section class="member-hero">' +
      (m.cover ? img(m.cover, "", "member-hero__bg", m.initial) : "") +
      '<div class="member-hero__veil"></div>' +
      '<div class="container">' +
      '<p class="eyebrow" style="margin-bottom:22px"><a href="#/members" style="color:inherit">人物档案</a> &nbsp;/&nbsp; ' + esc(m.name) + "</p>" +
      '<div class="member-hero__grid">' +
      '<div class="member-hero__portrait">' + (m.avatar ? img(m.avatar, m.name, "", m.initial) : '<div class="img-fallback" data-ph="' + esc(m.initial) + '"></div>') + "</div>" +
      "<div>" +
      '<h1 class="member-hero__name">' + esc(m.name) + "</h1>" +
      (dates ? '<div class="member-hero__dates">' + dates + "</div>" : "") +
      '<p class="member-hero__tagline">' + esc(m.tagline || m.shortBio || "") + "</p>" +
      '<div class="member-hero__tags">' +
      (m.relation ? '<span class="tag tag--gold">' + esc(m.relation) + "</span>" : "") +
      (m.role ? '<span class="tag">' + esc(m.role) + "</span>" : "") +
      (m.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") +
      "</div></div></div></div></section>";

    var tabs =
      '<div class="member-tabs"><div class="container member-tabs__inner">' +
      TABS.map(function (t) {
        return '<a class="member-tab' + (t.key === tab ? " is-active" : "") + '" href="#/member/' + esc(m.id) + "?tab=" + t.key + '">' +
          t.label + (t.key === "album" && m.photos.length ? " · " + m.photos.length : "") +
          (t.key === "video" && m.videos.length ? " · " + m.videos.length : "") + "</a>";
      }).join("") +
      "</div></div>";

    var body = "";
    if (tab === "profile") body = panelProfile(m);
    if (tab === "story") body = panelStory(m);
    if (tab === "timeline") body = panelTimeline(m);
    if (tab === "album") body = panelAlbum(m);
    if (tab === "video") body = panelVideo(m);

    return hero + tabs + '<div class="container">' + body + "</div>";
  }

  function panelProfile(m) {
    var exps = (m.experiences || []).slice().sort(function (a, b) { return String(a.year).localeCompare(String(b.year)); });
    var facts = [
      m.relation ? ["与我的关系", m.relation] : null,
      m.role ? ["身份", m.role] : null,
      m.born ? ["出生", S.fmtDate(m.born, "cn")] : null,
      m.passed ? ["离开", S.fmtDate(m.passed, "cn")] : null,
      !m.passed && m.born ? ["年龄", (new Date().getFullYear() - S.parts(m.born).y) + " 岁"] : null,
      m.passed && m.born ? ["享年", (S.parts(m.passed).y - S.parts(m.born).y) + " 岁"] : null
    ].filter(Boolean);

    return (
      '<div class="profile-layout">' +
      "<div>" +
      '<div class="prose reveal">' + String(m.shortBio || "").split("\n").map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>" +
      (exps.length
        ? '<div style="margin-top:clamp(34px,4vw,54px)" class="reveal">' +
          '<p class="eyebrow"><span class="eyebrow__line"></span>SELECTED MOMENTS</p>' +
          '<h2 style="font-size:26px;margin-bottom:24px">几件重要的事</h2>' +
          '<div class="timeline">' +
          exps.slice(0, 4).map(function (x) {
            return '<div class="tl-entry"><div class="tl-entry__year">' + esc(x.year) + "</div>" +
              '<h3 class="tl-entry__title">' + esc(x.title) + "</h3>" +
              '<p class="tl-entry__desc">' + esc(x.description || "") + "</p></div>";
          }).join("") +
          "</div>" +
          '<a class="text-link" href="#/member/' + esc(m.id) + '?tab=timeline">看完整时间轴' + arrow() + "</a>" +
          "</div>"
        : "") +
      "</div>" +
      "<aside>" +
      (facts.length
        ? '<div class="side-block reveal"><p class="side-block__title">基本信息</p><dl class="fact-list">' +
          facts.map(function (f) { return "<div><dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd></div>"; }).join("") +
          "</dl></div>"
        : "") +
      (m.quote
        ? '<blockquote class="mini-quote reveal">&ldquo;' + esc(m.quote) + "&rdquo;<cite>— " + esc(m.name) + "</cite></blockquote>"
        : "") +
      (m.photos && m.photos.length
        ? '<div class="side-block reveal"><p class="side-block__title">影像 · ' + m.photos.length + " 件</p>" +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">' +
          m.photos.slice(0, 4).map(function (p, i, arr) {
            var wide = arr.length === 3 && i === 2;
            var divStyle = "cursor:zoom-in;" + (wide ? "grid-column:span 2;" : "");
            var imgStyle = "aspect-ratio:" + (wide ? "2 / 1" : "1") + ";width:100%;object-fit:cover;filter:saturate(.7) brightness(.9)";
            return '<div style="' + divStyle + '" ' + lbData({ type: "image", src: p.src, title: p.title, meta: [m.name, p.date].filter(Boolean).join(" · ") }) + ">" +
              img(p.src, p.title || "", "gallery-item__thumb", m.initial, 'style="' + imgStyle + '"') + "</div>";
          }).join("") +
          "</div>" +
          '<p style="margin:12px 0 0"><a class="text-link" href="#/member/' + esc(m.id) + '?tab=album">全部影像' + arrow() + "</a></p></div>"
        : "") +
      "</aside></div>"
    );
  }

  function panelStory(m) {
    var paras = String(m.longBio || "").split(/\n\s*\n/).filter(function (p) { return p.trim(); });
    if (!paras.length) {
      return empty("还没有写下背景故事", "把你知道的、听来的、记得的那些事，一段一段写下来。", "#/admin", "去补充");
    }
    return (
      '<div class="profile-layout">' +
      '<div class="prose prose--lead reveal">' + paras.map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join("") + "</div>" +
      "<aside>" +
      (m.quote ? '<blockquote class="mini-quote reveal">&ldquo;' + esc(m.quote) + "&rdquo;<cite>— " + esc(m.name) + "</cite></blockquote>" : "") +
      '<div class="side-block reveal"><p class="side-block__title">相关时间</p>' +
      '<div class="timeline" style="padding-left:24px">' +
      ((m.experiences || []).slice().sort(function (a, b) { return String(a.year).localeCompare(String(b.year)); })
        .map(function (x) {
          return '<div class="tl-entry" style="padding-bottom:26px"><div class="tl-entry__year">' + esc(x.year) + "</div>" +
            '<h3 class="tl-entry__title" style="font-size:16px">' + esc(x.title) + "</h3></div>";
        }).join("") || '<p style="color:var(--faint);font-size:13px">暂无</p>') +
      "</div></div></aside></div>"
    );
  }

  function panelTimeline(m) {
    var items = (m.experiences || []).map(function (x) {
      return { sort: String(x.year || ""), year: x.year, title: x.title, desc: x.description, kind: "经历" };
    });
    S.eventsOf(m.id).forEach(function (e) {
      items.push({ sort: String(e.date || e.year || ""), year: e.year, title: e.title, desc: e.description, kind: e.type || "记录", loc: e.location });
    });
    items.sort(function (a, b) { return a.sort.localeCompare(b.sort); });

    if (!items.length) return empty("时间轴还是空的", "把重要的日子加进来。", "#/admin", "添加记录");

    return (
      '<div class="profile-layout">' +
      '<div class="timeline reveal" style="padding-left:34px">' +
      items.map(function (x, i) {
        return '<div class="tl-entry' + (x.kind !== "经历" ? " tl-entry--event" : "") + '" style="padding-bottom:38px">' +
          '<div class="tl-entry__year">' + esc(x.year || "") + "</div>" +
          '<h3 class="tl-entry__title">' + esc(x.title) + "</h3>" +
          (x.desc ? '<p class="tl-entry__desc">' + esc(x.desc) + "</p>" : "") +
          '<div class="tl-entry__meta"><span class="tag">' + esc(x.kind) + "</span>" + (x.loc ? "<span>" + esc(x.loc) + "</span>" : "") + "</div>" +
          "</div>";
      }).join("") +
      "</div>" +
      "<aside><div class=\"side-block reveal\"><p class=\"side-block__title\">统计</p><dl class=\"fact-list\">" +
      "<div><dt>记录条数</dt><dd>" + items.length + "</dd></div>" +
      "<div><dt>跨越年份</dt><dd>" + (items.length ? items[0].year + " — " + items[items.length - 1].year : "—") + "</dd></div>" +
      "</dl></div></aside></div>"
    );
  }

  function panelAlbum(m) {
    if (!m.photos.length) return empty("还没有影像", "上传照片，它们会在这里排好。", "#/admin", "去上传");
    return (
      '<div class="gallery-grid reveal">' +
      m.photos.map(function (p, i) {
        return (
          '<div class="gallery-item' + (i % 5 === 1 ? " gallery-item--tall" : "") + '" ' +
          lbData({ type: "image", src: p.src, title: p.title, meta: [m.name, p.date, p.caption].filter(Boolean).join(" · ") }) + ">" +
          img(p.src, p.title || "", "", m.initial) +
          '<div class="gallery-item__meta"><div class="gallery-item__title">' + esc(p.title || "未命名") + "</div>" +
          '<div class="gallery-item__when">' + esc([p.date, p.caption].filter(Boolean).join(" · ")) + "</div></div>" +
          "</div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function panelVideo(m) {
    if (!m.videos.length) return empty("还没有视频", "贴一个 B 站 / 腾讯视频 / YouTube 链接，或者直接上传本地视频。", "#/admin", "去添加");
    return (
      '<div class="video-frames reveal">' +
      m.videos.map(function (v) {
        var src = S.parseVideo(v.src);
        var poster = v.poster || m.cover || m.avatar;
        return (
          '<div class="video-card">' +
          '<div class="video-card__thumb" style="cursor:pointer" ' +
          lbData({ type: "video", src: v.src, title: v.title, meta: [m.name, v.date].filter(Boolean).join(" · ") }) + ">" +
          (poster ? img(poster, v.title || "", "", m.initial) : '<div class="img-fallback" data-ph="&#9654;"></div>') +
          '<div class="gallery-item__play"><span>▶</span></div>' +
          "</div>" +
          '<div class="video-card__body"><h3 class="video-card__title">' + esc(v.title || "未命名视频") + "</h3>" +
          '<p class="video-card__note">' + esc([v.date, v.note].filter(Boolean).join(" · ")) + "</p>" +
          '<p class="video-card__note" style="margin-top:6px;opacity:.7">' +
          (src.kind === "embed" ? "外链播放" : src.kind === "file" ? "本文件播放" : "源不可用") + "</p>" +
          "</div></div>"
        );
      }).join("") +
      "</div>"
    );
  }

  /* ---------------- 时间轴 ---------------- */

  function timeline() {
    var evs = S.eventsByYearAsc();
    if (!evs.length) {
      return '<section class="page-hero container"><h1 class="page-hero__title">时间轴</h1>' +
        '<p class="page-hero__desc">把重要的日子一条条放进来。</p></section>' +
        '<div class="container">' + empty("还没有记录", "先添加第一条。", "#/admin", "添加记录") + "</div>";
    }
    var groups = {};
    evs.forEach(function (e) {
      var y = e.year || String(e.date || "").slice(0, 4) || "未标注";
      (groups[y] = groups[y] || []).push(e);
    });
    var years = Object.keys(groups).sort();

    return (
      '<section class="page-hero container">' +
      '<p class="eyebrow"><span class="eyebrow__line"></span>TIMELINE</p>' +
      '<h1 class="page-hero__title">时间轴</h1>' +
      '<p class="page-hero__desc">所有被记下来的日子，按年份排好。有些是相遇，有些是离开，有些只是普普通通的一天。</p>' +
      "</section>" +
      '<div class="container">' +
      years.map(function (y) {
        return (
          '<div class="year-group">' +
          '<div class="year-group__year">' + esc(y) + "<small>" + groups[y].length + " 条</small></div>" +
          '<div class="year-group__items">' +
          groups[y].map(function (e) {
            var names = e.memberIds.map(function (id) { var m = S.getMember(id); return m ? m.name : ""; }).filter(Boolean);
            return (
              '<div class="tl-entry reveal">' +
              '<div class="tl-entry__year">' + esc(S.fmtDate(e.date || e.year, "dot")) + "</div>" +
              '<h3 class="tl-entry__title">' + esc(e.title) + "</h3>" +
              (e.description ? '<p class="tl-entry__desc">' + esc(e.description) + "</p>" : "") +
              '<div class="tl-entry__meta">' +
              (e.type ? '<span class="tag tag--gold">' + esc(e.type) + "</span>" : "") +
              (e.location ? "<span>" + esc(e.location) + "</span>" : "") +
              names.map(function (n) { return "<span>· " + esc(n) + "</span>"; }).join("") +
              "</div></div>"
            );
          }).join("") +
          "</div></div>"
        );
      }).join("") +
      "</div>"
    );
  }

  /* ---------------- 影像库 ---------------- */

  function gallery(route) {
    var tab = route.query.type || "all";
    var photos = S.allPhotos();
    var videos = S.allVideos();

    var items = [];
    if (tab !== "video") {
      photos.forEach(function (p) {
        items.push({ kind: "image", src: p.src, title: p.title, date: p.date, caption: p.caption, member: p.memberName, memberId: p.memberId });
      });
    }
    if (tab !== "image") {
      videos.forEach(function (v) {
        items.push({ kind: "video", src: v.src, poster: v.poster, title: v.title, date: v.date, caption: v.note, member: v.memberName, memberId: v.memberId });
      });
    }

    var chips = [
      { k: "all", l: "全部 · " + (photos.length + videos.length) },
      { k: "image", l: "影像 · " + photos.length },
      { k: "video", l: "视频 · " + videos.length }
    ].map(function (c) {
      return '<a class="chip' + (tab === c.k ? " is-active" : "") + '" href="#/gallery' + (c.k === "all" ? "" : "?type=" + c.k) + '">' + c.l + "</a>";
    }).join("");

    var grid = items.length
      ? '<div class="gallery-grid">' +
        items.map(function (it, i) {
          if (it.kind === "image") {
            return '<div class="gallery-item' + (i % 7 === 2 ? " gallery-item--tall" : "") + '" ' +
              lbData({ type: "image", src: it.src, title: it.title, meta: [it.member, it.date, it.caption].filter(Boolean).join(" · ") }) + ">" +
              img(it.src, it.title || "", "", "影") +
              '<div class="gallery-item__meta"><div class="gallery-item__title">' + esc(it.title || "未命名") + "</div>" +
              '<div class="gallery-item__when">' + esc([it.member, it.date].filter(Boolean).join(" · ")) + "</div></div></div>";
          }
          var poster = it.poster || "";
          return '<div class="gallery-item" ' + lbData({ type: "video", src: it.src, title: it.title, meta: [it.member, it.date].filter(Boolean).join(" · ") }) + ">" +
            (poster ? img(poster, it.title || "", "", "影") : '<div class="img-fallback" data-ph="&#9654;" style="aspect-ratio:4/3"></div>') +
            '<div class="gallery-item__play"><span>▶</span></div>' +
            '<div class="gallery-item__meta"><div class="gallery-item__title">' + esc(it.title || "未命名") + "</div>" +
            '<div class="gallery-item__when">' + esc([it.member, it.date].filter(Boolean).join(" · ")) + "</div></div></div>";
        }).join("") +
        "</div>"
      : empty("影像库是空的", "上传照片或添加视频后，会在这里汇总。", "#/admin", "去上传");

    return (
      '<section class="page-hero container">' +
      '<p class="eyebrow"><span class="eyebrow__line"></span>IMAGES &amp; VIDEO</p>' +
      '<h1 class="page-hero__title">影像库</h1>' +
      '<p class="page-hero__desc">所有影像按人物归档，也在这里汇总。点开可以看大图或播放。</p>' +
      "</section>" +
      '<div class="container">' +
      '<div class="filters"><div class="filters__group">' + chips + "</div></div>" +
      grid +
      "</div>"
    );
  }

  /* ---------------- 404 ---------------- */

  function notFound() {
    return (
      '<section class="page-hero container">' +
      '<p class="eyebrow"><span class="eyebrow__line"></span>404</p>' +
      '<h1 class="page-hero__title">这里什么都没有</h1>' +
      '<p class="page-hero__desc">链接可能写错了，或者这一页已经不在。</p>' +
      '<p style="margin-top:30px"><a class="btn btn--ghost" href="#/home">回到首页</a></p>' +
      "</section>"
    );
  }

  window.VIEWS = {
    header: header,
    footer: footer,
    home: home,
    members: members,
    member: member,
    timeline: timeline,
    gallery: gallery,
    notFound: notFound,
    helpers: { img: img, arrow: arrow, sectionHead: sectionHead, empty: empty, lbData: lbData, memberCard: memberCard }
  };
})();
