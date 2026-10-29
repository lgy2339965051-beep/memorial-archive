/* =========================================================
   store.js · 数据层
   - 数据持久化：localStorage
   - 图片：压缩后以 dataURL 存进数据（可随 JSON 导出、可上线）
   - 视频：本地上传存 IndexedDB（体积大），外链直接存 URL
   ========================================================= */

(function () {
  "use strict";

  var KEY = "memorial-archive-v1";
  var DB_NAME = "memorial-media";
  var DB_STORE = "blobs";

  /* ---------------- 基础工具 ---------------- */

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  /* ---------------- 日期 ---------------- */

  // 支持 "1998" / "1998-07" / "1998-07-14"
  function parts(str) {
    var m = String(str || "").match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
    if (!m) return null;
    return { y: +m[1], m: m[2] ? +m[2] : null, d: m[3] ? +m[3] : null };
  }

  function fmtDate(str, style) {
    var p = parts(str);
    if (!p) return "";
    if (style === "dot") return p.y + "." + pad2(p.m || 1) + "." + pad2(p.d || 1);
    if (style === "cn") {
      if (p.m == null) return p.y + " 年";
      if (p.d == null) return p.y + " 年 " + p.m + " 月";
      return p.y + " 年 " + p.m + " 月 " + p.d + " 日";
    }
    if (p.m == null) return String(p.y);
    if (p.d == null) return p.y + "." + pad2(p.m);
    return p.y + "." + pad2(p.m) + "." + pad2(p.d);
  }

  function monthDay(str) {
    var p = parts(str);
    if (!p || p.m == null || p.d == null) return "";
    return pad2(p.m) + "." + pad2(p.d);
  }

  // 距离下一次周年还有多少天
  function daysToAnniversary(str) {
    var p = parts(str);
    if (!p || p.m == null || p.d == null) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var next = new Date(now.getFullYear(), p.m - 1, p.d);
    if (next < today) next = new Date(now.getFullYear() + 1, p.m - 1, p.d);
    return Math.round((next - today) / 86400000);
  }

  function yearsSince(str) {
    var p = parts(str);
    if (!p) return null;
    return new Date().getFullYear() - p.y;
  }

  function lifeSpan(m) {
    var b = parts(m.born);
    var d = parts(m.passed);
    if (!b) return "";
    if (!d) return b.y + " 年生";
    return b.y + " — " + d.y;
  }

  /* ---------------- IndexedDB（视频等大文件） ---------------- */

  var dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("no idb"));
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function idbPut(key, blob) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put(blob, key);
        tx.oncomplete = function () { resolve(key); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbGet(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readonly");
        var req = tx.objectStore(DB_STORE).get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbDel(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      });
    });
  }

  // key -> objectURL
  var blobURLs = {};

  function hydrateMedia() {
    var keys = [];
    (state.data.members || []).forEach(function (m) {
      (m.videos || []).forEach(function (v) {
        if (v && typeof v.src === "string" && v.src.indexOf("idb:") === 0) keys.push(v.src.slice(4));
      });
    });
    if (!keys.length) return Promise.resolve();
    return Promise.all(
      keys.map(function (k) {
        return idbGet(k)
          .then(function (blob) {
            if (blob) blobURLs[k] = URL.createObjectURL(blob);
          })
          .catch(function () {});
      })
    );
  }

  /* ---------------- 图片压缩 ---------------- */

  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  // 压到最长边 max 像素，输出 jpeg
  function compressImage(file, max, quality) {
    max = max || 1600;
    quality = quality || 0.82;
    if (!/^image\//.test(file.type)) return Promise.reject(new Error("不是图片文件"));
    if (/gif|svg/.test(file.type)) return readAsDataURL(file);
    return readAsDataURL(file)
      .then(loadImage)
      .then(function (img) {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        var scale = Math.min(1, max / Math.max(w, h));
        var cw = Math.round(w * scale);
        var ch = Math.round(h * scale);
        var cv = document.createElement("canvas");
        cv.width = cw;
        cv.height = ch;
        var ctx = cv.getContext("2d");
        ctx.fillStyle = "#0b100e";
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, 0, 0, cw, ch);
        return cv.toDataURL("image/jpeg", quality);
      });
  }

  /* ---------------- 视频源解析 ---------------- */

  var VIDEO_EXT = /\.(mp4|webm|ogv|ogg|mov|m4v)(\?|#|$)/i;

  function parseVideo(src) {
    if (!src) return { kind: "none" };
    if (src.indexOf("idb:") === 0) {
      var key = src.slice(4);
      var url = blobURLs[key];
      return url ? { kind: "file", url: url } : { kind: "missing" };
    }
    if (VIDEO_EXT.test(src)) return { kind: "file", url: src };

    var m;
    if ((m = src.match(/(?:bilibili\.com\/video\/|^)(BV[0-9A-Za-z]{10})/))) {
      return {
        kind: "embed",
        url: "https://player.bilibili.com/player.html?bvid=" + m[1] + "&page=1&high_quality=1&autoplay=0&danmaku=0"
      };
    }
    if ((m = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/))) {
      return { kind: "embed", url: "https://www.youtube.com/embed/" + m[1] };
    }
    if ((m = src.match(/vimeo\.com\/(?:video\/)?(\d+)/))) {
      return { kind: "embed", url: "https://player.vimeo.com/video/" + m[1] };
    }
    if ((m = src.match(/v\.qq\.com\/(?:x\/page|cover\/[^/]+\/[^/]+)\/([\w]+)\.html/))) {
      return { kind: "embed", url: "https://v.qq.com/txp/iframe/player.html?vid=" + m[1] };
    }
    if (/^https?:\/\//.test(src)) return { kind: "embed", url: src };
    return { kind: "missing" };
  }

  /* ---------------- 状态 ---------------- */

  var state = {
    data: null,
    session: { admin: false }
  };

  // 判断一份数据是不是早期的内置示例（早期版本的样本人物 id 固定）
  function isLegacyDemo(d) {
    if (!d || !Array.isArray(d.members)) return false;
    var ids = { "m-shen-zhiwei": 1, "m-lu-yanqing": 1, "m-cheng-weixi": 1, "m-xu-nanzhi": 1 };
    var hit = d.members.filter(function (m) { return m && ids[m.id]; }).length;
    return hit >= 2; // 两三个都命中，基本可以确定是示例数据，不是自己填的
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.members) {
          if (isLegacyDemo(parsed)) {
            // 之前浏览时留下的示例数据，直接丢弃，回到空白骨架
            try { localStorage.removeItem(KEY); } catch (e2) {}
          } else {
            state.data = normalize(parsed);
            return state.data;
          }
        }
      } catch (e) {
        console.warn("数据读取失败，回退到初始数据", e);
      }
    }
    state.data = normalize(clone(window.SEED_DATA));
    return state.data;
  }

  function normalize(d) {
    d.site = d.site || {};
    d.members = Array.isArray(d.members) ? d.members : [];
    d.events = Array.isArray(d.events) ? d.events : [];
    d.members.forEach(function (m, i) {
      m.id = m.id || uid("m");
      m.tags = Array.isArray(m.tags) ? m.tags : [];
      m.experiences = Array.isArray(m.experiences) ? m.experiences : [];
      m.photos = Array.isArray(m.photos) ? m.photos : [];
      m.videos = Array.isArray(m.videos) ? m.videos : [];
      if (typeof m.order !== "number") m.order = i + 1;
      if (m.visible === undefined) m.visible = true;
      m.initial = m.initial || (m.name || "?").slice(0, 1);
    });
    d.members.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    d.events.forEach(function (e) {
      e.id = e.id || uid("e");
      e.memberIds = Array.isArray(e.memberIds) ? e.memberIds : [];
    });
    return d;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state.data));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  function resetToSeed() {
    state.data = normalize(clone(window.SEED_DATA));
    save();
  }

  function clearAll() {
    // 清空内容，但保留站点信息（站名、首页大图这些不属于"人物"）
    state.data = normalize({
      version: 1,
      site: clone(window.SEED_DATA.site),
      members: [],
      events: []
    });
    save();
  }

  /* ---------------- 查询 ---------------- */

  function members() {
    return state.data.members;
  }

  function visibleMembers() {
    return state.data.members.filter(function (m) { return m.visible !== false; });
  }

  function getMember(id) {
    return state.data.members.find(function (m) { return m.id === id; }) || null;
  }

  function events() {
    return state.data.events.slice().sort(function (a, b) {
      return String(b.date || b.year || "").localeCompare(String(a.date || a.year || ""));
    });
  }

  function eventsOf(memberId) {
    return events().filter(function (e) { return e.memberIds.indexOf(memberId) >= 0; });
  }

  function eventsByYearAsc() {
    return events().slice().reverse();
  }

  function allPhotos() {
    var out = [];
    visibleMembers().forEach(function (m) {
      (m.photos || []).forEach(function (p) {
        out.push(Object.assign({}, p, { memberId: m.id, memberName: m.name }));
      });
    });
    return out;
  }

  function allVideos() {
    var out = [];
    visibleMembers().forEach(function (m) {
      (m.videos || []).forEach(function (v) {
        out.push(Object.assign({}, v, { memberId: m.id, memberName: m.name }));
      });
    });
    return out;
  }

  function upcomingAnniversaries(n) {
    var list = visibleMembers()
      .filter(function (m) { return m.memorialDate && daysToAnniversary(m.memorialDate) !== null; })
      .map(function (m) { return { member: m, days: daysToAnniversary(m.memorialDate), years: yearsSince(m.memorialDate) }; })
      .sort(function (a, b) { return a.days - b.days; });
    return list.slice(0, n || 4);
  }

  function stats() {
    var ms = visibleMembers();
    return {
      memberCount: ms.length,
      timelineCount: state.data.events.length + ms.reduce(function (s, m) { return s + (m.experiences || []).length; }, 0),
      mediaCount: allPhotos().length + allVideos().length,
      photoCount: allPhotos().length,
      videoCount: allVideos().length,
      startYear: state.data.site.est || "",
      quote: pickQuote()
    };
  }

  function pickQuote() {
    var pool = [];
    visibleMembers().forEach(function (m) {
      if (m.quote) pool.push({ text: m.quote, by: m.name + (m.role ? " · " + m.role : "") });
    });
    if (!pool.length) return null;
    var day = Math.floor(Date.now() / 86400000);
    return pool[day % pool.length];
  }

  /* ---------------- 检索 ---------------- */

  function search(q) {
    q = String(q || "").trim().toLowerCase();
    if (!q) return [];
    var out = [];
    var hit = function (text) { return String(text || "").toLowerCase().indexOf(q) >= 0; };

    visibleMembers().forEach(function (m) {
      var fields = [m.name, m.alias, m.role, m.relation, m.tagline, m.shortBio, m.longBio, m.quote]
        .concat(m.tags || [])
        .concat((m.experiences || []).map(function (x) { return x.title + " " + x.description + " " + x.year; }))
        .concat((m.photos || []).map(function (p) { return p.title + " " + p.caption; }))
        .concat((m.videos || []).map(function (v) { return v.title + " " + v.note; }));
      if (fields.some(hit)) {
        out.push({ kind: "人物", title: m.name, meta: [m.role, m.tagline].filter(Boolean).join(" · "), href: "#/member/" + m.id });
      }
      (m.photos || []).forEach(function (p) {
        if (hit(p.title) || hit(p.caption) || hit(p.date)) {
          out.push({ kind: "影像", title: p.title || "未命名影像", meta: [m.name, p.date].filter(Boolean).join(" · "), href: "#/member/" + m.id + "?tab=album" });
        }
      });
      (m.videos || []).forEach(function (v) {
        if (hit(v.title) || hit(v.note) || hit(v.date)) {
          out.push({ kind: "视频", title: v.title || "未命名视频", meta: [m.name, v.date].filter(Boolean).join(" · "), href: "#/member/" + m.id + "?tab=video" });
        }
      });
    });

    events().forEach(function (e) {
      if (hit(e.title) || hit(e.description) || hit(e.location) || hit(e.year) || hit(e.type)) {
        var names = e.memberIds.map(function (id) { var m = getMember(id); return m ? m.name : ""; }).filter(Boolean);
        out.push({ kind: "时间轴", title: e.title, meta: [e.year, e.location, names.join(" · ")].filter(Boolean).join(" · "), href: "#/timeline" });
      }
    });

    return out.slice(0, 18);
  }

  /* ---------------- 导出 / 导入 ---------------- */

  function exportJSON() {
    return JSON.stringify(state.data, null, 2);
  }

  function importJSON(text) {
    var parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.members)) throw new Error("格式不对：缺少 members 数组");
    state.data = normalize(parsed);
    save();
    return true;
  }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || "application/json;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* ---------------- 导出到 window ---------------- */

  window.STORE = {
    state: state,
    load: load,
    save: save,
    resetToSeed: resetToSeed,
    clearAll: clearAll,
    normalize: normalize,
    members: members,
    visibleMembers: visibleMembers,
    getMember: getMember,
    events: events,
    eventsOf: eventsOf,
    eventsByYearAsc: eventsByYearAsc,
    allPhotos: allPhotos,
    allVideos: allVideos,
    upcomingAnniversaries: upcomingAnniversaries,
    stats: stats,
    search: search,
    exportJSON: exportJSON,
    importJSON: importJSON,
    download: download,
    hydrateMedia: hydrateMedia,
    compressImage: compressImage,
    idbPut: idbPut,
    idbGet: idbGet,
    idbDel: idbDel,
    parseVideo: parseVideo,
    blobURLs: blobURLs,
    // utils
    esc: esc,
    uid: uid,
    fmtDate: fmtDate,
    monthDay: monthDay,
    lifeSpan: lifeSpan,
    yearsSince: yearsSince,
    daysToAnniversary: daysToAnniversary,
    parts: parts
  };
})();
