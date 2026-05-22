/* app.js — AxisCalibrator: simple Gamepad deadzone & drift tester */
 (function () {
  const statusEl = document.getElementById('status');
  const lxEl = document.getElementById('lx');
  const lyEl = document.getElementById('ly');
  const lmEl = document.getElementById('lm');
  const rxEl = document.getElementById('rx');
  const ryEl = document.getElementById('ry');
  const rmEl = document.getElementById('rm');
  const axesList = document.getElementById('axes-list');
  const leftCanvas = document.getElementById('left-canvas');
  const rightCanvas = document.getElementById('right-canvas');
  const leftCtx = leftCanvas.getContext('2d');
  const rightCtx = rightCanvas.getContext('2d');
  const deadzoneInput = document.getElementById('deadzone');
  const deadzoneValue = document.getElementById('deadzone-value');
  const autoBtn = document.getElementById('auto-calibrate');
  const measureBtn = document.getElementById('measure-rest');
  const resetBtn = document.getElementById('reset');
  const recenterBtn = document.getElementById('recenter');
  const driftResult = document.getElementById('drift-result');

  let deadzone = parseFloat(deadzoneInput.value) || 0.08;
  let activeIndex = null;
  let baseline = [0, 0, 0, 0];
  let baselineSet = false;

  function setDeadzone(val) {
    deadzone = Number(val);
    deadzoneInput.value = deadzone.toFixed(3);
    deadzoneValue.textContent = deadzone.toFixed(3);
  }

  deadzoneInput.addEventListener('input', () => setDeadzone(parseFloat(deadzoneInput.value)));

  window.addEventListener('gamepadconnected', (e) => {
    activeIndex = e.gamepad.index;
    statusEl.textContent = `Connected: ${e.gamepad.id}`;
    log(`Gamepad connected: #${e.gamepad.index} — ${e.gamepad.id}`);
    calibrateBaseline().catch(() => {});
  });
  window.addEventListener('gamepaddisconnected', (e) => {
    if (activeIndex === e.gamepad.index) activeIndex = null;
    statusEl.textContent = 'Controller disconnected';
    log(`Gamepad disconnected: #${e.gamepad.index} — ${e.gamepad.id}`);
  });

  function getPrimaryGamepad() {
    const g = navigator.getGamepads ? navigator.getGamepads() : [];
    if (activeIndex != null) return g[activeIndex];
    for (let i = 0; i < g.length; i++) if (g[i]) return g[i];
    return null;
  }

  function setupCanvas(canvas, ctx) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(64, Math.round(rect.width));
    const cssH = Math.max(64, Math.round(rect.height));
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initCanvases() {
    setupCanvas(leftCanvas, leftCtx);
    setupCanvas(rightCanvas, rightCtx);
    drawStick(leftCtx, 0, 0);
    drawStick(rightCtx, 0, 0);
  }

  window.addEventListener('resize', () => {
    initCanvases();
  });

  function update() {
    const gp = getPrimaryGamepad();
    if (gp) {
      statusEl.textContent = `Connected: ${gp.id}`;
      const axes = gp.axes || [];
      const lxRaw = axes[0] || 0;
      const lyRaw = axes[1] || 0;
      const rxRaw = axes[2] || 0;
      const ryRaw = axes[3] || 0;
      const lxv = lxRaw - (baselineSet ? baseline[0] : 0);
      const lyv = lyRaw - (baselineSet ? baseline[1] : 0);
      const rxv = rxRaw - (baselineSet ? baseline[2] : 0);
      const ryv = ryRaw - (baselineSet ? baseline[3] : 0);
      const lm = Math.hypot(lxv, lyv);
      const rm = Math.hypot(rxv, ryv);
      lxEl.textContent = lxv.toFixed(3);
      lyEl.textContent = lyv.toFixed(3);
      lmEl.textContent = lm.toFixed(3);
      rxEl.textContent = rxv.toFixed(3);
      ryEl.textContent = ryv.toFixed(3);
      rmEl.textContent = rm.toFixed(3);
      drawStick(leftCtx, lxv, lyv);
      drawStick(rightCtx, rxv, ryv);
      renderAxesList(axes);
    }
    requestAnimationFrame(update);
  }

  function drawStick(ctx, x, y) {
    const rect = ctx.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
    // background
    ctx.fillStyle = '#0f1720';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 14;
    // outer dashed ring
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.stroke();
    // deadzone ring (lighter)
    const deadR = Math.max(4, deadzone * radius);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, deadR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // dot
    const px = cx + x * radius;
    const py = cy + y * radius;
    const mag = Math.hypot(x, y);
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    // small inner color when outside deadzone
    if (mag > deadzone) {
      ctx.beginPath(); ctx.fillStyle = '#ef4444'; ctx.arc(px, py, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function renderAxesList(axes) {
    axesList.innerHTML = '';
    if (!axes || axes.length === 0) {
      axesList.textContent = 'No axes detected.';
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'axes-grid';
    axes.forEach((v, i) => {
      const row = document.createElement('div');
      row.className = 'axis-row';
      row.innerHTML = `<strong>Axis ${i}:</strong> ${v.toFixed(3)}`;
      wrap.appendChild(row);
    });
    axesList.appendChild(wrap);
  }

  function log(msg) {
    const now = new Date().toLocaleTimeString();
    driftResult.textContent = `${now} — ${msg}`;
    setTimeout(() => {
      if (driftResult.textContent.startsWith(now)) driftResult.textContent = '';
    }, 3500);
  }

  function autoCalibrate() {
    const samples = [];
    const duration = 1400;
    const t0 = performance.now();
    return new Promise((resolve) => {
      function sample() {
        const gp = getPrimaryGamepad();
        if (gp) {
          const a = gp.axes || [];
          const lx = (a[0] || 0) - (baselineSet ? baseline[0] : 0);
          const ly = (a[1] || 0) - (baselineSet ? baseline[1] : 0);
          samples.push([lx, ly]);
        }
        if (performance.now() - t0 < duration) requestAnimationFrame(sample);
        else {
          let sum = 0;
          for (const s of samples) sum += Math.hypot(s[0], s[1]);
          const avg = samples.length ? sum / samples.length : 0;
          const recommended = Math.min(0.5, Math.max(0, avg + 0.04));
          setDeadzone(recommended);
          log(`Auto-calibrated deadzone: ${recommended.toFixed(3)}`);
          resolve(recommended);
        }
      }
      sample();
    });
  }

  function measureResting() {
    const gp = getPrimaryGamepad();
    if (!gp) {
      log('No controller detected for resting measurement.');
      return Promise.resolve(null);
    }
    const samples = [];
    const duration = 2500;
    const t0 = performance.now();
    driftResult.textContent = 'Measuring resting drift... (keep sticks untouched)';
    return new Promise((resolve) => {
      function sample() {
        const g = getPrimaryGamepad();
        if (g) {
          const a = g.axes ? g.axes.slice() : [];
          if (baselineSet) {
            a[0] = (a[0] || 0) - baseline[0];
            a[1] = (a[1] || 0) - baseline[1];
            a[2] = (a[2] || 0) - baseline[2];
            a[3] = (a[3] || 0) - baseline[3];
          }
          samples.push(a);
        }
        if (performance.now() - t0 < duration) requestAnimationFrame(sample);
        else {
          if (samples.length === 0) {
            driftResult.textContent = 'No data captured.';
            resolve(null);
            return;
          }
          const axisCount = samples[0].length;
          const sums = new Array(axisCount).fill(0);
          samples.forEach((s) => {
            for (let i = 0; i < axisCount; i++) sums[i] += Math.abs(s[i] || 0);
          });
          const avgs = sums.map((s) => s / samples.length);
          const primary = avgs.slice(0, 4);
          const maxAvg = primary.length ? Math.max(...primary) : 0;
          const driftDetected = maxAvg > deadzone + 0.02;
          driftResult.innerHTML = `<strong>Resting averages:</strong> ${avgs
            .map((a) => a.toFixed(3))
            .join(', ')}<br>${
            driftDetected
              ? '<span style="color:#ef4444">Drift detected</span>'
              : '<span style="color:#16a34a">No significant drift</span>'
          } (max avg ${maxAvg.toFixed(3)})`;
          resolve({ avgs, driftDetected });
        }
      }
      sample();
    });
  }

  function calibrateBaseline(duration = 800) {
    const samples = [];
    const t0 = performance.now();
    statusEl.textContent = 'Calibrating centre... keep sticks still';
    return new Promise((resolve) => {
      function sample() {
        const gp = getPrimaryGamepad();
        if (gp) {
          const a = gp.axes || [];
          samples.push([a[0] || 0, a[1] || 0, a[2] || 0, a[3] || 0]);
        }
        if (performance.now() - t0 < duration) requestAnimationFrame(sample);
        else {
          if (samples.length === 0) {
            statusEl.textContent = 'Calibration failed';
            resolve(null);
            return;
          }
          const sums = [0, 0, 0, 0];
          samples.forEach((s) => {
            for (let i = 0; i < 4; i++) sums[i] += s[i] || 0;
          });
          for (let i = 0; i < 4; i++) baseline[i] = sums[i] / samples.length;
          baselineSet = true;
          statusEl.textContent = `Calibrated center`;
          log(`Baseline centered (x,y) ≈ ${baseline[0].toFixed(3)}, ${baseline[1].toFixed(3)}`);
          resolve(baseline);
        }
      }
      sample();
    });
  }

  autoBtn.addEventListener('click', () => {
    autoBtn.disabled = true;
    autoCalibrate().finally(() => (autoBtn.disabled = false));
  });
  measureBtn.addEventListener('click', () => {
    measureBtn.disabled = true;
    measureResting().finally(() => (measureBtn.disabled = false));
  });
  recenterBtn.addEventListener('click', () => {
    calibrateBaseline();
  });
  resetBtn.addEventListener('click', () => {
    setDeadzone(0.08);
    driftResult.textContent = '';
    baselineSet = false;
    calibrateBaseline();
  });

  // initialize canvases and start
  initCanvases();
  if (getPrimaryGamepad()) calibrateBaseline().catch(() => {});
  requestAnimationFrame(update);
})();
