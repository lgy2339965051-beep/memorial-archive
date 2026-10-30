/* =========================================================
   editor.js · 站内编辑器
   所有内容都在这里录入：站点信息 / 人物 / 时间轴 / 数据备份
   ========================================================= */

(function () {
  "use strict";

  var S = window.STORE;
  var esc = S.esc;

  /* ---------------- 表单小组件 ---------------- */

  function field(label, control, hint) {
    return (
      '<div class="field"><label class="field__label"><span>' + esc(label) + "</span>" +
      (hint ? '<span class="field__hint">' + esc(hint) + "</span>" : "") +
      "</label>" + control + "</div>"
    );
  }

  function input(name, value, placeholder, type) {
    return '<input class="input" data-field="' + name + '" type="' + (type || "text") + '" value="' + esc(value || "") + '" placeholder="' + esc(placeholder || "") + '">';
  }

  function textarea(name, value, placeholder, tall) {
    return '<textarea class="textarea' + (tall ? " textarea--tall" : "") + '" data-field="' + name + '" placeholder="' + esc(placeholder || "") + '">' + esc(value || "") + "</textarea>";
  }

  function uploadBox(kind, value, opts) {
    opts = opts || {};
    var preview = "";
    if (kind === "image") {
      preview = value
        ? '<img class="upload__preview" src="' + esc(value) + '" alt="" data-ph="图" onerror="window.__imgFail(this)">'
        : '<span class="upload__preview" style="display:grid;place-items:center;color:var(--faint);font-size:10px">无</span>';
    } else {
      preview = '<span class="upload__preview" style="display:grid;place-items:center;color:var(--faint);font-size:16px">▶</span>';
    }
    var name = value
      ? (String(value).indexOf("data:") === 0 ? "已上传图片（约 " + Math.round(String(value).length / 1365) + " KB）" : String(value).indexOf("idb:") === 0 ? "已上传视频（存在本机）" : value.slice(0, 54))
      : opts.empty || "未选择";

    return (
      '<div class="upload" data-uploadbox data-field-name="' + (opts.field || "") + '">' +
      preview +
      '<div class="upload__body">' +
      '<div class="upload__name" data-upload-name>' + esc(name) + "</div>" +
      '<div class="upload__actions">' +
      '<label class="upload__btn">选择文件<input type="file" ' + (kind === "image" ? 'accept="image/*"' : 'accept="video/*"') +
      '" data-upload="' + kind + '" hidden></label>' +
      '<button type="button" class="upload__btn" data-action="clear-upload">清除</button>' +
      "</div></div>" +
      '<input type="hidden" data-field="' + (opts.field || "") + '" data-sub="' + (opts.field || "") + '" value="' + esc(value || "") + '">' +
      "</div>"
    );
  }

  function panel(title, body, extra) {
    return (
      '<section class="panel"><h2 class="panel__title"><span>' + esc(title) + "</span>" +
      '<span style="display:flex;gap:8px">' + (extra || "") + "</span></h2>" + body + "</section>"
    );
  }

  /* ---------------- 重复块 ---------------- */

  function expItem(x, i) {
    x = x || {};
    return (
      '<div class="repeat-item" data-repeat="exp">' +
      '<div class="repeat-item__head"><span>经历 ' + (i + 1) + '</span><button type="button" class="repeat-item__del" data-action="del-repeat">×</button></div>' +
      '<div class="field-row field-row--3">' +
      field("年份", '<input class="input" data-sub="year" value="' + esc(x.year || "") + '" placeholder="1998">') +
      field("标题", '<input class="input" data-sub="title" value="' + esc(x.title || "") + '" placeholder="第一次上山">') +
      field("地点（可选）", '<input class="input" data-sub="location" value="' + esc(x.location || "") + '" placeholder="">') +
      "</div>" +
      field("描述", '<textarea class="textarea" data-sub="description" placeholder="一两句话说明这件事">' + esc(x.description || "") + "</textarea>") +
      "</div>"
    );
  }

  function photoItem(p, i) {
    p = p || {};
    return (
      '<div class="repeat-item" data-repeat="photo">' +
      '<div class="repeat-item__head"><span>影像 ' + (i + 1) + '</span><button type="button" class="repeat-item__del" data-action="del-repeat">×</button></div>' +
      '<input type="hidden" data-sub="id" value="' + esc(p.id || "") + '">' +
      uploadBox("image", p.src, { field: "src", empty: "选择一张照片（会自动压缩）" }) +
      '<div class="field-row" style="margin-top:12px">' +
      field("标题", '<input class="input" data-sub="title" value="' + esc(p.title || "") + '" placeholder="巷子口的早晨">') +
      field("年份", '<input class="input" data-sub="date" value="' + esc(p.date || "") + '" placeholder="2009">') +
      "</div>" +
      field("说明", '<input class="input" data-sub="caption" value="' + esc(p.caption || "") + '" placeholder="照片背后的那一句话">') +
      "</div>"
    );
  }

  function videoItem(v, i) {
    v = v || {};
    var isLocal = /^idb:/.test(v.src || "");
    return (
      '<div class="repeat-item" data-repeat="video">' +
      '<div class="repeat-item__head"><span>视频 ' + (i + 1) + '</span><button type="button" class="repeat-item__del" data-action="del-repeat">×</button></div>' +
      '<input type="hidden" data-sub="id" value="' + esc(v.id || "") + '">' +
      field("视频地址", '<input class="input" data-sub="src" value="' + esc(isLocal ? "" : v.src || "") + '" placeholder="B站 / 腾讯视频 / YouTube 链接，或 mp4 直链">', "贴链接") +
      '<div style="margin:-6px 0 14px;color:var(--faint);font-size:11px">或者从电脑里选一个视频文件（只存在本机浏览器，适合自己看）</div>' +
      uploadBox("video", isLocal ? v.src : "", { field: "src-file", empty: "选择本地视频文件" }) +
      '<div class="field-row" style="margin-top:12px">' +
      field("标题", '<input class="input" data-sub="title" value="' + esc(v.title || "") + '" placeholder="个展开幕那晚">') +
      field("年份", '<input class="input" data-sub="date" value="' + esc(v.date || "") + '" placeholder="2019">') +
      "</div>" +
      field("说明", '<input class="input" data-sub="note" value="' + esc(v.note || "") + '" placeholder="这段视频里有什么">') +
      field("封面图（可选）", uploadBox("image", v.poster, { field: "poster", empty: "不选就用人物封面" })) +
      "</div>"
    );
  }

  /* ---------------- 页面：站点 ---------------- */

  function siteTab() {
    var s = S.state.data.site;
    return (
      '<div class="hint-bar"><b>提示</b><span>这里改的是全站的名字、标题语和首页大图。停下手 1 秒会自动保存，不用记着点按钮。</span></div>' +
      panel("站点信息",
        '<div class="field-row">' +
        field("站点名称", input("name", s.name, "纪念档案")) +
        field("英文副标题", input("en", s.en, "MEMORIAL ARCHIVE")) +
        "</div>" +
        '<div class="field-row field-row--3">' +
        field("起始年份", input("est", s.est, "2013")) +
        field("所在地", input("location", s.location, "杭州")) +
        field("水印文字", input("watermark", s.watermark, "纪念档案 · 私人留存")) +
        "</div>" +
        field("首页主标语", input("motto", s.motto, "把相逢，留在时间里。"), "一句话，放在大标题下面") +
        field("首页引言", textarea("lede", s.lede, "两行以内最好，换行会原样显示")) +
        field("页脚说明", textarea("footerNote", s.footerNote, "说明这份档案的性质")) +
        field("首页大图", uploadBox("image", s.heroImage, { field: "heroImage", empty: "建议横图，1600×900 以上" }), "会铺满整个首屏，建议偏暗的照片") +
        '<div class="admin-actions"><button class="btn btn--gold btn--sm" type="button" data-action="save-site">保存站点信息</button>' +
        '<span class="admin-actions__note">保存后立即生效</span></div>'
      )
    );
  }

  /* ---------------- 页面：人物 ---------------- */

  function memberSideList(members, activeId) {
    var items = members
      .map(function (m, i) {
        return (
          '<a class="admin-side__item' + (m.id === activeId ? " is-active" : "") + '" href="#/admin?tab=members&id=' + esc(m.id) + '">' +
          (m.avatar ? '<img src="' + esc(m.avatar) + '" alt="" data-ph="' + esc(m.initial) + '" onerror="window.__imgFail(this)">' : '<span style="width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--line);color:var(--faint);font-size:11px">' + esc(m.initial) + "</span>") +
          "<span>" + esc(m.name) + (m.visible === false ? "（隐藏）" : "") + "</span>" +
          '<span class="admin-side__num">' + String(i + 1).padStart(2, "0") + "</span></a>"
        );
      })
      .join("");
    return (
      '<div class="admin-side">' +
      '<div class="admin-side__head"><span>人物 · ' + members.length + '</span>' +
      '<button class="upload__btn" type="button" data-action="new-member">+ 新建</button></div>' +
      '<div class="admin-side__list">' + (items || '<p style="padding:16px;color:var(--faint);font-size:12px">还没有人物</p>') + "</div></div>"
    );
  }

  function memberForm(m) {
    var isNew = !m;
    m = m || { id: "", name: "", tags: [], experiences: [], photos: [], videos: [], visible: true, order: S.members().length + 1 };
    var tagsValue = (m.tags || []).join("，");

    return (
      '<div class="hint-bar"><b>' + (isNew ? "新建人物" : "编辑中：" + esc(m.name)) + '</b><span>' + (isNew ? "填上姓名，点一次「保存这份档案」建好；之后每次改动都会自动保存。" : "改动会自动保存，不用点按钮。") + '</span></div>' +

      panel("基本资料",
        '<div class="field-row field-row--3">' +
        field("姓名 *", input("name", m.name, "沈知微")) +
        field("称谓 / 别名", input("alias", m.alias, "外婆")) +
        field("首字（用于印章）", input("initial", m.initial, "留空自动取姓")) +
        "</div>" +
        '<div class="field-row field-row--3">' +
        field("与我的关系", input("relation", m.relation, "外婆 / 父亲 / 挚友")) +
        field("身份 / 职业", input("role", m.role, "中学语文教师")) +
        field("排序", input("order", m.order, "1", "number")) +
        "</div>" +
        field("一句话印象", input("tagline", m.tagline, "她批改作文时，从不改掉学生写错的比喻。"), "显示在卡片和详情页顶部") +
        field("标签", input("tags", tagsValue, "家人，语文教师，手写"), "用逗号分隔，最多显示 2 个在卡片上") +
        '<div class="field-row">' +
        field("头像", uploadBox("image", m.avatar, { field: "avatar", empty: "建议竖图 3:4" })) +
        field("封面图", uploadBox("image", m.cover, { field: "cover", empty: "详情页背景，建议横图" })) +
        "</div>"
      ) +

      panel("生平与日期",
        '<div class="field-row field-row--3">' +
        field("出生", input("born", m.born, "1938-03-12", "date")) +
        field("离开（健在留空）", input("passed", m.passed, "", "date")) +
        field("纪念日", input("memorialDate", m.memorialDate, "2013-09-07", "date"), "会出现在首页倒计时") +
        "</div>" +
        field("纪念日名称", input("memorialLabel", m.memorialLabel, "离开的日子"), "比如「共同创立」「初次同行」") +
        field("简短介绍", textarea("shortBio", m.shortBio, "两三句话，出现在概览页")) +
        field("一句他自己说过的话", textarea("quote", m.quote, "好的句子不用力，它只是把事情说清楚了。"))
      ) +

      panel("背景故事",
        field("长文", textarea("longBio", m.longBio, "一段一段地写。空一行就会分成新的段落。第一段的首字会自动放大。", true), "空行 = 分段") +
        '<div class="hint-bar" style="margin:14px 0 0"><span>写的时候不用讲究文采，把事情写清楚就够了。细节比形容词有用：他几点起床、抽屉里有什么、最后一句没写完的话是什么。</span></div>'
      ) +

      panel("经历（时间轴）",
        '<div id="exp-list">' + ((m.experiences || []).length ? m.experiences.map(expItem).join("") : '<p class="repeat-empty">还没有经历条目</p>') + "</div>" +
        '<button class="btn btn--ghost btn--sm" type="button" data-action="add-repeat" data-template="exp" data-target="#exp-list">+ 添加一条经历</button>'
      ) +

      panel("影像（照片）",
        '<div id="photo-list">' + ((m.photos || []).length ? m.photos.map(photoItem).join("") : '<p class="repeat-empty">还没有照片</p>') + "</div>" +
        '<button class="btn btn--ghost btn--sm" type="button" data-action="add-repeat" data-template="photo" data-target="#photo-list">+ 添加一张照片</button>'
      ) +

      panel("视频",
        '<div id="video-list">' + ((m.videos || []).length ? m.videos.map(videoItem).join("") : '<p class="repeat-empty">还没有视频</p>') + "</div>" +
        '<button class="btn btn--ghost btn--sm" type="button" data-action="add-repeat" data-template="video" data-target="#video-list">+ 添加一段视频</button>'
      ) +

      panel("显示设置",
        '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;color:var(--ivory-soft);font-size:13px">' +
        '<input type="checkbox" data-field="visible" ' + (m.visible !== false ? "checked" : "") + ' style="accent-color:#c8aa72">' +
        "在网站上显示这份档案</label>" +
        '<div class="admin-actions">' +
        '<button class="btn btn--gold btn--sm" type="button" data-action="save-member" data-id="' + esc(m.id) + '">保存这份档案</button>' +
        (isNew ? "" : '<button class="btn btn--danger btn--sm" type="button" data-action="del-member" data-id="' + esc(m.id) + '">删除</button>') +
        (isNew ? "" : '<a class="btn btn--ghost btn--sm" href="#/member/' + esc(m.id) + '">预览</a>') +
        '<span class="admin-actions__note">保存后可点预览查看效果</span>' +
        "</div>"
      )
    );
  }

  /* ---------------- 页面：时间轴 ---------------- */

  function eventForm(e) {
    var isNew = !e;
    e = e || { id: "", memberIds: [] };
    var memberChecks = S.members()
      .map(function (m) {
        var checked = (e.memberIds || []).indexOf(m.id) >= 0 ? "checked" : "";
        return (
          '<label style="display:inline-flex;align-items:center;gap:6px;margin:0 14px 8px 0;color:var(--ivory-soft);font-size:12.5px;cursor:pointer">' +
          '<input type="checkbox" data-member="' + esc(m.id) + '" ' + checked + ">" +
          esc(m.name) + "</label>"
        );
      })
      .join("");

    return (
      panel(isNew ? "新建时间轴记录" : "编辑记录",
        '<div class="field-row field-row--3">' +
        field("年份 *", input("year", e.year, "2014")) +
        field("具体日期", input("date", e.date, "2014-05-02", "date")) +
        field("类型", input("type", e.type, "远行 / 相遇 / 纪念 / 日常")) +
        "</div>" +
        field("标题 *", input("title", e.title, "滇西北，十一天")) +
        field("描述", textarea("description", e.description, "这件事发生的经过，或者你为什么记得它")) +
        field("地点", input("location", e.location, "滇西北")) +
        field("涉及的人", '<div style="padding:8px 0">' + (memberChecks || '<span style="color:var(--faint);font-size:12px">先去建人物档案</span>') + "</div>") +
        '<div class="admin-actions">' +
        '<button class="btn btn--gold btn--sm" type="button" data-action="save-event" data-id="' + esc(e.id) + '">保存</button>' +
        (isNew ? "" : '<button class="btn btn--danger btn--sm" type="button" data-action="del-event" data-id="' + esc(e.id) + '">删除</button>') +
        "</div>"
      )
    );
  }

  /* ---------------- 发布到线上（GitHub Contents API） ---------------- */

  var PUB_KEY = "memorial-archive-publish";
  var PUB_DEFAULT = { owner: "lgy2339965051-beep", repo: "memorial-archive", branch: "main" };

  function pubCfg() {
    var d = {};
    try { d = JSON.parse(localStorage.getItem(PUB_KEY) || "{}") || {}; } catch (e) { d = {}; }
    return {
      owner: d.owner || PUB_DEFAULT.owner,
      repo: d.repo || PUB_DEFAULT.repo,
      branch: d.branch || PUB_DEFAULT.branch,
      token: d.token || "",
      auto: !!d.auto,
      pushed: d.pushed || ""
    };
  }

  function setPubCfg(c) {
    try { localStorage.setItem(PUB_KEY, JSON.stringify(c)); return true; } catch (e) { return false; }
  }

  function readPubForm() {
    var c = pubCfg();
    var q = function (k) {
      var el = document.querySelector('[data-pub="' + k + '"]');
      return el ? String(el.value || "").trim() : "";
    };
    var parts = q("repo-path").split("/");
    var autoEl = document.querySelector('[data-pub="auto"]');
    return {
      owner: (parts[0] || c.owner).trim(),
      repo: (parts[1] || c.repo).trim(),
      branch: q("branch") || c.branch,
      token: q("token") || c.token,
      auto: autoEl ? !!autoEl.checked : c.auto,
      pushed: c.pushed
    };
  }

  function seedText() {
    var head =
      "/* =========================================================\n" +
      "   站点数据（由后台「发布到线上」自动生成）\n" +
      "   覆盖本项目 assets/data.js，线上即为这份内容。\n" +
      "   ========================================================= */\n\n";
    return head + "window.SEED_DATA = " + S.exportJSON() + ";\n";
  }

  function b64utf8(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    var CH = 8192;
    for (var i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    return btoa(bin);
  }

  function ghFetch(c, url, opts) {
    opts = opts || {};
    var headers = {
      Authorization: "Bearer " + c.token,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    };
    opts.headers = headers;
    return fetch(url, opts).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = JSON.parse(t); } catch (e) {}
        return { ok: r.ok, status: r.status, body: j };
      });
    });
  }

  function ghMsg(res) {
    if (res.status === 401) return "令牌无效或已过期（401）";
    if (res.status === 403) return "令牌没有写入权限，或触发了频率限制（403）";
    if (res.status === 404) return "找不到仓库，或令牌无权访问（404）";
    if (res.status === 409) return "文件冲突，刷新页面后重试（409）";
    if (res.body && res.body.message) return res.body.message + "（" + res.status + "）";
    return "HTTP " + res.status;
  }

  function setPubStatus(text, bad) {
    var el = document.getElementById("pub-status");
    if (!el) return;
    el.textContent = text;
    el.style.color = bad ? "#c96a5a" : "var(--gold)";
  }

  function contentsUrl(c) {
    return (
      "https://api.github.com/repos/" + encodeURIComponent(c.owner) + "/" +
      encodeURIComponent(c.repo) + "/contents/assets/data.js"
    );
  }

  function unb64utf8(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16);
  }

  function publishNow(opts) {
    opts = opts || {};
    var quiet = !!opts.quiet;
    var c = pubCfg();
    if (!c.token) {
      setPubStatus("还没有填 GitHub 令牌", true);
      if (!quiet) toast("先在下面填入 GitHub 令牌");
      return Promise.resolve({ ok: false, msg: "no-token" });
    }
    var base = contentsUrl(c);
    var local = seedText();
    var localHash = hashStr(local);

    setPubStatus("正在发布…");

    var doPut = function (sha) {
      var payload = {
        message: "更新站点内容 · " + new Date().toLocaleString("zh-CN"),
        content: b64utf8(local),
        branch: c.branch
      };
      if (sha) payload.sha = sha;
      return ghFetch(c, base, { method: "PUT", body: JSON.stringify(payload) }).then(function (res) {
        if (!res.ok) throw new Error(ghMsg(res));
        var cfg = pubCfg();
        cfg.pushed = localHash;
        setPubCfg(cfg);
        var localVid = 0;
        (S.state.data.members || []).forEach(function (m) {
          (m.videos || []).forEach(function (v) {
            if (v && String(v.src || "").indexOf("idb:") === 0) localVid++;
          });
        });
        var tail = localVid ? "（含 " + localVid + " 个本机视频，别人看不到）" : "";
        setPubStatus("已提交 · " + new Date().toLocaleTimeString("zh-CN") + " · 约 1 分钟后线上生效" + tail);
        if (!quiet) toast("已发布，约 1 分钟后线上更新" + tail);
        return { ok: true };
      });
    };

    return ghFetch(c, base + "?ref=" + encodeURIComponent(c.branch))
      .then(function (res) {
        if (!res.ok && res.status !== 404) throw new Error(ghMsg(res));
        var sha = res.body && res.body.sha;
        var remoteHash = null;
        if (res.ok && res.body && res.body.content) {
          try {
            remoteHash = hashStr(unb64utf8(String(res.body.content).replace(/\s+/g, "")));
          } catch (e) {
            remoteHash = null;
          }
        }
        var conflict = !!(c.pushed && remoteHash && remoteHash !== c.pushed);

        if (conflict && quiet) {
          setPubStatus("线上已有别的设备发布的新版本，本次自动发布已跳过", true);
          return { ok: false, msg: "conflict" };
        }
        if (conflict) {
          return new Promise(function (resolve) {
            window.APP.confirm(
              "线上内容比这台设备的更新",
              "可能你在手机或另一台电脑上改过并发布了。继续发布会用当前内容覆盖它，那边的改动会丢失。建议先点「从线上读取最新内容」。仍然继续吗？",
              function () {
                doPut(sha).then(resolve).catch(function (e) {
                  resolve({ ok: false, msg: e.message });
                });
              }
            );
          });
        }
        return doPut(sha);
      })
      .catch(function (e) {
        var msg = e && e.message ? e.message : String(e);
        setPubStatus("发布失败：" + msg, true);
        if (!quiet) toast("发布失败：" + msg);
        return { ok: false, msg: msg };
      });
  }

  function pullFromRemote() {
    var c = pubCfg();
    if (!c.token) {
      setPubStatus("还没有填 GitHub 令牌", true);
      return;
    }
    if (window.APP && window.APP.confirm) {
      window.APP.confirm(
        "用线上内容覆盖这台设备？",
        "这台设备上还没发布的修改（比如刚加的照片）会被线上版本覆盖，覆盖后找不回来。确定继续吗？",
        function () { doPull(c); }
      );
      return;
    }
    doPull(c);
  }

  function doPull(c) {
    setPubStatus("正在读取线上内容…");
    ghFetch(c, contentsUrl(c) + "?ref=" + encodeURIComponent(c.branch))
      .then(function (res) {
        if (!res.ok) throw new Error(ghMsg(res));
        var text = unb64utf8(String((res.body && res.body.content) || "").replace(/\s+/g, ""));
        var m = text.match(/window\.SEED_DATA\s*=\s*([\s\S]*);\s*$/);
        if (!m) throw new Error("线上文件格式无法识别");
        var data = JSON.parse(m[1]);
        S.importJSON(JSON.stringify(data));
        var cfg = pubCfg();
        cfg.pushed = hashStr(text);
        setPubCfg(cfg);
        setPubStatus("已同步线上内容 · " + new Date().toLocaleTimeString("zh-CN"));
        toast("已读取线上最新内容");
        if (window.APP) window.APP.rerender();
      })
      .catch(function (e) {
        setPubStatus("读取失败：" + (e && e.message ? e.message : e), true);
      });
  }

  function testConn() {
    var c = pubCfg();
    if (!c.token) { setPubStatus("还没有填 GitHub 令牌", true); return; }
    setPubStatus("正在测试连接…");
    fetch(
      "https://api.github.com/repos/" + encodeURIComponent(c.owner) + "/" + encodeURIComponent(c.repo),
      { headers: { Authorization: "Bearer " + c.token, Accept: "application/vnd.github+json" } }
    )
      .then(function (r) {
        return r.json().then(function (j) {
          if (r.ok) setPubStatus("连接正常 · " + (j.full_name || "") + " · 默认分支 " + (j.default_branch || ""));
          else setPubStatus("连接失败：" + ghMsg({ status: r.status, body: j }), true);
        });
      })
      .catch(function (e) {
        setPubStatus("连接失败：" + (e.message || e), true);
      });
  }

  function afterSave() {
    var c = pubCfg();
    if (c.auto && c.token) publishNow({ quiet: true });
  }

  /* ---------------- 页面：数据 ---------------- */

  function dataTab() {
    var pc = pubCfg();
    return (
      '<div class="hint-bar"><b>重要</b><span>数据存在这台电脑的浏览器里。换电脑、换浏览器、清理缓存都会丢失，所以定期点「下载备份文件」存一份 JSON 到硬盘上。</span></div>' +
      panel("备份与恢复",
        '<div class="admin-actions" style="border:0;padding-top:0;margin:0 0 18px">' +
        '<button class="btn btn--gold btn--sm" type="button" data-action="export-json">下载备份文件</button>' +
        '<label class="btn btn--ghost btn--sm" style="cursor:pointer">导入备份文件<input type="file" accept=".json,application/json" data-action="import-json" hidden></label>' +
        '<button class="btn btn--danger btn--sm" type="button" data-action="clear-all">清空全部数据</button>' +
        "</div>" +
        '<div class="admin-actions" style="border:0;padding-top:0;margin:0 0 16px">' +
        '<button class="btn btn--gold btn--sm" type="button" data-action="export-seed">导出为 data.js（上线用）</button>' +
        "</div>" +
        '<p style="color:var(--muted);font-size:12.5px;line-height:1.9;margin:0">' +
        '· <b style="color:var(--ivory-soft)">日常更新</b>：改完内容会自动保存到这台电脑的浏览器，点下面「直接发布到线上」的「发布到线上」（或勾上自动发布）才会同步到网站上。<br>' +
        "· 图片上传后会被压缩并直接存进数据里，备份文件就包含所有照片，可以带到别的电脑。<br>" +
        "· 本地上传的视频体积大，存在浏览器本地库里，不会进入 JSON 备份；正式上线时建议改用 B 站 / 腾讯视频的外链。<br>" +
        "· 备份文件就是全站内容的原文，你也可以用文本编辑器直接改。" +
        "</p>"
      ) +
      panel("直接发布到线上",
        '<p style="color:var(--muted);font-size:12.5px;line-height:1.9;margin:0 0 16px">' +
        "改完内容点「发布到线上」，约 1 分钟后线上更新；勾上自动发布则每次保存都会同步。令牌只在你填过的这台设备上有效，换设备要再填一次；<b style=\"color:var(--ivory-soft)\">换设备后请先点「从线上读取最新内容」</b>，否则会用旧草稿覆盖线上。" +
        "</p>" +
        field("仓库", '<input class="input" data-pub="repo-path" value="' + esc(pc.owner + "/" + pc.repo) + '" placeholder="用户名/仓库名">', "格式：用户名/仓库名") +
        field("分支", '<input class="input" data-pub="branch" value="' + esc(pc.branch) + '" placeholder="main">') +
        field("GitHub 令牌", '<input class="input" data-pub="token" type="password" value="' + esc(pc.token) + '" placeholder="github_pat_… 或 ghp_…">', "只存本机浏览器") +
        '<label style="display:flex;align-items:center;gap:8px;margin:0 0 16px;color:var(--ivory-soft);font-size:13px;cursor:pointer">' +
        '<input type="checkbox" data-pub="auto" ' + (pc.auto ? "checked" : "") + "> 每次保存后自动发布" +
        "</label>" +
        '<div class="admin-actions">' +
        '<button class="btn btn--gold btn--sm" type="button" data-action="publish">发布到线上</button>' +
        '<button class="btn btn--ghost btn--sm" type="button" data-action="save-pub">保存设置</button>' +
        '<button class="btn btn--ghost btn--sm" type="button" data-action="test-pub">测试连接</button>' +
        '<button class="btn btn--ghost btn--sm" type="button" data-action="pull-remote">从线上读取最新内容</button>' +
        "</div>" +
        '<p id="pub-status" style="font-size:12.5px;margin:0 0 12px;color:var(--gold)">' +
        (pc.token ? "已配置 · " + esc(pc.owner + "/" + pc.repo) + " · " + esc(pc.branch) : "尚未配置令牌") +
        "</p>" +
        '<p style="color:var(--faint);font-size:12px;line-height:1.85;margin:0">' +
        "· 令牌去 GitHub → Settings → Developer settings → Personal access tokens → Fine-grained token 生成，只授权这个仓库，权限勾 <b>Contents: Read and write</b>。<br>" +
        "· 令牌只保存在你自己的浏览器里，不会写进网站代码。别人打开网站拿不到令牌，也就改不了你的内容。<br>" +
        "· 内容里如果有本地上传的视频，线上会是空位；先换成 B 站 / 腾讯视频外链再发布。" +
        "</p>"
      ) +
      panel("直接编辑数据（高级）",
        '<p style="color:var(--faint);font-size:12px;margin:0 0 12px">下面是当前全部数据的 JSON。改完点「应用修改」。</p>' +
        '<textarea class="textarea json-area" id="json-editor">' + esc(S.exportJSON()) + "</textarea>" +
        '<div class="admin-actions"><button class="btn btn--gold btn--sm" type="button" data-action="apply-json">应用修改</button>' +
        '<span class="admin-actions__note">格式错误会提示，不会破坏原有数据</span></div>'
      )
    );
  }

  /* ---------------- 主渲染 ---------------- */

  function render(route) {
    curRoute = route;
    var tab = route.query.tab || "members";
    var tabs = [
      { k: "members", l: "人物" },
      { k: "timeline", l: "时间轴" },
      { k: "site", l: "站点信息" },
      { k: "data", l: "数据备份" }
    ];
    var ms = S.members();
    var content = "";

    if (tab === "site") content = siteTab();
    else if (tab === "timeline") {
      var evs = S.events();
      var activeId = route.query.id || "";
      var active = evs.filter(function (e) { return e.id === activeId; })[0] || null;
      var side =
        '<div class="admin-side"><div class="admin-side__head"><span>记录 · ' + evs.length + '</span>' +
        '<button class="upload__btn" type="button" data-action="new-event">+ 新建</button></div>' +
        '<div class="admin-side__list">' +
        (evs.map(function (e) {
          return '<a class="admin-side__item' + (e.id === activeId ? " is-active" : "") + '" href="#/admin?tab=timeline&id=' + esc(e.id) + '">' +
            '<span class="admin-side__num" style="margin:0 8px 0 0">' + esc(e.year || "") + "</span><span>" + esc(e.title) + "</span></a>";
        }).join("") || '<p style="padding:16px;color:var(--faint);font-size:12px">还没有记录</p>') +
        "</div></div>";
      content = '<div class="admin-grid">' + side + "<div>" + eventForm(active) + "</div></div>";
    } else if (tab === "data") {
      content = dataTab();
    } else {
      var mActiveId = route.query.id || "";
      var mActive = S.getMember(mActiveId);
      tab = "members";
      content = '<div class="admin-grid">' + memberSideList(ms, mActiveId) + "<div>" + (mActive || mActiveId === "new" ? memberForm(mActive) : emptyPick()) + "</div></div>";
    }

    return (
      '<div class="container admin">' +
      '<div class="admin-head"><div><p class="eyebrow" style="margin-bottom:10px"><span class="eyebrow__line"></span>EDITOR</p>' +
      "<h1>录入与管理</h1>" +
      '<p class="admin-head__sub">这里填的所有内容，都会立刻出现在网站上。</p></div>' +
      '<div class="admin-head__actions">' +
      '<a class="btn btn--ghost btn--sm" href="#/home">回到网站</a>' +
      '<button class="btn btn--solid btn--sm" type="button" data-action="save-all">保存全部</button>' +
      "</div></div>" +
      '<div class="admin-tabs">' +
      tabs.map(function (t) {
        return '<a class="admin-tab' + (tab === t.k ? " is-active" : "") + '" href="#/admin?tab=' + t.k + '">' + t.l + "</a>";
      }).join("") +
      "</div>" +
      content +
      '<div class="autosave-note" id="autosave-note" hidden></div>' +
      "</div>"
    );
  }

  function emptyPick() {
    var none = S.members().length === 0;
    return (
      '<div class="empty"><h3 class="empty__title">' + (none ? "先建第一份档案" : "从左边选一个人") + "</h3>" +
      '<p class="empty__desc">' + (none
        ? "填上姓名、日期和你知道的那些事，保存后立刻出现在网站上。"
        : "或者新建一份档案，把姓名、日期和故事填进去。") + "</p>" +
      '<button class="btn btn--gold btn--sm" type="button" data-action="new-member">+ 新建人物档案</button></div>'
    );
  }

  /* ---------------- 读写 ---------------- */

  function getVal(name) {
    var el = document.querySelector('[data-field="' + name + '"]');
    if (!el) return "";
    if (el.type === "checkbox") return el.checked;
    return el.value.trim();
  }

  function collectRepeats(kind, container) {
    var root = document.querySelector(container);
    if (!root) return [];
    return Array.prototype.map.call(root.querySelectorAll('[data-repeat="' + kind + '"]'), function (item) {
      var obj = {};
      item.querySelectorAll("[data-sub]").forEach(function (el) {
        obj[el.getAttribute("data-sub")] = el.value.trim();
      });
      if (kind === "photo" || kind === "video") {
        obj.id = obj.id || S.uid("p");
      }
      return obj;
    }).filter(function (o) {
      if (kind === "exp") return o.year || o.title;
      if (kind === "photo") return o.src;
      if (kind === "video") return o.src;
      return true;
    });
  }

  /* 把表单内容写进 state，不保存、不跳转、不提示（自动保存与手动保存共用） */
  function applyMember(id) {
    var d = S.state.data;
    var isNew = !id;
    var m = isNew ? {} : S.getMember(id);
    if (!m) return null;

    var name = getVal("name");
    if (!name) return null;

    m.name = name;
    m.alias = getVal("alias");
    m.initial = getVal("initial") || name.slice(0, 1);
    m.relation = getVal("relation");
    m.role = getVal("role");
    m.order = Number(getVal("order")) || (d.members.length + 1);
    m.tagline = getVal("tagline");
    m.tags = getVal("tags").split(/[,，、]/).map(function (s) { return s.trim(); }).filter(Boolean);
    m.avatar = getVal("avatar");
    m.cover = getVal("cover");
    m.born = getVal("born");
    m.passed = getVal("passed");
    m.memorialDate = getVal("memorialDate") || m.passed || "";
    m.memorialLabel = getVal("memorialLabel");
    m.shortBio = getVal("shortBio");
    m.quote = getVal("quote");
    m.longBio = getVal("longBio");
    m.visible = !!getVal("visible");
    m.experiences = collectRepeats("exp", "#exp-list").map(function (x) {
      return { year: x.year, title: x.title, description: x.description, location: x.location };
    });
    m.photos = collectRepeats("photo", "#photo-list");
    m.videos = collectRepeats("video", "#video-list").map(function (v) {
      var fileVal = v["src-file"];
      if (fileVal && fileVal.indexOf("idb:") === 0) v.src = fileVal;
      delete v["src-file"];
      if (v.poster === undefined) v.poster = "";
      return v;
    });

    return { member: m, isNew: isNew };
  }

  function saveMember(id) {
    var r = applyMember(id);
    if (!r) {
      toast(id ? "姓名不能为空" : "先填个姓名再保存");
      return;
    }
    var m = r.member;
    if (r.isNew) {
      m.id = S.uid("m");
      S.state.data.members.push(m);
      S.normalize(S.state.data);
    }
    if (S.save()) {
      toast("已保存");
      afterSave();
      location.hash = "#/admin?tab=members&id=" + m.id;
      if (window.APP) window.APP.rerender();
    } else {
      toast("保存失败：可能是图片太多超出浏览器容量");
    }
  }

  function applySite() {
    var s = S.state.data.site;
    ["name", "en", "est", "location", "motto", "lede", "footerNote", "heroImage", "watermark"].forEach(function (k) {
      s[k] = getVal(k);
    });
    return true;
  }

  function saveSite() {
    applySite();
    S.save();
    toast("站点信息已保存");
    afterSave();
    if (window.APP) window.APP.rerender();
  }

  function applyEvent(id) {
    var d = S.state.data;
    var isNew = !id;
    var e = isNew ? {} : d.events.filter(function (x) { return x.id === id; })[0];
    if (!e) return null;
    e.year = getVal("year") || String(getVal("date") || "").slice(0, 4);
    e.date = getVal("date") || e.year;
    e.title = getVal("title");
    e.description = getVal("description");
    e.type = getVal("type");
    e.location = getVal("location");
    e.memberIds = Array.prototype.map.call(document.querySelectorAll("[data-member]"), function (el) {
      return el.checked ? el.getAttribute("data-member") : null;
    }).filter(Boolean);
    if (!e.title) return null;
    return { event: e, isNew: isNew };
  }

  function saveEvent(id) {
    var r = applyEvent(id);
    if (!r) { toast("标题不能为空"); return; }
    var e = r.event;
    if (r.isNew) {
      e.id = S.uid("e");
      S.state.data.events.push(e);
    }
    S.save();
    toast("已保存");
    afterSave();
    location.hash = "#/admin?tab=timeline&id=" + e.id;
    if (window.APP) window.APP.rerender();
  }

  function toast(msg) {
    if (window.APP) window.APP.toast(msg);
  }

  /* ---------------- 自动保存 ---------------- */

  var curRoute = null;     // 当前后台路由，由 render 写入
  var saveTimer = null;    // 防抖：写草稿
  var pubTimer = null;     // 防抖：自动发布
  var publishing = false;  // 是否有发布正在进行

  function clock() {
    return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }

  var noteTimer = null;

  function setNote(text, kind) {
    var el = document.getElementById("autosave-note");
    if (!el) return;
    clearTimeout(noteTimer);
    if (!text) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false;
    el.textContent = text;
    el.className = "autosave-note" + (kind === "bad" ? " is-bad" : kind === "ok" ? " is-ok" : "");
    if (kind === "ok") {
      // 成功提示停留几秒后自动消失，不遮挡内容
      noteTimer = setTimeout(function () {
        var e2 = document.getElementById("autosave-note");
        if (e2 && e2.textContent === text) e2.hidden = true;
      }, 3600);
    }
  }

  /* 当前正在编辑的对象。返回 null 表示这一页没有可自动保存的对象 */
  function editTarget() {
    var q = (curRoute && curRoute.query) || {};
    var tab = q.tab || "members";
    var id = q.id || "";
    if (tab === "site") return { kind: "site" };
    if (tab === "timeline") return id && id !== "new" ? { kind: "event", id: id } : null;
    if (tab === "data") return null;
    return id && id !== "new" ? { kind: "member", id: id } : null;
  }

  function applyTarget(t) {
    if (!t) return false;
    if (t.kind === "site") return applySite();
    if (t.kind === "member") return !!applyMember(t.id);
    if (t.kind === "event") return !!applyEvent(t.id);
    return false;
  }

  function schedulePublish(delay) {
    clearTimeout(pubTimer);
    pubTimer = setTimeout(function () {
      var c = pubCfg();
      if (!c.auto || !c.token) return;
      if (publishing) { schedulePublish(3000); return; }
      if (hashStr(seedText()) === c.pushed) {
        setNote("已自动保存 " + clock() + " · 内容与线上一致", "ok");
        return;
      }
      publishing = true;
      setNote("正在自动发布…");
      publishNow({ quiet: true }).then(function (r) {
        publishing = false;
        if (r && r.ok) {
          setNote("已自动发布 " + clock() + " · 约 1 分钟后线上生效", "ok");
        } else if (r && r.msg === "conflict") {
          setNote("已保存到本机，但线上有别的设备发布的新版本，自动发布已跳过", "bad");
        } else {
          setNote("已保存到本机，自动发布未成功：" + ((r && r.msg) || "网络问题") + "，可点「发布到线上」重试", "bad");
        }
      });
    }, delay || 3500);
  }

  /* 把当前表单内容写进浏览器存储（不跳转、不打断输入） */
  function autosaveNow() {
    var t = editTarget();
    if (!t) return;
    if (!applyTarget(t)) {
      // 姓名为空这类情况：不覆盖旧数据，也不打扰用户
      return;
    }
    if (!S.save()) {
      setNote("自动保存失败：可能是图片太多超出浏览器容量", "bad");
      return;
    }
    var c = pubCfg();
    if (c.auto && c.token) {
      setNote("已自动保存 " + clock() + " · 稍后自动发布");
      schedulePublish();
    } else {
      setNote("已自动保存 " + clock(), "ok");
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(autosaveNow, 900);
  }

  /* ---------------- 事件绑定 ---------------- */

  var TEMPLATES = { exp: expItem, photo: photoItem, video: videoItem };

  function bind() {
    // 输入即自动保存
    document.addEventListener("input", function (ev) {
      if (!curRoute || curRoute.path !== "/admin") return;
      var el = ev.target;
      if (!el || !el.closest || !el.closest(".admin")) return;
      if (el.closest('[data-action="import-json"]')) return;
      scheduleSave();
    });

    document.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-action]");
      if (!btn) return;
      if (btn.tagName === "INPUT") return;
      var action = btn.getAttribute("data-action");

      // 手动保存/发布时取消排队中的自动保存，避免重复提交
      if (/^(save-|publish$)/.test(action)) {
        clearTimeout(saveTimer);
        clearTimeout(pubTimer);
      }

      if (action === "add-repeat") {
        var target = document.querySelector(btn.getAttribute("data-target"));
        var tpl = btn.getAttribute("data-template");
        var count = target.querySelectorAll('[data-repeat="' + tpl + '"]').length;
        var holder = document.createElement("div");
        holder.innerHTML = TEMPLATES[tpl]({}, count);
        if (target.querySelector(".repeat-empty")) target.querySelector(".repeat-empty").remove();
        target.appendChild(holder.firstElementChild);
        scheduleSave();
      }

      if (action === "del-repeat") {
        var item = btn.closest(".repeat-item");
        if (item) item.remove();
        scheduleSave();
      }

      if (action === "clear-upload") {
        var box = btn.closest("[data-uploadbox]");
        var hidden = box.querySelector('input[type="hidden"]');
        hidden.value = "";
        var nameEl = box.querySelector("[data-upload-name]");
        if (nameEl) nameEl.textContent = "未选择";
        var prev = box.querySelector("img.upload__preview");
        if (prev) prev.remove();
      }

      if (action === "new-member") {
        location.hash = "#/admin?tab=members&id=new";
      }

      if (action === "save-member") {
        saveMember(btn.getAttribute("data-id"));
      }

      if (action === "save-site") saveSite();
      if (action === "save-event") saveEvent(btn.getAttribute("data-id"));

      if (action === "save-all") {
        // 保存当前可见表单
        if (document.querySelector('[data-action="save-member"]')) saveMember(document.querySelector('[data-action="save-member"]').getAttribute("data-id"));
        else if (document.querySelector('[data-action="save-site"]')) saveSite();
        else if (document.querySelector('[data-action="save-event"]')) saveEvent(document.querySelector('[data-action="save-event"]').getAttribute("data-id"));
        else { S.save(); toast("已保存"); }
      }

      if (action === "del-member") {
        var id = btn.getAttribute("data-id");
        window.APP.confirm("删除这份档案？", "「" + (S.getMember(id) || {}).name + "」的所有内容都会被移除，此操作不可撤销。", function () {
          S.state.data.members = S.state.data.members.filter(function (m) { return m.id !== id; });
          S.state.data.events.forEach(function (e) {
            e.memberIds = e.memberIds.filter(function (x) { return x !== id; });
          });
          S.save();
          toast("已删除");
          location.hash = "#/admin?tab=members";
          if (window.APP) window.APP.rerender();
        });
      }

      if (action === "del-event") {
        var eid = btn.getAttribute("data-id");
        window.APP.confirm("删除这条记录？", "删除后时间轴上就看不到了。", function () {
          S.state.data.events = S.state.data.events.filter(function (e) { return e.id !== eid; });
          S.save();
          toast("已删除");
          location.hash = "#/admin?tab=timeline";
          if (window.APP) window.APP.rerender();
        });
      }

      if (action === "save-pub" || action === "publish" || action === "test-pub" || action === "pull-remote") {
        setPubCfg(readPubForm());
        if (action === "save-pub") toast("发布设置已保存");
        if (action === "publish") publishNow({});
        if (action === "test-pub") testConn();
        if (action === "pull-remote") {
          window.APP.confirm("用线上的内容覆盖本机？", "这台浏览器里未发布的改动会被替换掉。", pullFromRemote);
        }
        return;
      }

      if (action === "export-json") {
        S.download("纪念档案-备份-" + new Date().toISOString().slice(0, 10) + ".json", S.exportJSON());
        toast("备份文件已开始下载");
      }

      if (action === "export-seed") {
        var localVideos = 0;
        (S.state.data.members || []).forEach(function (m) {
          (m.videos || []).forEach(function (v) {
            if (v && String(v.src || "").indexOf("idb:") === 0) localVideos++;
          });
        });
        var writeSeed = function () {
          var head =
            "/* =========================================================\n" +
            "   站点数据（由后台「导出为 data.js」生成）\n" +
            "   直接覆盖本项目 assets/data.js，上传后线上就是这份内容。\n" +
            "   ========================================================= */\n\n";
          S.download("data.js", head + "window.SEED_DATA = " + S.exportJSON() + ";\n", "application/javascript;charset=utf-8");
          toast("data.js 已下载，覆盖 assets/data.js 后即可上线");
        };
        if (localVideos) {
          window.APP.confirm(
            "有 " + localVideos + " 个本地视频不会生效",
            "本地上传的视频只存在你这台电脑的浏览器里，导出后这些位置在线上会是空的。建议先把它们换成 B 站 / 腾讯视频外链，再导出。仍要继续吗？",
            writeSeed
          );
        } else {
          writeSeed();
        }
      }

      if (action === "clear-all") {
        window.APP.confirm("清空全部数据？", "所有人物、故事、影像都会消失。请先确认已经下载了备份文件。", function () {
          S.clearAll();
          toast("已清空，可以开始录入");
          location.hash = "#/admin?tab=members";
          if (window.APP) window.APP.rerender();
        });
      }

      if (action === "apply-json") {
        var ta = document.getElementById("json-editor");
        try {
          S.importJSON(ta.value);
          toast("已应用修改");
          afterSave();
          if (window.APP) window.APP.rerender();
        } catch (err) {
          toast("JSON 格式有误：" + err.message);
        }
      }
    });

    // 文件上传
    document.addEventListener("change", function (ev) {
      var inp = ev.target;

      if (inp.matches('[data-action="import-json"]')) {
        var f = inp.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            S.importJSON(fr.result);
            toast("导入成功");
            location.hash = "#/admin?tab=members";
            if (window.APP) window.APP.rerender();
          } catch (err) {
            toast("导入失败：" + err.message);
          }
        };
        fr.readAsText(f);
        return;
      }

      var kind = inp.getAttribute("data-upload");
      if (!kind) return;
      var file = inp.files[0];
      if (!file) return;
      var box = inp.closest("[data-uploadbox]");
      var hidden = box.querySelector('input[type="hidden"]');
      var nameEl = box.querySelector("[data-upload-name]");

      if (kind === "image") {
        if (nameEl) nameEl.textContent = "处理中…";
        S.compressImage(file, 1600, 0.82)
          .then(function (dataUrl) {
            hidden.value = dataUrl;
            var prev = box.querySelector("img.upload__preview");
            if (prev) prev.src = dataUrl;
            else {
              var ph = box.querySelector(".upload__preview");
              if (ph) {
                var im = document.createElement("img");
                im.className = "upload__preview";
                im.src = dataUrl;
                ph.replaceWith(im);
              }
            }
            if (nameEl) nameEl.textContent = "已上传（约 " + Math.round(dataUrl.length / 1365) + " KB）";
            scheduleSave();
          })
          .catch(function () { if (nameEl) nameEl.textContent = "读取失败，换一张试试"; });
      }

      if (kind === "video") {
        if (nameEl) nameEl.textContent = "读取中…";
        var key = S.uid("v");
        S.idbPut(key, file)
          .then(function () {
            hidden.value = "idb:" + key;
            if (nameEl) nameEl.textContent = "已存入本机 · " + file.name + "（" + (file.size / 1048576).toFixed(1) + " MB）";
            scheduleSave();
            // 立即生成可播放地址
            return S.idbGet(key).then(function (blob) {
              S.blobURLs[key] = URL.createObjectURL(blob);
            });
          })
          .catch(function () { if (nameEl) nameEl.textContent = "存入失败，文件可能太大"; });
      }
    });
  }

  window.EDITOR = { render: render, bind: bind };
})();
