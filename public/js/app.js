let currentInviteId = localStorage.getItem('undanganku_id') || null;
let uploadedPhotos = [], countdownTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  const d = new Date(); d.setDate(d.getDate() + 14);
  document.getElementById('eventDate').value = d.toISOString().split('T')[0];

  const params = new URLSearchParams(window.location.search);
  const urlId = params.get('id'), guestParam = params.get('to');
  if (urlId) { currentInviteId = urlId; await loadInvitationFromServer(urlId, guestParam, true); }
  else if (currentInviteId) { await loadInvitationFromServer(currentInviteId, null, false); }
});

function switchMode(mode) {
  playSfx('click');
  ['editorSection', 'previewSection', 'inboxSection'].forEach(id => document.getElementById(id).classList.add('hidden'));
  ['btnModeEdit', 'btnModePreview', 'btnModeInbox'].forEach(id => document.getElementById(id).classList.remove('active'));
  if (mode === 'edit') { document.getElementById('editorSection').classList.remove('hidden'); document.getElementById('btnModeEdit').classList.add('active'); stopBacksound(); }
  else if (mode === 'preview') { document.getElementById('previewSection').classList.remove('hidden'); document.getElementById('btnModePreview').classList.add('active'); }
  else if (mode === 'inbox') { document.getElementById('inboxSection').classList.remove('hidden'); document.getElementById('btnModeInbox').classList.add('active'); stopBacksound(); refreshInbox(); }
}

async function saveAndPublishInvite() {
  playSfx('click');
  const payload = {
    id: currentInviteId,
    eventType: document.getElementById('eventType').value,
    guestName: document.getElementById('guestName').value || 'Tamu Spesial',
    eventTitle: document.getElementById('eventTitle').value || 'Acara Spesial',
    eventDate: document.getElementById('eventDate').value,
    eventTime: document.getElementById('eventTime').value,
    eventMessage: document.getElementById('eventMessage').value,
    eventLocation: document.getElementById('eventLocation').value,
    eventMapsUrl: document.getElementById('eventMapsUrl').value,
    bankName: document.getElementById('bankName').value,
    bankNumber: document.getElementById('bankNumber').value,
    bankHolder: document.getElementById('bankHolder').value,
    qrCustomText: document.getElementById('qrCustomText').value.trim(),
    giftAddress: document.getElementById('giftAddress').value,
    photos: uploadedPhotos
  };
  try {
    const res = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await res.json();
    if (result.success) {
      currentInviteId = result.id;
      localStorage.setItem('undanganku_id', currentInviteId);
      renderInvitationData(payload, payload.guestName);
      document.getElementById('coverOverlay').classList.remove('opened');
      switchMode('preview');
      showToast('Undangan tersimpan! Siap dibagikan ke WA.');
    }
  } catch (_) { showToast('Server belum aktif. Jalankan npm start.'); }
}

async function loadInvitationFromServer(id, guestOverride, isGuestView) {
  try {
    const res = await fetch(`/api/invite/${id}`);
    const result = await res.json();
    if (!result.success) return;
    const data = result.data, finalGuest = guestOverride || data.guestName || 'Tamu Spesial';
    renderInvitationData(data, finalGuest);
    renderMessagesList(data.messages || []);
    if (isGuestView) {
      document.getElementById('btnModeEdit').classList.add('hidden');
      document.getElementById('btnModeInbox').classList.add('hidden');
      document.getElementById('rsvpName').value = guestOverride || '';
      switchMode('preview');
    }
  } catch (_) {}
}
function renderInvitationData(data, guestName) {
  const map = {
    wedding: { badge: 'THE WEDDING OF', tag: 'UNDANGAN PERNIKAHAN' },
    birthday: { badge: 'BIRTHDAY PARTY', tag: 'UNDANGAN ULANG TAHUN' },
    khitan: { badge: 'WALIMATUL KHITAN', tag: 'UNDANGAN SYUKURAN KHITAN' },
    party: { badge: 'SPECIAL INVITATION', tag: 'UNDANGAN ACARA SPESIAL' }
  };
  const t = map[data.eventType] || map.wedding;
  document.getElementById('coverBadge').textContent = t.badge;
  document.getElementById('dispEventTag').textContent = t.tag;
  document.getElementById('coverTitle').textContent = data.eventTitle;
  document.getElementById('dispTitle').textContent = data.eventTitle;
  document.getElementById('coverGuest').textContent = guestName;
  document.getElementById('dispMessage').textContent = data.eventMessage;
  document.getElementById('dispTime').textContent = data.eventTime;
  document.getElementById('dispLocation').textContent = data.eventLocation;
  document.getElementById('btnSerlok').href = data.eventMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(data.eventLocation)}`;
  document.getElementById('dispBankName').textContent = data.bankName;
  document.getElementById('dispBankNumber').textContent = data.bankNumber;
  document.getElementById('dispBankHolder').textContent = data.bankHolder;
  document.getElementById('dispGiftAddress').textContent = data.giftAddress;

  if (data.photos && data.photos.length) {
    const c = document.getElementById('galleryContainer'); c.innerHTML = '';
    data.photos.forEach(src => { const img = document.createElement('img'); img.src = src; img.onclick = () => openLightbox(src); c.appendChild(img); });
  }
  if (data.eventDate) {
    document.getElementById('dispDateText').textContent = new Date(data.eventDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    startCountdown(`${data.eventDate}T${data.eventTime || '09:00'}:00`);
  }
  generateQrCode(data.qrCustomText || `ACARA: ${data.eventTitle} | TAMU: ${guestName} | ${data.bankName}: ${data.bankNumber} (${data.bankHolder})`);
}

async function submitRsvp() {
  const name = document.getElementById('rsvpName').value.trim(), status = document.getElementById('rsvpStatus').value, wish = document.getElementById('rsvpWish').value.trim();
  if (!name || !wish) return showToast('Isi nama dan pesan dulu.');
  if (!currentInviteId) return showToast('Simpan undangan dulu.');
  playSfx('coin');
  try {
    const res = await fetch(`/api/invite/${currentInviteId}/rsvp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, status, wish }) });
    const result = await res.json();
    if (result.success) { renderMessagesList(result.messages); document.getElementById('rsvpWish').value = ''; showToast('Pesan terkirim ke pemilik acara.'); }
  } catch (_) { showToast('Gagal mengirim pesan.'); }
}

async function refreshInbox() {
  if (!currentInviteId) return;
  try { const res = await fetch(`/api/invite/${currentInviteId}`); const result = await res.json(); if (result.success) renderMessagesList(result.data.messages || []); } catch (_) {}
}

function renderMessagesList(messages) {
  document.getElementById('inboxBadge').textContent = messages.length;
  let hadir = 0, tidak = 0;
  messages.forEach(m => { if (m.status === 'Hadir') hadir++; if (m.status === 'Tidak Hadir') tidak++; });
  document.getElementById('countHadir').textContent = hadir; document.getElementById('countTidak').textContent = tidak;

  const waBox = document.getElementById('waChatContainer'), wishBox = document.getElementById('wishesList');
  if (!messages.length) { waBox.innerHTML = '<p class="empty-chat">Belum ada pesan masuk dari tamu.</p>'; wishBox.innerHTML = ''; return; }
  waBox.innerHTML = ''; wishBox.innerHTML = '';

  messages.forEach(m => {
    const isTidak = m.status === 'Tidak Hadir', tagClass = m.status === 'Hadir' ? 'tag-hadir' : (isTidak ? 'tag-tidak' : 'tag-ragu');
    const b = document.createElement('div');
    b.className = `wa-bubble ${isTidak ? 'tidak-hadir' : 'hadir'}`;
    b.innerHTML = `<div class="wa-sender"><span>${m.name}</span><span class="wa-status-tag ${tagClass}">${m.status}</span></div><div class="wa-text">${m.wish}</div><span class="wa-time">${m.date || ''} • ${m.time || ''} ✓✓</span>`;
    waBox.appendChild(b);

    const w = document.createElement('div'); w.className = 'wish-item';
    w.innerHTML = `<strong>${m.name} <span class="badge-hadir">${m.status}</span></strong><p>${m.wish}</p>`;
    wishBox.appendChild(w);
  });
}

function shareWhatsApp() {
  playSfx('click');
  if (!currentInviteId) return showToast('Klik "Simpan & Buat Link Undangan" dulu.');
  const title = document.getElementById('dispTitle').textContent, guest = document.getElementById('guestName').value || 'Tamu Spesial';
  const link = `${window.location.origin}${window.location.pathname}?id=${currentInviteId}&to=${encodeURIComponent(guest)}`;
  const msg = `Kepada Yth. *${guest}*\n\nKami mengundang Anda ke acara *${title}*.\nBuka undangan & konfirmasi kehadiran:\n👉 ${link}\n\nTerima kasih.`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

function openInvitation() { playSfx('open'); document.getElementById('coverOverlay').classList.add('opened'); startBacksound(document.getElementById('eventType').value); }

function handlePhotoUpload(event) {
  const files = event.target.files; if (!files || !files.length) return;
  uploadedPhotos = []; const c = document.getElementById('galleryContainer'); c.innerHTML = '';
  Array.from(files).slice(0, 4).forEach(f => {
    const r = new FileReader();
    r.onload = e => { uploadedPhotos.push(e.target.result); const img = document.createElement('img'); img.src = e.target.result; img.onclick = () => openLightbox(e.target.result); c.appendChild(img); };
    r.readAsDataURL(f);
  });
  showToast(`${files.length} foto dimuat.`);
}

function startCountdown(targetStr) {
  if (countdownTimer) clearInterval(countdownTimer);
  const t = new Date(targetStr).getTime();
  const tick = () => {
    const d = t - Date.now();
    if (d <= 0) { ['cdDays', 'cdHours', 'cdMins', 'cdSecs'].forEach(id => document.getElementById(id).textContent = '00'); return; }
    document.getElementById('cdDays').textContent = String(Math.floor(d / 86400000)).padStart(2, '0');
    document.getElementById('cdHours').textContent = String(Math.floor((d % 86400000) / 3600000)).padStart(2, '0');
    document.getElementById('cdMins').textContent = String(Math.floor((d % 3600000) / 60000)).padStart(2, '0');
    document.getElementById('cdSecs').textContent = String(Math.floor((d % 60000) / 1000)).padStart(2, '0');
  };
  tick(); countdownTimer = setInterval(tick, 1000);
}

function generateQrCode(text) {
  const c = document.getElementById('qrcodeCanvas'); c.innerHTML = '';
  new QRCode(c, { text, width: 165, height: 165, colorDark: '#1e2d4a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
}

function toggleQrModal() { playSfx('click'); document.getElementById('qrBoxContainer').classList.toggle('hidden'); }
function copyRekening() { playSfx('coin'); const rek = document.getElementById('dispBankNumber').textContent; navigator.clipboard?.writeText(rek).then(() => showToast(`Nomor ${rek} disalin!`)).catch(() => showToast(rek)); }
function openLightbox(src) { playSfx('click'); document.getElementById('lightboxImg').src = src; document.getElementById('lightbox').classList.remove('hidden'); }
function scrollToEl(id) { playSfx('click'); document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }

let activeInboxFilter = 'ALL';
let cachedMessages = [];

function spawnCelebrationFx(theme) {
  const layer = document.getElementById('fxLayer');
  if (!layer) return;
  const icons = {
    wedding: ['✨', '💍', '🌸'],
    birthday: ['🎉', '🎂', '✨'],
    khitan: ['✨', '🌙', '⭐'],
    party: ['🎊', '✨', '🎶']
  };
  const list = icons[theme] || icons.wedding;
  for (let i = 0; i < 18; i++) {
    setTimeout(() => {
      const el = document.createElement('span');
      el.className = 'fx-particle';
      el.textContent = list[i % list.length];
      el.style.left = `${Math.random() * 94}%`;
      el.style.animationDuration = `${2.6 + Math.random() * 2}s`;
      layer.appendChild(el);
      setTimeout(() => el.remove(), 4800);
    }, i * 110);
  }
}

const _origOpenInvitation = openInvitation;
openInvitation = function () {
  _origOpenInvitation();
  spawnCelebrationFx(document.getElementById('eventType').value);
};

function copyInviteLink() {
  playSfx('coin');
  if (!currentInviteId) return showToast('Klik "Simpan & Buat Link Undangan" dulu.');
  const guest = document.getElementById('guestName').value || 'Tamu Spesial';
  const link = `${window.location.origin}${window.location.pathname}?id=${currentInviteId}&to=${encodeURIComponent(guest)}`;
  navigator.clipboard?.writeText(link).then(() => showToast('Link undangan disalin!')).catch(() => showToast(link));
}

function setInboxFilter(filterVal, btnEl) {
  playSfx('click');
  activeInboxFilter = filterVal;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderMessagesList(cachedMessages);
}

const _origRenderMessagesList = renderMessagesList;
renderMessagesList = function (messages) {
  cachedMessages = Array.isArray(messages) ? messages : [];
  _origRenderMessagesList(cachedMessages);

  const waBox = document.getElementById('waChatContainer');
  const filtered = activeInboxFilter === 'ALL'
    ? cachedMessages
    : cachedMessages.filter(m => m.status === activeInboxFilter);

  if (!filtered.length) {
    waBox.innerHTML = '<p class="empty-chat">Tidak ada pesan pada filter ini.</p>';
    return;
  }

  waBox.innerHTML = '';
  filtered.forEach(m => {
    const isTidak = m.status === 'Tidak Hadir';
    const tagClass = m.status === 'Hadir' ? 'tag-hadir' : (isTidak ? 'tag-tidak' : 'tag-ragu');
    const b = document.createElement('div');
    b.className = `wa-bubble ${isTidak ? 'tidak-hadir' : 'hadir'}`;
    b.innerHTML = `<div class="wa-sender"><span>${m.name}</span><span class="wa-status-tag ${tagClass}">${m.status}</span></div><div class="wa-text">${m.wish}</div><span class="wa-time">${m.date || ''} • ${m.time || ''} ✓✓</span>`;
    waBox.appendChild(b);
  });
};
