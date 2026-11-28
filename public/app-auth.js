/**
 * /app-auth 桥接页逻辑（外置脚本：站点 CSP 不允许内联脚本）。
 *
 * 流程：
 *  - 普通网页登录/注册：POST /api/auth/login|register（带 Turnstile token）
 *    → POST /api/auth/site-login/issue 换一次性 ticket → starlr://auth 深链回 App
 *  - 旧 APK 的 preauth 流程：POST /api/auth/app-login/confirm → ticket → 深链
 *  - Turnstile 由 /api/config 下发的 sitekey 渲染；未配置时直接表单登录
 */
(function () {
  'use strict';

  // ---- 主题：与 frontend-x 的 starlr.theme 保持一致（默认暗色） ----
  try {
    // frontend-x 用 starlr.theme；经典版前端用 xc-theme（light/dark/system）
    var savedTheme = localStorage.getItem('starlr.theme') || localStorage.getItem('xc-theme');
    var theme = savedTheme === 'light'
      ? 'light'
      : (savedTheme === 'system'
        ? ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light')
        : 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'light' ? '#ffffff' : '#000000');
  } catch (e) {
    /* 隐私模式下 localStorage 不可用，保持默认暗色 */
  }

  function init() {
    var el = function (id) { return document.getElementById(id); };
    var msgEl = el('msg');
    var goBtn = el('go');
    var formEl = el('form-box');
    var params = new URLSearchParams(location.search);
    var mode = params.get('mode') === 'register' ? 'register' : 'login';
    var preauth = params.get('preauth');
    var preauthName = params.get('name') || '';
    var siteKey = null;
    var turnstileToken = null;
    var submitting = false;

    function say(text, isError) {
      msgEl.textContent = text || '';
      msgEl.className = isError ? 'err' : '';
    }

    function updateButton() {
      goBtn.disabled = submitting || (siteKey != null && !turnstileToken);
    }

    function setLoading(on) {
      submitting = on;
      updateButton();
    }

    function fail(text) {
      say(text, true);
      submitting = false;
      updateButton();
    }

    // 模式切换 UI
    if (mode === 'register') {
      var pageTitle = document.querySelector('h1');
      if (pageTitle) pageTitle.textContent = '应用注册';
      document.title = '应用注册 · Starlr';
      el('sub').textContent = '注册完成后自动返回应用';
      el('f-email').style.display = '';
      el('f-nick').style.display = '';
      el('go').textContent = '注册';
      el('switch').textContent = '已有账号？去登录';
      el('switch').href = '?';
      el('password').setAttribute('autocomplete', 'new-password');
    } else {
      el('switch').textContent = '注册新账号';
      el('switch').href = '?mode=register';
    }

    // 旧 APK 的 preauth：App 内已校验过账号密码，这里只需完成人机验证
    if (preauth) {
      Array.prototype.forEach.call(document.querySelectorAll('#form-box .field'), function (node) {
        node.style.display = 'none';
      });
      el('switch').style.display = 'none';
      el('sub').textContent = '以账号「' + (preauthName || '已验证用户') + '」继续，完成人机验证后自动返回应用（无需再次输入密码）';
      el('go').textContent = mode === 'register' ? '完成人机验证并注册' : '完成人机验证并返回应用';
    }

    function randomHex(n) {
      var a = new Uint8Array(n);
      crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }

    function post(path, body, auth) {
      return fetch(path, {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          auth ? { Authorization: 'Bearer ' + auth } : {},
        ),
        body: JSON.stringify(body),
      }).then(function (r) {
        return r.json()
          .catch(function () { throw new Error('服务器返回异常响应（HTTP ' + r.status + '）'); })
          .then(function (j) {
            if (!r.ok || j.error) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
            return j;
          });
      });
    }

    function returnToApp(ticket, challenge) {
      if (!ticket) {
        fail('服务器未返回登录凭证，请重试');
        return;
      }
      formEl.style.display = 'none';
      el('switch').style.display = 'none';
      el('back').style.display = 'block';
      say('验证通过，正在返回应用…');
      var appUrl = 'starlr://auth?ticket=' + encodeURIComponent(ticket) + '&challenge=' + encodeURIComponent(challenge);
      el('back-link').href = appUrl;
      // Chrome 需 intent:// 协议从网页拉起应用；同时保留手动按钮兜底
      var intentUrl = 'intent://auth?ticket=' + encodeURIComponent(ticket) + '&challenge=' + encodeURIComponent(challenge) +
        '#Intent;scheme=starlr;package=com.starlr.app;end';
      setTimeout(function () { window.location.replace(intentUrl); }, 300);
    }

    function afterLogin(token) {
      if (!token) {
        fail('登录成功但未返回凭证，请重试');
        return;
      }
      say('登录成功，正在生成返回凭证…');
      var challenge = randomHex(16);
      return post('/api/auth/site-login/issue', { origin: location.origin, challenge: challenge }, token)
        .then(function (j) { returnToApp(j.ticket, challenge); });
    }

    function submit() {
      if (submitting) return;

      if (preauth) {
        var challenge = randomHex(16);
        setLoading(true);
        say('正在确认…');
        post('/api/auth/app-login/confirm', {
          preauth: preauth,
          challenge: challenge,
          origin: location.origin,
          turnstileToken: turnstileToken,
        })
          .then(function (j) { returnToApp(j.ticket, challenge); })
          .catch(function (e) {
            if (String(e.message).indexOf('预授权') !== -1) {
              say('预授权已过期，正在切换到网页表单…');
              setTimeout(function () {
                location.href = '/app-auth' + (mode === 'register' ? '?mode=register' : '');
              }, 1200);
            } else {
              fail('操作失败：' + e.message);
            }
          });
        return;
      }

      var identifier = el('identifier').value.trim();
      var password = el('password').value;
      if (!identifier) return fail('请输入用户名或邮箱');
      if (!password) return fail('请输入密码');

      setLoading(true);
      if (mode === 'login') {
        say('正在登录…');
        post('/api/auth/login', {
          identifier: identifier,
          password: password,
          turnstileToken: turnstileToken,
        })
          .then(function (j) { return afterLogin(j.accessToken || j.token); })
          .catch(function (e) { fail('登录失败：' + e.message); });
      } else {
        var email = el('email').value.trim();
        if (!email) return fail('请输入邮箱');
        var nickname = el('nickname').value.trim();
        say('正在注册…');
        post('/api/auth/register', {
          username: identifier,
          email: email,
          password: password,
          nickname: nickname || undefined,
          turnstileToken: turnstileToken,
        })
          .then(function (j) { return afterLogin(j.accessToken || j.token); })
          .catch(function (e) { fail('注册失败：' + e.message); });
      }
    }

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      submit();
    });

    function loadTurnstile() {
      var script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileReady&render=explicit';
      script.async = true;
      script.defer = true;
      script.onerror = function () { fail('人机验证组件加载失败，请检查网络后重试'); };
      document.head.appendChild(script);

      window.onTurnstileReady = function () {
        try {
          window.turnstile.render('#cf-widget', {
            sitekey: siteKey,
            theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
            language: 'zh-cn',
            callback: function (t) {
              turnstileToken = t;
              updateButton();
              say('');
            },
            'error-callback': function (code) {
              fail('人机验证加载失败' + (code ? '（' + code + '）' : '') + '，请重试');
            },
            'expired-callback': function () {
              turnstileToken = null;
              updateButton();
              say('人机验证已过期，请重新完成验证');
            },
            'timeout-callback': function () {
              turnstileToken = null;
              updateButton();
              say('人机验证超时，请重试');
            },
          });
          say('请完成下方人机验证');
        } catch (e) {
          fail('人机验证初始化失败，请重试');
        }
      };
    }

    goBtn.disabled = true;
    fetch('/api/config', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (cfg) {
        siteKey = cfg.turnstileSiteKey || null;
        if (cfg.siteName) {
          el('site-name').textContent = cfg.siteName;
          el('foot').textContent = cfg.siteName + ' · Cloudflare';
          document.title = (mode === 'register' ? '应用注册' : '应用登录') + ' · ' + cfg.siteName;
        }
        if (!siteKey) {
          updateButton();
          say(preauth ? '点击下方按钮继续' : (mode === 'register' ? '填写信息完成注册' : '输入账号密码登录'));
          return;
        }
        say('正在加载人机验证…');
        loadTurnstile();
      })
      .catch(function (e) {
        fail('加载失败：' + (e && e.message ? e.message : e));
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
