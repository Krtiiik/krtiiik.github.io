(function () {
    'use strict';

    var root = document.documentElement;

    function store(key, value) {
        try {
            if (value === undefined) return window.localStorage.getItem(key);
            window.localStorage.setItem(key, value);
        } catch (e) { /* storage blocked: the choice just isn't remembered */ }
        return null;
    }

    // Theme: head.html already set data-theme before paint; this keeps it in sync.
    function setTheme(theme, remember) {
        root.setAttribute('data-theme', theme);
        if (remember) store('krtiiik-theme', theme);
        var label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
        var btn = document.getElementById('theme-toggle');
        if (btn) { btn.setAttribute('aria-label', label); btn.title = label; }
        document.dispatchEvent(new CustomEvent('krtiiik:theme'));
    }

    var toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', function () {
            setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
        });
    }
    setTheme(root.getAttribute('data-theme') || 'light', false);

    // Follow the OS until the visitor picks a theme themselves.
    if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        var follow = function (e) { if (!store('krtiiik-theme')) setTheme(e.matches ? 'dark' : 'light', false); };
        if (mq.addEventListener) mq.addEventListener('change', follow);
        else if (mq.addListener) mq.addListener(follow);
    }
})();
