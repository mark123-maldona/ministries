/* =========================================
   ARISE MEDIA — PLATFORM JAVASCRIPT
========================================= */

const audio = document.getElementById('audioEngine');

// ── State ──
let currentTrack  = null;   // the DOM element currently loaded
let isPlaying     = false;
let isShuffle     = false;
let repeatMode    = 0;      // 0=off 1=all 2=one
let isMuted       = false;
let toastTimer    = null;

// All playable items in page order (built on DOMContentLoaded)
let playlist = [];

// ── Helpers ──
function toast(msg, duration = 2500) {
  const el = document.getElementById('toastEl');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

function formatTime(sec) {
  if (isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Build playlist from all list-items + mcard elements ──
function buildPlaylist() {
  playlist = Array.from(document.querySelectorAll('.list-item[data-src], .mcard[data-src]'));
}

// ── Load & play a track from a data-src element ──
function loadTrack(el, autoplay = true) {
  if (!el || !el.dataset.src) return;

  // Mark previous as not playing
  if (currentTrack) {
    currentTrack.classList.remove('playing');
    // reset list-item number back to number
    const numEl = currentTrack.querySelector('.li-num');
    if (numEl) numEl.innerHTML = numEl.dataset.orig || numEl.textContent;
  }

  currentTrack = el;
  el.classList.add('playing');

  const title   = el.dataset.title    || 'Unknown';
  const speaker = el.dataset.speaker  || '';
  const sub     = el.dataset.sub      || speaker;
  const src     = el.dataset.src;
  const thumb   = el.querySelector('img')?.src || '';

  // Load audio
  audio.src = src;
  audio.volume = parseFloat(document.getElementById('volSlider').value) / 100;

  // Update player bar
  document.getElementById('pbTitle').textContent = title;
  document.getElementById('pbSub').textContent   = speaker || sub;

  const pbImg = document.getElementById('pbArtImg');
  const pbFallback = document.getElementById('pbArtFallback');
  pbImg.src = thumb;
  pbFallback.style.display = thumb ? 'none' : 'flex';
  pbImg.style.display = thumb ? 'block' : 'none';

  // Sidebar NP
  document.getElementById('snpTitle').textContent = title;
  document.getElementById('snpSub').textContent   = speaker || sub;
  const snpImg = document.getElementById('snpArt').querySelector('img');
  if (snpImg) { snpImg.src = thumb; }
  document.getElementById('snpFallback').style.display = thumb ? 'none' : 'flex';

  // list-item: show equaliser icon in num
  const numEl = el.querySelector('.li-num');
  if (numEl) {
    if (!numEl.dataset.orig) numEl.dataset.orig = numEl.textContent;
    numEl.innerHTML = `<span style="color:var(--gold)">♪</span>`;
  }

  if (autoplay) {
    audio.play().then(() => setPlayState(true)).catch(() => {
      toast('⚠ Audio file not found. Add files via data-src attributes.');
      setPlayState(false);
    });
  }
}

function setPlayState(playing) {
  isPlaying = playing;
  document.getElementById('iconPlay').style.display  = playing ? 'none'  : 'block';
  document.getElementById('iconPause').style.display = playing ? 'block' : 'none';
}

// ── Controls ──
function togglePlay() {
  if (!currentTrack) {
    // Play first item
    buildPlaylist();
    if (playlist.length) loadTrack(playlist[0]);
    return;
  }
  if (isPlaying) {
    audio.pause();
    setPlayState(false);
  } else {
    audio.play().then(() => setPlayState(true)).catch(() => {
      toast('⚠ No audio loaded. Set data-src on track elements.');
    });
  }
}

function playFeatured() {
  // Play the first list-item (featured sermon)
  buildPlaylist();
  const first = document.querySelector('.list-item[data-src]');
  if (first) loadTrack(first);
  else toast('Set data-src on sermon list items to play.');
}

function playCard(card) {
  buildPlaylist();
  loadTrack(card);
}

function playListItem(item) {
  buildPlaylist();
  loadTrack(item);
}

function nextTrack() {
  buildPlaylist();
  if (!playlist.length) return;
  const idx = currentTrack ? playlist.indexOf(currentTrack) : -1;
  let next;
  if (isShuffle) {
    next = playlist[Math.floor(Math.random() * playlist.length)];
  } else {
    next = playlist[(idx + 1) % playlist.length];
  }
  loadTrack(next);
}

function prevTrack() {
  buildPlaylist();
  if (!playlist.length) return;
  // If >3s in, restart; else go previous
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  const idx = currentTrack ? playlist.indexOf(currentTrack) : 1;
  const prev = playlist[(idx - 1 + playlist.length) % playlist.length];
  loadTrack(prev);
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  document.getElementById('shuffleBtn').classList.toggle('active', isShuffle);
  toast(isShuffle ? '🔀 Shuffle on' : 'Shuffle off');
}

function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  const btn = document.getElementById('repeatBtn');
  btn.classList.toggle('active', repeatMode > 0);
  const labels = ['Repeat off', '🔁 Repeat all', '🔂 Repeat one'];
  toast(labels[repeatMode]);
}

function toggleMute() {
  isMuted = !isMuted;
  audio.muted = isMuted;
  toast(isMuted ? '🔇 Muted' : '🔊 Unmuted');
}

function setVolume(val) {
  audio.volume = val / 100;
  if (val == 0) { audio.muted = true; isMuted = true; }
  else { audio.muted = false; isMuted = false; }
}

// ── Progress bar ──
function seekTo(e) {
  const bar = document.getElementById('pbBar');
  const rect = bar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (audio.duration) audio.currentTime = pct * audio.duration;
}

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  document.getElementById('pbFill').style.width = pct + '%';
  document.getElementById('pbDot').style.right  = (100 - pct) + '%';
  document.getElementById('pbCurrent').textContent  = formatTime(audio.currentTime);
  document.getElementById('pbDuration').textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
  if (repeatMode === 2) {
    audio.currentTime = 0; audio.play();
  } else if (repeatMode === 1 || isShuffle) {
    nextTrack();
  } else {
    buildPlaylist();
    const idx = currentTrack ? playlist.indexOf(currentTrack) : -1;
    if (idx < playlist.length - 1) nextTrack();
    else setPlayState(false);
  }
});

audio.addEventListener('error', () => {
  toast('⚠ Audio file not found. Connect your audio files via data-src.');
  setPlayState(false);
});

// ── Download ──
function downloadCard(card) {
  const src   = card.dataset.download || card.dataset.src || '';
  const title = card.dataset.title || 'track';
  if (!src) { toast('No download file set. Add data-download attribute.'); return; }
  triggerDownload(src, title);
}

function downloadListItem(item) {
  const src   = item.dataset.download || item.dataset.src || '';
  const title = item.dataset.title || 'track';
  if (!src) { toast('No download file set. Add data-download attribute.'); return; }
  triggerDownload(src, title);
}

function downloadCurrent() {
  if (!currentTrack) { toast('Nothing playing to download.'); return; }
  const src   = currentTrack.dataset.download || currentTrack.dataset.src || '';
  const title = currentTrack.dataset.title || 'track';
  if (!src) { toast('No download file linked to this track.'); return; }
  triggerDownload(src, title);
}

function triggerDownload(src, title) {
  if (!src) {
    toast('⚠ No file path set on this item.');
    return;
  }

  // Build a safe filename: clean title + original extension
  const ext      = src.includes('.') ? src.substring(src.lastIndexOf('.')) : '.mp3';
  const safeName = title.replace(/[^a-z0-9 \-_.]/gi, '_').trim() + ext;

  toast(`⬇ Starting download: ${title}…`);

  // fetch → Blob → object URL forces a real Save-As dialog regardless of
  // server Content-Disposition headers
  fetch(src)
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast('✓ Download started: ' + safeName);
    })
    .catch(err => {
      // Fallback: plain anchor (works for same-origin files served correctly)
      console.warn('Fetch-download failed, using anchor fallback:', err);
      const a   = document.createElement('a');
      a.href     = src;
      a.download = safeName;
      a.target   = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('⚠ File not found yet — add "' + src + '" to your server.');
    });
}

// ── Save / Heart toggle ──
function toggleSave(btn) {
  btn.classList.toggle('saved');
  const isSaved = btn.classList.contains('saved');
  if (isSaved) {
    toast('❤ Saved to your library');
    // fill the heart icon
    const path = btn.querySelector('svg path');
    if (path) path.setAttribute('fill', 'var(--gold)');
  } else {
    toast('Removed from library');
    const path = btn.querySelector('svg path');
    if (path) path.setAttribute('fill', 'none');
  }
}

// ── Filter pills ──
function filterContent(btn, type) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');

  const cards = document.querySelectorAll('.mcard');
  const items = document.querySelectorAll('.list-item');

  cards.forEach(c => {
    c.style.display = (type === 'all' || c.dataset.type === type) ? '' : 'none';
  });
  items.forEach(i => {
    i.style.display = (type === 'all' || i.dataset.type === type) ? '' : 'none';
  });
}

// ── Search ──
function handleSearch(val) {
  const q = val.toLowerCase().trim();
  document.getElementById('searchClear').style.display = val ? 'block' : 'none';

  const allItems = document.querySelectorAll('.mcard, .list-item');
  allItems.forEach(el => {
    const title   = (el.dataset.title   || '').toLowerCase();
    const speaker = (el.dataset.speaker || '').toLowerCase();
    const sub     = (el.dataset.sub     || '').toLowerCase();
    const match   = !q || title.includes(q) || speaker.includes(q) || sub.includes(q);
    el.style.display = match ? '' : 'none';
  });

  // Show/hide shelf heads if all children hidden
  document.querySelectorAll('.shelf').forEach(shelf => {
    const visible = Array.from(shelf.querySelectorAll('.mcard, .list-item')).some(el => el.style.display !== 'none');
    shelf.style.display = visible ? '' : 'none';
  });
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  document.querySelectorAll('.mcard, .list-item').forEach(el => el.style.display = '');
  document.querySelectorAll('.shelf').forEach(s => s.style.display = '');
}

// ── Mobile sidebar toggle ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// Close sidebar on outside click (mobile)
document.addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('hamburger');
  if (window.innerWidth <= 900 && sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) && !toggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

// ── Page navigation ──
const HOME_SECTIONS = ['shelfRecent','shelfAlbums','shelfSermons'];

function showPage(section) {
  // Hide all page divs
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  // Hide/show home sections
  const isHome = section === 'home';
  HOME_SECTIONS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isHome ? '' : 'none';
  });
  const heroEl = document.querySelector('.hero-featured');
  if (heroEl) heroEl.style.display = isHome ? '' : 'none';

  // Show the requested page
  if (!isHome) {
    const pageEl = document.getElementById('page-' + section);
    if (pageEl) pageEl.style.display = '';
  }

  // Scroll to top
  const content = document.getElementById('mainContent');
  if (content) content.scrollTop = 0;

  // Rebuild playlist to include visible items
  buildPlaylist();
}

// ── Sidebar nav: highlight + switch page ──
document.querySelectorAll('.nav-item[data-section]').forEach(item => {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    this.classList.add('active');
    showPage(this.dataset.section);
    if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('open');
  });
});

// Library items (Saved, Queue) — no data-section, just show toast
document.querySelectorAll('.nav-item:not([data-section])').forEach(item => {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    this.classList.add('active');
    toast('Coming soon — library features in development.');
    if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('open');
  });
});

// ── Series filter (Sermons page) ──
function filterSeries(btn, series) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#sermonsPageList .list-item').forEach(item => {
    item.style.display = (series === 'all' || item.dataset.series === series) ? '' : 'none';
  });
}

// ── Album page navigate ──
function goToAlbum(name, year, tracks) {
  toast(`Opening ${name}…`);
  // Navigate to music page and update hero info
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const musicNav = document.querySelector('.nav-item[data-section="music"]');
  if (musicNav) musicNav.classList.add('active');
  showPage('music');
  // Update the music hero title/meta
  const titleEl = document.querySelector('.music-album-title');
  const metaEl  = document.querySelector('.music-album-meta');
  if (titleEl) titleEl.textContent = name;
  if (metaEl)  metaEl.textContent  = `Arise Worship · ${year} · ${tracks} tracks`;
}

// ── Play all music page tracks ──
function playMusicPage() {
  buildPlaylist();
  const first = document.querySelector('#page-music .list-item[data-src]');
  if (first) loadTrack(first);
  else toast('Add audio file paths to data-src attributes to enable playback.');
}
document.addEventListener('keydown', e => {
  // Don't intercept when typing in search
  if (e.target.tagName === 'INPUT') return;
  switch(e.code) {
    case 'Space':
      e.preventDefault();
      togglePlay();
      break;
    case 'ArrowRight':
      if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
      break;
    case 'ArrowLeft':
      audio.currentTime = Math.max(0, audio.currentTime - 10);
      break;
    case 'ArrowUp':
      const upVal = Math.min(100, parseInt(document.getElementById('volSlider').value) + 5);
      document.getElementById('volSlider').value = upVal;
      setVolume(upVal);
      break;
    case 'ArrowDown':
      const dnVal = Math.max(0, parseInt(document.getElementById('volSlider').value) - 5);
      document.getElementById('volSlider').value = dnVal;
      setVolume(dnVal);
      break;
    case 'KeyN':
      nextTrack(); break;
    case 'KeyP':
      prevTrack(); break;
  }
});

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  buildPlaylist();

  // Handle missing images gracefully — show fallback
document.addEventListener('DOMContentLoaded', () => {
  buildPlaylist();

  document.querySelectorAll('img').forEach(img => {
    const fallback = img.parentElement?.querySelector('[class*="fallback"]');

    // Hide immediately if src is blank or points back to the page URL
    if (!img.src || img.src === window.location.href) {
      img.style.display = 'none';
      if (fallback) fallback.style.display = 'flex';
      return; // no need to add listeners
    }

    img.addEventListener('load', function () {
      this.style.display = 'block';
      if (fallback) fallback.style.display = 'none';
    });

    img.addEventListener('error', function () {
      this.style.display = 'none';
      if (fallback) fallback.style.display = 'flex';
    });
  });
});
});