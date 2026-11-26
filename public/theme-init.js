// 主题无闪烁初始化（与 next-themes storageKey/attribute/defaultTheme 一致）
(function () {
  try {
    var t = localStorage.getItem('xc-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // 只有显式 dark，或「跟随系统且系统为深色」才进入深色；
    // 历史实现对 system + 浅色系统也写了 colorScheme='dark'（原生滚动条/表单控件变黑）
    var dark = t === 'dark' || ((t === 'system' || !t) && prefersDark);
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
