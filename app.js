/* ============================================================
   COREPULSE — app.js
   All logic preserved · Branding updated · Phase theming synced
============================================================ */


/* ============================================================
   1. AUDIO
============================================================ */
function beep(freq = 880, duration = 0.15, type = 'square', gain = 0.35) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.connect(vol); vol.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = type;
    vol.gain.setValueAtTime(gain, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}
function beepWorkEnd()         { [880,880,1100].forEach((f,i) => setTimeout(()=>beep(f,0.12,'square'),i*160)); }
function beepRestEnd()         { [660,880].forEach((f,i) => setTimeout(()=>beep(f,0.15,'triangle'),i*200)); }
function beepSetDone()         { beep(330,0.2,'sine',0.5); }
function beepWorkoutComplete() { [523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>beep(f,0.18,'triangle',0.4),i*130)); }
function beepTick()            { beep(1100,0.07,'square',0.2); }


/* ============================================================
   2. TOAST
============================================================ */
let _toastTimer;
function showToast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}


/* ============================================================
   3. WORKOUT QUEUE
============================================================ */
let workoutQueue  = [];
let currentPreset = null;

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function addExerciseToQueue() {
  const selectEl    = document.getElementById('exerciseSelect');
  const customField = document.getElementById('exerciseName');

  let name = selectEl.value;

  if (name === '--- CUSTOM ---') {
    name = customField.value.trim();
    if (!name) { showToast('Please type a custom exercise name'); return; }
  } else if (!name) {
    showToast('Please select an exercise'); return;
  }

  const sets      = parseInt(document.getElementById('exSets').value,      10);
  const work      = parseInt(document.getElementById('exWork').value,      10);
  const shortRest = parseInt(document.getElementById('exShortRest').value, 10);
  const longRest  = parseInt(document.getElementById('exLongRest').value,  10);

  if (!sets || sets < 1) { showToast('Sets must be 1 or more');   return; }
  if (!work || work < 5) { showToast('Work must be 5 sec or more'); return; }

  workoutQueue.push({ name, sets, work, shortRest, longRest });

  selectEl.value = '';
  customField.value = '';
  customField.style.display = 'none';
  currentPreset = null;
  document.querySelectorAll('.preset-chip').forEach(b => b.classList.remove('active'));

  renderQueue();
  showToast(`${name} added — ${sets} sets × ${work}s`);
}

function removeFromQueue(idx) {
  const removed = workoutQueue[idx];
  workoutQueue.splice(idx, 1);
  renderQueue();
  if (removed) showToast(`Removed: ${removed.name}`);
}

function clearQueue() {
  if (workoutQueue.length === 0) return;
  workoutQueue  = [];
  currentPreset = null;
  document.querySelectorAll('.preset-chip').forEach(b => b.classList.remove('active'));
  renderQueue();
  showToast('Queue cleared');
}

/*
  Queue render — #queueEmpty lives OUTSIDE #queueList so
  list.innerHTML='' never destroys it. Only toggles display.
*/
function renderQueue() {
  const list        = document.getElementById('queueList');
  const empty       = document.getElementById('queueEmpty');
  const scrollWrap  = document.getElementById('queueScrollWrap');
  const btn         = document.getElementById('btnStartWorkout');
  const header      = document.getElementById('queueHeader');
  const clearBtn    = document.getElementById('btnClearQueue');
  const presetLabel = document.getElementById('presetLabel');

  if (presetLabel) {
    presetLabel.textContent = currentPreset
      ? `${currentPreset.toUpperCase()} PRESET`
      : 'QUICK START';
  }

  // ── EMPTY STATE
  if (workoutQueue.length === 0) {
    list.innerHTML            = '';
    empty.style.display       = 'flex';
    scrollWrap.style.display  = 'none';
    btn.disabled              = true;
    if (header)   header.style.display   = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }

  // ── HAS ITEMS
  empty.style.display       = 'none';
  scrollWrap.style.display  = 'block';
  if (header)   header.style.display   = 'flex';
  if (clearBtn) clearBtn.style.display = 'inline-flex';

  const countBadge = document.getElementById('queueCount');
  if (countBadge) countBadge.textContent = workoutQueue.length;

  const totalSecs = workoutQueue.reduce((acc, ex) =>
    acc + ex.sets * ex.work + Math.max(0, ex.sets - 1) * ex.shortRest + ex.longRest, 0);
  const timeEl = document.getElementById('queueTotalTime');
  if (timeEl) timeEl.textContent = `~${Math.round(totalSecs / 60)} min`;

  // Rebuild cards
  list.innerHTML = '';
  workoutQueue.forEach((ex, i) => {
    const totalExTime = ex.sets * ex.work + Math.max(0, ex.sets - 1) * ex.shortRest;
    const exMins  = Math.floor(totalExTime / 60);
    const exSecs  = totalExTime % 60;
    const timeStr = exMins > 0 ? `${exMins}m ${exSecs}s` : `${exSecs}s`;

    const item = document.createElement('div');
    item.className = 'queue-item';
    item.style.animationDelay = `${i * 40}ms`;
    item.innerHTML = `
      <div class="queue-num">${i + 1}</div>
      <div class="queue-info">
        <div class="queue-name">${escapeHtml(ex.name)}</div>
        <div class="queue-tags">
          <span class="tag tag-sets">${ex.sets} set${ex.sets !== 1 ? 's' : ''}</span>
          <span class="tag tag-work">${ex.work}s work</span>
          <span class="tag tag-short">${ex.shortRest}s short</span>
          <span class="tag tag-long">${ex.longRest}s long</span>
          <span class="tag tag-time">~${timeStr}</span>
        </div>
      </div>
      <button class="queue-remove" onclick="removeFromQueue(${i})" title="Remove exercise">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    `;
    list.appendChild(item);
  });

  btn.disabled = false;
}


/* ============================================================
   4. PRESETS
============================================================ */
const PRESETS = {
  beginner: [
    { name: 'Push-ups', sets: 3, work: 30, shortRest: 45, longRest: 90 },
    { name: 'Squats',   sets: 3, work: 30, shortRest: 45, longRest: 90 },
  ],
  intermediate: [
    { name: 'Push-ups', sets: 4, work: 45, shortRest: 30, longRest: 90 },
    { name: 'Squats',   sets: 4, work: 45, shortRest: 30, longRest: 90 },
    { name: 'Plank',    sets: 3, work: 40, shortRest: 30, longRest: 90 },
  ],
  advanced: [
    { name: 'Burpees',        sets: 5, work: 60, shortRest: 20, longRest: 60 },
    { name: 'Pull-ups',       sets: 5, work: 50, shortRest: 20, longRest: 60 },
    { name: 'Deadlift',       sets: 4, work: 50, shortRest: 25, longRest: 60 },
    { name: 'Shoulder Press', sets: 4, work: 45, shortRest: 20, longRest: 60 },
  ],
};

function applyPreset(level) {
  if (currentPreset === level) {
    workoutQueue  = [];
    currentPreset = null;
    document.querySelectorAll('.preset-chip').forEach(b => b.classList.remove('active'));
    renderQueue();
    showToast('Preset cleared');
  } else {
    workoutQueue  = PRESETS[level].map(ex => ({ ...ex }));
    currentPreset = level;
    document.querySelectorAll('.preset-chip').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-preset="${level}"]`).classList.add('active');
    renderQueue();
    showToast(`${level.charAt(0).toUpperCase() + level.slice(1)} preset loaded`);
  }
}


/* ============================================================
   5. WORKOUT ENGINE
============================================================ */
const engine = {
  exIdx: 0, setIdx: 0, phase: 'idle',
  paused: false, totalSec: 0,
  startTs: null, savedRem: null, rafId: null,
  CIRC: 603.19, _lastTick: -1,
};

function currentEx() { return workoutQueue[engine.exIdx]; }

function fmt(sec) {
  const s = Math.max(0, sec);
  return String(Math.floor(s / 60)).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');
}

/* Phase theme — syncs CSS vars and badge / body classes */
function applyPhaseTheme(phase) {
  const card  = document.getElementById('heroCard');
  const badge = document.getElementById('modeBadge');
  const body  = document.body;

  card.classList.remove('phase-work','phase-short','phase-long');
  badge.classList.remove('work','short','long','idle');
  body.classList.remove('phase-work','phase-short','phase-long');

  const texts = {
    work:  'WORK',
    short: 'REST',
    long:  'LONG REST',
    idle:  'IDLE',
  };
  const badgeTexts = {
    work:  'WORKING',
    short: 'RESTING',
    long:  'LONG REST',
    idle:  'IDLE',
  };

  if (phase === 'work')  { card.classList.add('phase-work');  badge.classList.add('work');  body.classList.add('phase-work');  }
  if (phase === 'short') { card.classList.add('phase-short'); badge.classList.add('short'); body.classList.add('phase-short'); }
  if (phase === 'long')  { card.classList.add('phase-long');  badge.classList.add('long');  body.classList.add('phase-long');  }
  if (phase === 'idle')  { badge.classList.add('idle'); }

  document.querySelector('.badge-text').textContent = badgeTexts[phase] || 'IDLE';
}

function updateHeroLabels() {
  const ex = currentEx();
  const labels   = { work:'WORK',       short:'SHORT REST', long:'LONG REST', idle:'' };
  const subtexts = { work: ex ? ex.name.toUpperCase() : '', short:'REST UP · NEXT SET SOON', long:'GREAT WORK · NEXT EXERCISE SOON', idle:'GET READY' };
  document.getElementById('heroPhaseLabel').textContent = labels[engine.phase]   || '';
  document.getElementById('heroSubtext').textContent    = subtexts[engine.phase] || '';
}

function updateStatusBar() {
  const ex = currentEx(); if (!ex) return;
  const phases = { work:'WORKING', short:'SHORT REST', long:'LONG REST' };
  document.getElementById('statusPhase').textContent        = phases[engine.phase] || '';
  document.getElementById('statusExerciseName').textContent = ex.name;
  document.getElementById('statusSetDetail').textContent    = `Set ${engine.setIdx+1} of ${ex.sets}`;
  document.getElementById('statusExerciseDetail').textContent = `Exercise ${engine.exIdx+1} of ${workoutQueue.length}`;

  const doneSets  = workoutQueue.slice(0,engine.exIdx).reduce((a,e)=>a+e.sets,0) + engine.setIdx;
  const totalSets = workoutQueue.reduce((a,e)=>a+e.sets,0);
  document.getElementById('statusProgressFill').style.width = (totalSets>0 ? Math.round(doneSets/totalSets*100) : 0) + '%';
}

function updateProgressCards() {
  const ex = currentEx(); if (!ex) return;
  document.getElementById('exCurDisplay').textContent  = engine.exIdx + 1;
  document.getElementById('exTotDisplay').textContent  = workoutQueue.length;
  document.getElementById('exNameDisplay').textContent = ex.name;
  document.getElementById('exProgressFill').style.width =
    (workoutQueue.length > 0 ? Math.round(engine.exIdx / workoutQueue.length * 100) : 0) + '%';

  document.getElementById('setCurDisplay').textContent  = engine.setIdx + 1;
  document.getElementById('setTotDisplay').textContent  = ex.sets;
  const phaseLabel = { work:'WORKING', short:'SHORT REST', long:'LONG REST' };
  document.getElementById('setPhaseDisplay').textContent = phaseLabel[engine.phase] || '—';

  buildActiveDotGrid(ex.sets, engine.setIdx);
}

function buildActiveDotGrid(total, currentIdx) {
  const grid = document.getElementById('activeDotGrid');
  grid.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.textContent = i + 1;
    if (i < currentIdx)        dot.classList.add('done');
    else if (i === currentIdx) dot.classList.add('current-dot');
    grid.appendChild(dot);
  }
}

function updateUpcomingList() {
  const list  = document.getElementById('upcomingList');
  list.innerHTML = '';
  const slice = workoutQueue.slice(engine.exIdx);
  if (slice.length === 0) {
    list.innerHTML = '<div style="color:var(--text-3);font-family:var(--font-mono);font-size:11px;padding:12px 0">No more exercises</div>';
    return;
  }
  slice.forEach((ex, i) => {
    const setsRemaining = (i === 0) ? ex.sets - engine.setIdx : ex.sets;
    const item = document.createElement('div');
    item.className = 'upcoming-item' + (i === 0 ? ' next' : '');
    item.innerHTML = `
      <div class="upcoming-num">${engine.exIdx + i + 1}</div>
      <div class="upcoming-name">${escapeHtml(ex.name)}</div>
      <div class="upcoming-meta">${setsRemaining} set${setsRemaining !== 1 ? 's' : ''} · ${ex.work}s work · ${ex.shortRest}s rest</div>
    `;
    list.appendChild(item);
  });
}

function updateRing(rem, total) {
  document.getElementById('heroRing').style.strokeDashoffset =
    engine.CIRC * (1 - (total > 0 ? rem / total : 0));
}

function updateHeroDisplay(sec) {
  document.getElementById('heroDisplay').textContent = fmt(sec);
}

/* rAF loop */
function tick() {
  if (engine.paused) return;
  const elapsed = (performance.now() - engine.startTs) / 1000;
  const rem     = Math.max(0, Math.round(engine.savedRem - elapsed));
  updateHeroDisplay(rem);
  updateRing(rem, engine.totalSec);
  if (rem <= 3 && rem > 0 && rem !== engine._lastTick) { beepTick(); engine._lastTick = rem; }
  if (rem <= 0) { onPhaseComplete(); return; }
  engine.rafId = requestAnimationFrame(tick);
}

function resumeLoop() { engine.startTs = performance.now(); engine.rafId = requestAnimationFrame(tick); }
function stopLoop()   { cancelAnimationFrame(engine.rafId); engine.rafId = null; }

function beginPhase(phase, durationSec) {
  stopLoop();
  engine.phase     = phase;
  engine.totalSec  = durationSec;
  engine.savedRem  = durationSec;
  engine._lastTick = -1;

  applyPhaseTheme(phase);
  updateHeroLabels();
  updateStatusBar();
  updateProgressCards();
  updateUpcomingList();
  updateHeroDisplay(durationSec);
  updateRing(durationSec, durationSec);
  resumeLoop();
}

function onPhaseComplete() {
  stopLoop();
  const ex   = currentEx();
  const card = document.getElementById('heroCard');
  card.classList.add('finished-pulse');
  setTimeout(() => card.classList.remove('finished-pulse'), 1400);

  if (engine.phase === 'work') {
    beepWorkEnd();
    const isLastSet = engine.setIdx >= ex.sets - 1;
    if (!isLastSet) {
      showToast(`Set ${engine.setIdx+1} done! Rest up.`, 3000);
      beepSetDone(); engine.setIdx++;
      setTimeout(() => beginPhase('short', ex.shortRest), 400);
    } else {
      beepSetDone();
      const isLastEx = engine.exIdx >= workoutQueue.length - 1;
      if (!isLastEx) {
        showToast(`${ex.name} complete! Long rest coming.`, 4000);
        engine.setIdx++;
        setTimeout(() => beginPhase('long', ex.longRest), 400);
      } else {
        engine.setIdx++;
        setTimeout(finishWorkout, 400);
      }
    }
  } else if (engine.phase === 'short') {
    beepRestEnd();
    showToast(`Rest over — Set ${engine.setIdx+1} starting!`, 2500);
    setTimeout(() => beginPhase('work', ex.work), 400);
  } else if (engine.phase === 'long') {
    beepRestEnd();
    engine.exIdx++; engine.setIdx = 0;
    const nextEx = currentEx();
    showToast(`Next up: ${nextEx.name}`, 2500);
    setTimeout(() => beginPhase('work', nextEx.work), 600);
  }
}


/* ============================================================
   6. WORKOUT LIFECYCLE
============================================================ */
function startWorkout() {
  if (workoutQueue.length === 0) { showToast('Add exercises first!'); return; }
  engine.exIdx = 0; engine.setIdx = 0; engine.paused = false;
  engine._workoutStartTime = Date.now();

  document.getElementById('setupPanel').style.display  = 'none';
  document.getElementById('activePanel').style.display = 'block';
  document.getElementById('statusBar').style.display   = 'flex';

  showToast(`Starting: ${currentEx().name}`, 2500);
  setTimeout(() => beginPhase('work', currentEx().work), 600);
}

function togglePause() {
  const btn        = document.getElementById('heroPauseBtn');
  const pauseIcon  = document.getElementById('pauseIcon');
  const resumeIcon = document.getElementById('resumeIcon');
  const btnText    = document.getElementById('pauseBtnText');

  if (!engine.paused) {
    engine.savedRem = Math.max(0, Math.round(engine.savedRem - (performance.now()-engine.startTs)/1000));
    stopLoop(); engine.paused = true;
    btn.classList.add('paused');
    pauseIcon.style.display  = 'none';
    resumeIcon.style.display = '';
    btnText.textContent = 'Resume';
    showToast('Paused');
  } else {
    engine.paused  = false;
    btn.classList.remove('paused');
    pauseIcon.style.display  = '';
    resumeIcon.style.display = 'none';
    btnText.textContent = 'Pause';
    engine.startTs = performance.now();
    engine.rafId   = requestAnimationFrame(tick);
    showToast('Resumed');
  }
}

function skipPhase() { showToast('Phase skipped'); onPhaseComplete(); }

function stopWorkout() {
  stopLoop(); engine.phase = 'idle'; engine.paused = false;
  applyPhaseTheme('idle');

  document.getElementById('activePanel').style.display = 'none';
  document.getElementById('statusBar').style.display   = 'none';
  document.getElementById('setupPanel').style.display  = 'block';

  // Reset pause button
  const pauseIcon  = document.getElementById('pauseIcon');
  const resumeIcon = document.getElementById('resumeIcon');
  document.getElementById('heroPauseBtn').classList.remove('paused');
  document.getElementById('pauseBtnText').textContent = 'Pause';
  if (pauseIcon)  pauseIcon.style.display  = '';
  if (resumeIcon) resumeIcon.style.display = 'none';

  showToast('Workout stopped');
}

function finishWorkout() {
  stopLoop(); beepWorkoutComplete(); applyPhaseTheme('idle');

  const totalExercises = workoutQueue.length;
  const totalSets      = workoutQueue.reduce((a,e)=>a+e.sets, 0);
  const elapsed        = engine._workoutStartTime
    ? Math.round((Date.now() - engine._workoutStartTime) / 1000) : 0;

  document.getElementById('completeSubText').textContent = 'All sets completed — outstanding work!';
  document.getElementById('completeStats').innerHTML = `
    <strong>${totalExercises}</strong> exercise${totalExercises !== 1 ? 's' : ''} &nbsp;·&nbsp;
    <strong>${totalSets}</strong> total set${totalSets !== 1 ? 's' : ''}<br>
    Total time: <strong>${Math.floor(elapsed/60)}m ${elapsed%60}s</strong>
  `;
  document.getElementById('workout-complete').classList.add('show');
}

function returnToSetup() {
  stopLoop(); engine.phase = 'idle'; engine.paused = false;
  applyPhaseTheme('idle');

  document.getElementById('workout-complete').classList.remove('show');
  document.getElementById('activePanel').style.display  = 'none';
  document.getElementById('statusBar').style.display    = 'none';
  document.getElementById('setupPanel').style.display   = 'block';

  const pauseIcon  = document.getElementById('pauseIcon');
  const resumeIcon = document.getElementById('resumeIcon');
  document.getElementById('heroPauseBtn').classList.remove('paused');
  document.getElementById('pauseBtnText').textContent = 'Pause';
  if (pauseIcon)  pauseIcon.style.display  = '';
  if (resumeIcon) resumeIcon.style.display = 'none';
}


/* ============================================================
   7. INIT
============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  const select      = document.getElementById('exerciseSelect');
  const customField = document.getElementById('exerciseName');

  select.addEventListener('change', function () {
    if (this.value === '--- CUSTOM ---') {
      customField.style.display = 'block';
      customField.focus();
    } else {
      customField.style.display = 'none';
      customField.value = '';
    }
  });

  customField.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') addExerciseToQueue();
  });

  renderQueue();
});