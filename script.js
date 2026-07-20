// Flora design-lab — общие canvas-устройства: волна (звук) и диафрагма (оптика).
// Оба берутся из ремесла Flora, а не абстрактный градиент-блоб.
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STOPS = {
    dna:   [[0, '#FFD65A'], [0.55, '#FB8C3C'], [1, '#EC1E93']],
    neon:  [[0, '#FFC24D'], [0.5, '#FF7A3C'], [1, '#FF2E9A']],
    muted: [[0, '#B97A3E'], [1, '#6B2E45']],
    amber: [[0, '#FFD65A'], [1, '#D79A3C']],
    plum:  [[0, '#C46A8D'], [1, '#7A3350']],
    mono:  null // solid color, filled per-call
  };

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function fitCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(rect.width, 1), h = Math.max(rect.height, 1);
    canvas.width = w * dpr; canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function colorFor(ctx, w, h, stopKey, monoColor) {
    if (stopKey === 'mono' || !STOPS[stopKey]) return monoColor || 'rgba(255,255,255,.5)';
    var grad = ctx.createLinearGradient(0, 0, w, 0);
    STOPS[stopKey].forEach(function (s) { grad.addColorStop(s[0], s[1]); });
    return grad;
  }

  function drawWaveform(canvas, opts, phase) {
    var f = fitCanvas(canvas), ctx = f.ctx, w = f.w, h = f.h;
    var rand = mulberry32(opts.seed || 7);
    var bars = opts.bars || 100;
    var gap = w / bars;
    var barW = Math.max(1.2, gap * (opts.fill || 0.5));
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colorFor(ctx, w, h, opts.stops, opts.mono);
    ctx.globalAlpha = opts.opacity != null ? opts.opacity : 1;
    for (var i = 0; i < bars; i++) {
      var t = i / bars;
      var envelope = Math.sin(t * Math.PI) * 0.65 + 0.35;
      var wobble = opts.animated ? Math.sin(t * 26 + phase) * 0.5 + 0.5 : 0;
      var noise = rand();
      var amp = envelope * 0.55 + noise * 0.3 + wobble * (opts.animated ? 0.15 : 0);
      var bh = Math.max(h * 0.02, amp * opts.amplitude * h);
      var x = i * gap + (gap - barW) / 2;
      var y = (h - bh) / 2;
      ctx.fillRect(x, y, barW, bh);
    }
  }

  function drawIris(canvas, opts, rotation) {
    var f = fitCanvas(canvas), ctx = f.ctx, w = f.w, h = f.h;
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 * (opts.scale || 0.86);
    ctx.clearRect(0, 0, w, h);
    var fill;
    if (opts.stops && STOPS[opts.stops]) {
      var grad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      STOPS[opts.stops].forEach(function (s) { grad.addColorStop(s[0], s[1]); });
      fill = grad;
    } else {
      fill = opts.mono || 'rgba(255,255,255,.7)';
    }
    var blades = opts.blades || 6;
    for (var i = 0; i < blades; i++) {
      var a0 = rotation + i * (Math.PI * 2 / blades);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a0);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(R * 0.5, -R * 0.26, R, 0);
      ctx.quadraticCurveTo(R * 0.5, R * 0.26, 0, 0);
      ctx.closePath();
      ctx.globalAlpha = opts.opacity != null ? opts.opacity : 0.94;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    }
    if (opts.hole) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * (opts.holeR || 0.24), 0, Math.PI * 2);
      ctx.fillStyle = opts.bg || '#00000000';
      ctx.fill();
    }
  }

  function drawRing(canvas, opts) {
    // тонкое кольцо-обвод (диафрагма-контур), для мелких иконок/навигации
    var f = fitCanvas(canvas), ctx = f.ctx, w = f.w, h = f.h;
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 * (opts.scale || 0.78);
    ctx.clearRect(0, 0, w, h);
    var grad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    (STOPS[opts.stops] || STOPS.dna).forEach(function (s) { grad.addColorStop(s[0], s[1]); });
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.5, R * 0.16);
    ctx.strokeStyle = grad; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
  }

  function initDevices(root) {
    var scope = root || document;
    var canvases = scope.querySelectorAll('canvas[data-device]');
    var animated = [];
    canvases.forEach ? canvases.forEach(run) : Array.prototype.forEach.call(canvases, run);

    function run(canvas) {
      var device = canvas.getAttribute('data-device');
      var stops = canvas.getAttribute('data-stops') || 'dna';
      var mono = canvas.getAttribute('data-mono');
      var seed = parseInt(canvas.getAttribute('data-seed') || '7', 10);
      var amplitude = parseFloat(canvas.getAttribute('data-amplitude') || '0.6');
      var opacity = parseFloat(canvas.getAttribute('data-opacity') || '1');
      var bars = parseInt(canvas.getAttribute('data-bars') || '100', 10);
      var fillRatio = parseFloat(canvas.getAttribute('data-fillratio') || '0.5');
      var live = canvas.hasAttribute('data-animated') && !reduceMotion;
      var bg = canvas.getAttribute('data-bg') || 'transparent';
      var blades = parseInt(canvas.getAttribute('data-blades') || '6', 10);
      var scale = parseFloat(canvas.getAttribute('data-scale') || '0.86');
      var hole = canvas.hasAttribute('data-hole');

      function paint(phase) {
        if (device === 'waveform') {
          drawWaveform(canvas, { seed: seed, bars: bars, fill: fillRatio, amplitude: amplitude, opacity: opacity, stops: stops, mono: mono, animated: live }, phase || 0);
        } else if (device === 'iris') {
          drawIris(canvas, { blades: blades, scale: scale, stops: stops, mono: mono, hole: hole, bg: bg, opacity: opacity }, (parseFloat(canvas.getAttribute('data-rotation') || '0')) + (live ? Math.sin((phase || 0) / 6) * 0.05 : 0));
        } else if (device === 'ring') {
          drawRing(canvas, { stops: stops, scale: scale });
        }
      }

      paint(0);
      window.addEventListener('resize', function () { paint(0); });
      if (live) animated.push(paint);
    }

    if (animated.length) {
      var start = null;
      function frame(ts) {
        if (start === null) start = ts;
        var phase = (ts - start) / 480;
        animated.forEach(function (p) { p(phase); });
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  }

  document.addEventListener('DOMContentLoaded', function () { initDevices(document); });
  window.FloraLab = { initDevices: initDevices };
})();
