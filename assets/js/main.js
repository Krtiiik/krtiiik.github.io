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

    initBackground();

    /* =====================================================================
       Animated background: three scenes on one canvas, swooping between them.
       ===================================================================== */
    function initBackground() {
        var canvas = document.getElementById('bg');
        if (!canvas || !canvas.getContext) return;
        var ctx = canvas.getContext('2d');

        var BPM = 174;
        var TAU = Math.PI * 2;
        var SWOOP_SECONDS = 0.95;
        // Scene parts size from the height, capped so a very tall window spreads the scene out instead of blowing it up.
        var SCENE_MAX_H = 1000;
        var SCENES = [
            { name: 'DJ hardware', caption: 'deck A · 33⅓ rpm · 174 bpm', draw: drawDJ },
            { name: 'math', caption: 'f(x) = Σ sin((2k−1)x) / (2k−1)', draw: drawMath },
            { name: 'oscilloscope', caption: 'x–y mode · 3:2 lissajous', draw: drawScope }
        ];
        var SYMBOLS = ['π', 'φ', '∞', '∑', '∫', '√2', 'e', '0', '1', 'i² = −1', 'dx', 'λ', '3.14159', '1.61803', '2.71828', '0x7F', '1010', 'f(x)', 'Δ', '∂', '≈', '174', '33⅓', 'n!', 'O(n)', '∀x', 'ℝ'];
        var MONO = "'DM Mono', ui-monospace, monospace";

        var c = {};           // colours, read back from the CSS custom properties
        var dark = false;
        var sims = [null, null, null];
        var mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
        var cur = Math.floor(Math.random() * SCENES.length);
        var prev = null, trans = 1, origin = { x: 40, y: 48 };
        var dirty = true, last = performance.now();
        // The OS reduced-motion setting is deliberately ignored (owner's choice); only the pause button stops it.
        var moving = store('krtiiik-motion') !== 'off';

        var dotBtn = document.getElementById('scene-switch');
        var dot = dotBtn && dotBtn.querySelector('.scene-dot');
        var caption = document.getElementById('scene-caption');
        var motionBtn = document.getElementById('motion-toggle');

        function readColors() {
            var cs = getComputedStyle(root);
            ['bg', 'fg', 'muted', 'hi'].forEach(function (k) { c[k] = toHex(cs.getPropertyValue('--' + k).trim()); });
            dark = root.getAttribute('data-theme') === 'dark';
            dirty = true;
        }
        function updateSceneUi() {
            if (caption) caption.textContent = 'scene ' + (cur + 1) + '/' + SCENES.length + ' · ' + SCENES[cur].caption;
            if (dotBtn) {
                var label = 'Next background scene: ' + SCENES[(cur + 1) % SCENES.length].name;
                dotBtn.setAttribute('aria-label', label);
                dotBtn.title = label;
            }
        }
        function setMoving(on, remember) {
            moving = on;
            if (remember) store('krtiiik-motion', on ? 'on' : 'off');
            if (on) root.removeAttribute('data-motion'); else root.setAttribute('data-motion', 'paused');
            if (motionBtn) {
                var label = on ? 'Pause background animation' : 'Play background animation';
                motionBtn.setAttribute('aria-label', label);
                motionBtn.title = label;
            }
            dirty = true;
        }

        // Swoop: the next scene is revealed by a circle growing out of the scene switch.
        function nextScene() {
            var r = dot ? dot.getBoundingClientRect() : null;
            origin = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 40, y: 48 };
            prev = cur;
            cur = (cur + 1) % SCENES.length;
            trans = 0;
            updateSceneUi();
        }

        readColors();
        updateSceneUi();
        setMoving(moving, false);
        document.addEventListener('krtiiik:theme', readColors);
        if (dotBtn) dotBtn.addEventListener('click', nextScene);
        if (motionBtn) motionBtn.addEventListener('click', function () { setMoving(!moving, true); });
        window.addEventListener('pointermove', function (e) {
            mouse.tx = e.clientX / Math.max(1, window.innerWidth);
            mouse.ty = e.clientY / Math.max(1, window.innerHeight);
        }, { passive: true });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { dirty = true; });

        function sizeChanged() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            return canvas.width !== Math.round(canvas.clientWidth * dpr) || canvas.height !== Math.round(canvas.clientHeight * dpr);
        }

        function loop(now) {
            requestAnimationFrame(loop);
            if (document.hidden) { last = now; return; }
            var real = Math.min(0.05, (now - last) / 1000);
            last = now;
            var inTrans = trans < 1;
            if (inTrans) trans = Math.min(1, trans + real / SWOOP_SECONDS);
            if (moving) frame(real);
            else if (inTrans || dirty || sizeChanged()) { dirty = false; frame(0); }
        }
        requestAnimationFrame(loop);

        function frame(dt) {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var w = canvas.clientWidth, h = canvas.clientHeight;
            if (!w || !h) return;
            if (sizeChanged()) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            var kk = dt ? 1 - Math.pow(0.02, dt) : 1;
            mouse.x += (mouse.tx - mouse.x) * kk;
            mouse.y += (mouse.ty - mouse.y) * kk;
            var scroll = window.scrollY || 0;

            if (trans < 1 && prev !== null) {
                SCENES[prev].draw(w, h, dt, scroll);
                var e = easeInOut(trans);
                var maxR = Math.hypot(Math.max(origin.x, w - origin.x), Math.max(origin.y, h - origin.y)) + 40;
                var r = Math.max(0.5, e * maxR), fade = 1 - e;
                ctx.save();
                circle(origin.x, origin.y, r); ctx.clip();
                SCENES[cur].draw(w, h, dt, scroll);
                ctx.restore();
                // the swoop's leading edge: three trailing rings: highlight, ink, muted ink
                if (dark) { ctx.shadowBlur = 18; ctx.shadowColor = c.hi; }
                ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(c.hi, 0.85 * fade); circle(origin.x, origin.y, r); ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(c.fg, 0.55 * fade); circle(origin.x, origin.y, r * 0.93); ctx.stroke();
                ctx.lineWidth = 1; ctx.strokeStyle = rgba(c.muted, 0.4 * fade); circle(origin.x, origin.y, r * 0.86); ctx.stroke();
            } else {
                SCENES[cur].draw(w, h, dt, scroll);
            }
        }

        /* ---------- helpers ---------- */
        // The tokens are OKLCH; paint one pixel to get plain sRGB hex for rgba().
        var probe = null;
        function toHex(color) {
            probe = probe || document.createElement('canvas').getContext('2d', { willReadFrequently: true });
            probe.clearRect(0, 0, 1, 1);
            probe.fillStyle = '#000';
            probe.fillStyle = color;
            probe.fillRect(0, 0, 1, 1);
            var d = probe.getImageData(0, 0, 1, 1).data;
            return '#' + ((1 << 24) | (d[0] << 16) | (d[1] << 8) | d[2]).toString(16).slice(1);
        }
        function rgba(hex, a) {
            var n = parseInt(hex.slice(1), 16);
            return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
        }
        function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
        function clamp(v) { return Math.max(0.03, Math.min(0.97, v)); }
        function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
        function alpha() { return dark ? 1 : 0.9; }
        function clear(w, h) { ctx.fillStyle = c.bg; ctx.fillRect(0, 0, w, h); }

        /* ---------- scene A: DJ hardware ---------- */
        function drawDJ(w, h, dt, scroll) {
            var k = alpha(), m = mouse, hs = Math.min(h, SCENE_MAX_H);
            var s = sims[0] || (sims[0] = { t: 0, rot: 0, vel: 0, pmx: m.x, meters: new Array(28).fill(0.3), peaks: new Array(28).fill(0.3) });
            s.t += dt;
            // scratch: horizontal pointer movement nudges the platters
            s.vel += (m.x - s.pmx) * 9; s.pmx = m.x;
            s.vel *= Math.pow(0.04, dt || 1);
            s.rot += (0.5 + s.vel) * dt;
            var ph = scroll * 0.0012;
            clear(w, h);
            var beatPos = s.t * BPM / 60, kick = Math.pow(1 - (beatPos % 1), 4), beatN = Math.floor(beatPos);
            var wide = w >= 760;

            // wide: right to left like a controller (deck B, pitch fader, mixer), deck A bottom-left.
            // phone portrait: deck B large in the top-right corner, deck A bottom-left, meters between.
            var R, cx, cy, R2, cx2, cy2;
            if (wide) {
                R = Math.min(hs * 0.36, w * 0.26); cx = w - R * 0.55; cy = h * 0.42;
                R2 = R * 0.7; cx2 = R2 * 0.3; cy2 = h - R2 * 0.25;
            } else {
                R = Math.min(w * 0.46, hs * 0.3); cx = w - R * 0.35; cy = h * 0.2;
                R2 = R * 0.8; cx2 = R2 * 0.25; cy2 = h - R2 * 0.2;
            }
            var xr = cx - R * 1.11, deckAEdge = cx2 + R2 * 1.11;
            platter(cx, cy, R, s.rot + ph, k);
            platter(cx2, cy2, R2, -s.rot * 1.3 - ph * 1.6, k * 0.8);

            if (wide) {
                ctx.lineWidth = 1;
                // pitch fader beside deck B
                var fx = Math.round(xr - 34) + 0.5, fy0 = cy - hs * 0.28, fy1 = cy + hs * 0.28;
                ctx.strokeStyle = rgba(c.fg, 0.16 * k);
                ctx.beginPath(); ctx.moveTo(fx, fy0); ctx.lineTo(fx, fy1);
                for (var i = 0; i <= 16; i++) { var ty = Math.round(fy0 + (fy1 - fy0) * i / 16) + 0.5; ctx.moveTo(fx - (i % 4 === 0 ? 12 : 7), ty); ctx.lineTo(fx - 4, ty); }
                ctx.stroke();
                var capY = fy0 + (fy1 - fy0) * clamp(0.5 + 0.18 * Math.sin(s.t * 0.21) + (m.y - 0.5) * 0.25 + Math.sin(ph) * 0.05);
                ctx.fillStyle = rgba(c.fg, 0.07 * k); ctx.fillRect(fx - 12, capY - 7, 24, 14);
                ctx.strokeStyle = rgba(c.fg, 0.3 * k); ctx.strokeRect(fx - 12, capY - 7, 24, 14);
                ctx.strokeStyle = rgba(c.hi, 0.75 * k); ctx.beginPath(); ctx.moveTo(fx - 12, capY); ctx.lineTo(fx + 12, capY); ctx.stroke();

                // mixer: two channels of hi / mid / low EQ knobs
                var g = 60, mxR = fx - 62, mxL = mxR - g, ky0 = cy - hs * 0.26;
                for (var ch = 0; ch < 2; ch++) {
                    for (var row = 0; row < 3; row++) {
                        var n = ch * 3 + row;
                        var v = clamp(0.5 + 0.28 * Math.sin(s.t * (0.3 + n * 0.07) + n * 1.7) + (m.x - 0.5) * 0.45 * (ch ? 1 : -1));
                        knob(ch ? mxR : mxL, ky0 + row * g, 13, v, row === 0 ? c.hi : row === 1 ? c.muted : c.fg, k);
                    }
                }
                // performance pads, one lights per beat
                var ps = 24, pg = 8, padW = 4 * ps + 3 * pg, px0 = Math.round(mxR + 20 - padW) + 0.5, py0 = Math.round(ky0 + 3 * g - 8) + 0.5;
                for (var pr = 0; pr < 2; pr++) {
                    for (var q = 0; q < 4; q++) {
                        var idx = pr * 4 + q, on = idx === beatN % 8, x = px0 + q * (ps + pg), y = py0 + pr * (ps + pg);
                        ctx.fillStyle = on ? rgba(idx % 2 ? c.fg : c.hi, (0.15 + 0.4 * kick) * k) : rgba(c.fg, 0.035 * k);
                        ctx.fillRect(x, y, ps, ps);
                        ctx.strokeStyle = rgba(c.fg, 0.16 * k); ctx.strokeRect(x, y, ps, ps);
                    }
                }
                // crossfader follows the pointer
                var cfy = Math.round(py0 + 2 * (ps + pg) + 26) + 0.5, cf0 = px0, cf1 = px0 + padW, capX = cf0 + (cf1 - cf0) * clamp(m.x);
                ctx.strokeStyle = rgba(c.fg, 0.16 * k);
                ctx.beginPath(); ctx.moveTo(cf0, cfy); ctx.lineTo(cf1, cfy); ctx.moveTo((cf0 + cf1) / 2, cfy - 8); ctx.lineTo((cf0 + cf1) / 2, cfy + 8); ctx.stroke();
                ctx.fillStyle = rgba(c.fg, 0.07 * k); ctx.fillRect(capX - 7, cfy - 11, 14, 22);
                ctx.strokeStyle = rgba(c.fg, 0.3 * k); ctx.strokeRect(capX - 7, cfy - 11, 14, 22);
                ctx.strokeStyle = rgba(c.fg, 0.75 * k); ctx.beginPath(); ctx.moveTo(capX, cfy - 11); ctx.lineTo(capX, cfy + 11); ctx.stroke();
            }

            // spectrum between the decks, kick on the low bins
            var mx0 = deckAEdge + (wide ? 28 : 14), mxEnd = wide ? xr - 70 : w - 16;
            var N = s.meters.length, bw = Math.max(0, (mxEnd - mx0) / N), baseY = h - 26, maxH = Math.min(120, hs * 0.14), seg = 6;
            for (var b = 0; b < N && bw >= 4; b++) {
                var low = 1 - b / N;
                var target = 0.3 + 0.22 * Math.sin(s.t * 1.3 + b * 0.6) * Math.sin(s.t * 0.47 + b * 0.21) + kick * 0.45 * low * low + (0.5 - m.y) * 0.15;
                target = Math.max(0.04, Math.min(1, target));
                if (!dt) s.meters[b] = target; else s.meters[b] += (target - s.meters[b]) * Math.min(1, dt * 12);
                if (s.meters[b] > s.peaks[b]) s.peaks[b] = s.meters[b]; else s.peaks[b] = Math.max(s.meters[b], s.peaks[b] - dt * 0.3);
                var segs = Math.floor(s.meters[b] * maxH / seg), bx = mx0 + b * bw;
                for (var j = 0; j < segs; j++) {
                    var fr = (j * seg) / maxH;
                    ctx.fillStyle = rgba(fr > 0.78 ? c.hi : fr > 0.5 ? c.muted : c.fg, 0.3 * k);
                    ctx.fillRect(bx + 1, baseY - j * seg - 4, bw - 3, 4);
                }
                ctx.fillStyle = rgba(c.hi, 0.55 * k);
                ctx.fillRect(bx + 1, baseY - s.peaks[b] * maxH - 2, bw - 3, 2);
            }
        }
        function platter(x, y, r, rot, k) {
            ctx.save();
            ctx.translate(x, y);
            ctx.lineWidth = 1;
            for (var i = 0; i < 72; i++) {
                var a = (i / 72) * TAU, big = i % 6 === 0;
                ctx.strokeStyle = rgba(c.fg, (big ? 0.16 : 0.07) * k);
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * r * 1.06, Math.sin(a) * r * 1.06);
                ctx.lineTo(Math.cos(a) * r * (big ? 1.11 : 1.08), Math.sin(a) * r * (big ? 1.11 : 1.08));
                ctx.stroke();
            }
            circle(0, 0, r); ctx.strokeStyle = rgba(c.fg, 0.18 * k); ctx.stroke();
            for (var gr = 0.36; gr < 0.9; gr += 0.034) { circle(0, 0, r * gr); ctx.strokeStyle = rgba(c.fg, 0.045 * k); ctx.stroke(); }
            // fixed light reflections on the vinyl
            ctx.lineWidth = r * 0.06;
            ctx.strokeStyle = rgba(c.fg, 0.05 * k);
            ctx.beginPath(); ctx.arc(0, 0, r * 0.62, -2.4, -1.75); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0.74, 1.39); ctx.stroke();
            ctx.lineWidth = 1;
            ctx.rotate(rot);
            for (var d = 0; d < 96; d++) {
                var da = (d / 96) * TAU;
                ctx.fillStyle = d % 8 === 0 ? rgba(c.hi, 0.55 * k) : rgba(c.fg, 0.15 * k);
                ctx.fillRect(Math.cos(da) * r * 0.95 - 1.5, Math.sin(da) * r * 0.95 - 1.5, 3, 3);
            }
            circle(0, 0, r * 0.3); ctx.fillStyle = rgba(c.hi, 0.06 * k); ctx.fill(); ctx.strokeStyle = rgba(c.hi, 0.35 * k); ctx.stroke();
            circle(0, 0, r * 0.22); ctx.strokeStyle = rgba(c.hi, 0.15 * k); ctx.stroke();
            ctx.lineWidth = 2; ctx.strokeStyle = rgba(c.hi, 0.6 * k);
            ctx.beginPath(); ctx.moveTo(r * 0.08, 0); ctx.lineTo(r * 0.28, 0); ctx.stroke();
            // cue marker
            ctx.lineWidth = 3; ctx.strokeStyle = rgba(c.fg, 0.85 * k);
            ctx.beginPath(); ctx.moveTo(r * 0.86, 0); ctx.lineTo(r * 1.0, 0); ctx.stroke();
            ctx.shadowBlur = 0;
            circle(0, 0, Math.max(2, r * 0.018)); ctx.fillStyle = rgba(c.fg, 0.4 * k); ctx.fill();
            ctx.restore();
        }
        function knob(x, y, r, v, col, k) {
            var a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, av = a0 + (a1 - a0) * v;
            ctx.lineCap = 'round';
            ctx.lineWidth = 3;
            ctx.strokeStyle = rgba(c.fg, 0.1 * k); ctx.beginPath(); ctx.arc(x, y, r + 7, a0, a1); ctx.stroke();
            ctx.strokeStyle = rgba(col, 0.55 * k); ctx.beginPath(); ctx.arc(x, y, r + 7, a0, av); ctx.stroke();
            ctx.lineWidth = 1;
            circle(x, y, r); ctx.fillStyle = rgba(c.fg, 0.04 * k); ctx.fill(); ctx.strokeStyle = rgba(c.fg, 0.22 * k); ctx.stroke();
            ctx.lineWidth = 2; ctx.strokeStyle = rgba(c.fg, 0.45 * k);
            ctx.beginPath(); ctx.moveTo(x + Math.cos(av) * r * 0.25, y + Math.sin(av) * r * 0.25); ctx.lineTo(x + Math.cos(av) * r * 0.8, y + Math.sin(av) * r * 0.8); ctx.stroke();
            ctx.lineCap = 'butt';
        }

        /* ---------- scene B: math / code ---------- */
        function drawMath(w, h, dt, scroll) {
            var k = alpha(), m = mouse, wide = w >= 760, hs = Math.min(h, SCENE_MAX_H);
            var s = sims[1];
            if (!s) {
                var parts = [];
                var count = wide ? 46 : 26;
                for (var i = 0; i < count; i++) {
                    parts.push({ s: SYMBOLS[i % SYMBOLS.length], x: Math.random() * w, y: Math.random() * h, v: 6 + Math.random() * 14,
                        size: 11 + Math.round(Math.random() * 9), a: 0.1 + Math.random() * 0.16, seed: Math.random() * 10, tone: i % 7 === 0 ? 1 : i % 11 === 0 ? 2 : 0 });
                }
                s = sims[1] = { t: 0, parts: parts, trace: [] };
            }
            s.t += dt;
            var t = s.t, ph = scroll * 0.002;
            clear(w, h);

            // drifting graph paper
            var g = 48, off = (t * 6) % g;
            ctx.lineWidth = 1; ctx.strokeStyle = rgba(c.fg, 0.045 * k);
            ctx.beginPath();
            for (var gx = -off; gx < w; gx += g) { ctx.moveTo(Math.round(gx) + 0.5, 0); ctx.lineTo(Math.round(gx) + 0.5, h); }
            for (var gy = 0; gy < h; gy += g) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(w, gy + 0.5); }
            ctx.stroke();

            // axes with numbered ticks
            var ox = w * 0.06, oy = Math.round(h * 0.62) + 0.5;
            ctx.strokeStyle = rgba(c.fg, 0.18 * k);
            ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(w, oy); ctx.moveTo(ox, 0); ctx.lineTo(ox, h); ctx.stroke();
            ctx.font = '11px ' + MONO; ctx.fillStyle = rgba(c.fg, 0.26 * k);
            for (var ti = 1; ox + ti * g < w; ti++) {
                var tx = ox + ti * g;
                ctx.beginPath(); ctx.moveTo(tx, oy - 4); ctx.lineTo(tx, oy + 4); ctx.stroke();
                if (ti % 2 === 0) ctx.fillText(String(ti), tx - 3, oy + 18);
            }

            // plotted functions; the pointer pulls a gaussian bump into them
            var mx = m.x * w, bump = (m.y * h - oy) * 0.35;
            var curves = [
                { col: c.hi, A: hs * 0.12, f: function (x) { return Math.sin(x + t * 0.6 + ph) * Math.cos(x * 0.37 - t * 0.23); } },
                { col: c.fg, A: hs * 0.08, f: function (x) { var v = 0; for (var n = 1; n <= 7; n += 2) v += Math.sin(n * (x * 0.8 - t * 0.4 - ph)) / n; return v * 1.1; } },
                { col: c.muted, A: hs * 0.1, f: function (x) { return Math.sin(x * 2.1 + t * 0.9) * Math.exp(-0.03 * Math.pow(x - 12 - Math.sin(t * 0.2) * 6, 2)); } }
            ];
            curves.forEach(function (cv, ci) {
                ctx.strokeStyle = rgba(cv.col, 0.5 * k); ctx.lineWidth = 1.6;
                ctx.beginPath();
                for (var px = 0; px <= w; px += 4) {
                    var y = oy - cv.A * cv.f((px - ox) / g) + bump * Math.exp(-Math.pow(px - mx, 2) / 28800) * (ci === 0 ? 1 : 0.55);
                    if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
                }
                ctx.stroke();
            });
            ctx.shadowBlur = 0;

            // Fourier epicycles drawing a square wave
            var ex = wide ? w * 0.74 : w * 0.6, ey = wide ? h * 0.26 : h * 0.16;
            var R = Math.min(w, hs) * (wide ? 0.085 : 0.11), ang = t * 0.8 + ph * 2;
            var x = ex, y = ey;
            ctx.lineWidth = 1;
            for (var n = 1; n <= 9; n += 2) {
                var r = R * 4 / (n * Math.PI);
                circle(x, y, r); ctx.strokeStyle = rgba(c.fg, 0.12 * k); ctx.stroke();
                var nx = x + r * Math.cos(n * ang), ny = y + r * Math.sin(n * ang);
                ctx.strokeStyle = rgba(c.fg, 0.5 * k);
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
                x = nx; y = ny;
            }
            if (dt) { s.trace.unshift(y); if (s.trace.length > 360) s.trace.pop(); }
            var tx0 = ex + R * 1.7;
            if (s.trace.length) {
                ctx.strokeStyle = rgba(c.fg, 0.15 * k);
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx0, s.trace[0]); ctx.stroke();
                ctx.strokeStyle = rgba(c.hi, 0.55 * k); ctx.lineWidth = 1.5;
                ctx.beginPath();
                s.trace.forEach(function (trY, i) { if (i === 0) ctx.moveTo(tx0, trY); else ctx.lineTo(tx0 + i * 1.5, trY); });
                ctx.stroke();
            }
            circle(x, y, 3); ctx.fillStyle = rgba(c.hi, 0.9 * k); ctx.fill();

            // floating numbers and symbols, nudged away by the pointer
            var my = m.y * h, scrollShift = scroll * 0.08;
            s.parts.forEach(function (p) {
                p.y -= p.v * dt;
                p.x += Math.sin(t * 0.3 + p.seed) * 6 * dt;
                var dx = p.x - mx, dy = p.y - my, dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 140 && dist > 0.01) { var push = (1 - dist / 140) * 60 * dt; p.x += (dx / dist) * push; p.y += (dy / dist) * push; }
                if (p.y < -30) { p.y = h + 20; p.x = Math.random() * w; }
                if (p.x < -60) p.x = w + 40;
                if (p.x > w + 60) p.x = -40;
                var col = p.tone === 1 ? c.hi : p.tone === 2 ? c.fg : c.fg;
                var yy = (p.y - scrollShift) % (h + 50); if (yy < -30) yy += h + 50;
                ctx.font = p.size + 'px ' + MONO;
                ctx.fillStyle = rgba(col, p.a * k * (p.tone ? 1.6 : 1));
                ctx.fillText(p.s, p.x, yy);
            });
        }

        /* ---------- scene C: oscilloscope ---------- */
        // Integer a:b keeps the figure a closed loop; motion comes from the phase, never from detuning.
        function lissajous(cx, cy, R, Ry, a, b, delta) {
            ctx.beginPath();
            var N = 900;
            for (var i = 0; i < N; i++) {
                var u = (i / N) * TAU;
                var x = cx + R * Math.sin(a * u + delta), y = cy + Ry * Math.sin(b * u);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }
        function drawScope(w, h, dt, scroll) {
            var k = alpha(), m = mouse, wide = w >= 760, hs = Math.min(h, SCENE_MAX_H);
            var s = sims[2] || (sims[2] = { t: 0 });
            s.t += dt;
            var t = s.t, ph = scroll * 0.0015;
            clear(w, h);

            // graticule centred on the scope
            var div = Math.round(Math.min(w, hs) / 7);
            var cx = Math.round(wide ? w * 0.68 : w * 0.5), cy = Math.round(wide ? h * 0.42 : h * 0.3);
            ctx.lineWidth = 1; ctx.strokeStyle = rgba(c.fg, 0.055 * k);
            ctx.beginPath();
            for (var gx = cx % div; gx < w; gx += div) { ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, h); }
            for (var gy = cy % div; gy < h; gy += div) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(w, gy + 0.5); }
            ctx.stroke();
            ctx.strokeStyle = rgba(c.fg, 0.16 * k);
            ctx.beginPath(); ctx.moveTo(0, cy + 0.5); ctx.lineTo(w, cy + 0.5); ctx.moveTo(cx + 0.5, 0); ctx.lineTo(cx + 0.5, h); ctx.stroke();
            ctx.beginPath();
            for (var mxk = cx % (div / 5); mxk < w; mxk += div / 5) { ctx.moveTo(mxk + 0.5, cy - 3); ctx.lineTo(mxk + 0.5, cy + 4); }
            for (var myk = cy % (div / 5); myk < h; myk += div / 5) { ctx.moveTo(cx - 3, myk + 0.5); ctx.lineTo(cx + 4, myk + 0.5); }
            ctx.stroke();

            // X–Y lissajous with a phosphor ghost; pointer x shifts phase, pointer y scales the Y gain
            var R = wide ? div * 2.3 : Math.min(div * 2.3, w * 0.4);
            var Ry = R * (0.8 + (1 - m.y) * 0.3), a = 3, b = 2;
            var delta = t * 0.35 + ph + (m.x - 0.5) * 1.4;
            ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(c.fg, 0.2 * k);
            lissajous(cx, cy, R, Ry, a, b, delta - 0.22);
            ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(c.hi, 0.7 * k);
            lissajous(cx, cy, R, Ry, a, b, delta);
            // beam spot
            var u = (t * 1.6) % TAU;
            circle(cx + R * Math.sin(a * u + delta), cy + Ry * Math.sin(b * u), 3.5);
            ctx.fillStyle = dark ? rgba(c.fg, 0.9) : rgba(c.fg, 0.9 * k); ctx.fill();
            ctx.shadowBlur = 0;

            // time-domain traces along the bottom
            var amp = hs * 0.035 * (0.6 + (1 - m.y) * 0.8), y1 = h * 0.8, y2 = h * 0.9;
            ctx.lineWidth = 1.5;
            if (dark) { ctx.shadowBlur = 8; ctx.shadowColor = c.hi; }
            ctx.strokeStyle = rgba(c.hi, 0.5 * k);
            ctx.beginPath();
            for (var px = 0; px <= w; px += 3) {
                var ya = y1 + amp * Math.sin(px * 0.012 - t * 1.2 - ph * 3) + amp * 0.3 * Math.sin(px * 0.031 + t * 0.7);
                if (px === 0) ctx.moveTo(px, ya); else ctx.lineTo(px, ya);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = rgba(c.muted, 0.5 * k);
            ctx.beginPath();
            for (var qx = 0; qx <= w; qx += 3) {
                var v = 0;
                for (var n = 1; n <= 7; n += 2) v += Math.sin(n * (qx * 0.008 - t * 0.9 - ph * 2)) / n;
                var yb = y2 + amp * 0.9 * v;
                if (qx === 0) ctx.moveTo(qx, yb); else ctx.lineTo(qx, yb);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // scope readouts
            var dphi = (((delta % TAU) + TAU) % TAU).toFixed(2);
            var labels = wide ? ['CH1 2.00V', 'CH2 500mV', 'X–Y 3:2', 'Δφ ' + dphi + ' rad', 'f ' + BPM + ' Hz'] : ['X–Y 3:2', 'Δφ ' + dphi];
            ctx.font = '11px ' + MONO; ctx.fillStyle = rgba(c.fg, 0.34 * k);
            var lx = cx - R;
            labels.forEach(function (l) { ctx.fillText(l, lx, cy + Ry + 34); lx += ctx.measureText(l).width + 26; });
            ctx.fillStyle = rgba(c.hi, 0.5 * k); ctx.fillText('CH1', 16, y1 - amp - 10);
            ctx.fillStyle = rgba(c.muted, 0.6 * k); ctx.fillText('CH2', 16, y2 - amp - 6);
        }
    }
})();
