// shared.js - Shared logic and state for LevelX

const DEFAULT_RESOURCES = [
  { id: 'POOL_01', name: 'Pool table', type: 'Pool' },
  { id: 'PS5_1_SP', name: 'PS5-1 - Single player', type: 'PS5_1_SP' },
  { id: 'PS5_1_MP', name: 'PS5-1 - Multiplayer', type: 'PS5_1_MP' },
  { id: 'PS5_2_SP', name: 'PS5-2 - Single player', type: 'PS5_2_SP' },
  { id: 'PS5_2_MP', name: 'PS5-2 - Multiplayer', type: 'PS5_2_MP' },
  { id: 'PC_1', name: 'PC-1', type: 'PC' },
  { id: 'PC_2', name: 'PC-2', type: 'PC' },
  { id: 'PC_3', name: 'PC-3', type: 'PC' },
  { id: 'PC_4', name: 'PC-4', type: 'PC' }
];

const DEFAULT_SETTINGS = {
  openTime: '08:00',
  closeTime: '22:00',
  shopStatus: 'Open',
  prices: {
    '11_to_3': { 'Pool': 500, 'PS5_1_SP': 400, 'PS5_2_SP': 400 },
    'after_3': { 'Pool': 600, 'PS5_1_SP': 500, 'PS5_2_SP': 500 },
    'full_day': { 'PS5_1_MP': 500, 'PS5_2_MP': 500, 'PC': 150 }
  }
};

// Initialize DB if empty
if (!localStorage.getItem('levelx_resources')) {
  localStorage.setItem('levelx_resources', JSON.stringify(DEFAULT_RESOURCES));
}
if (!localStorage.getItem('levelx_settings')) {
  localStorage.setItem('levelx_settings', JSON.stringify(DEFAULT_SETTINGS));
}
if (!localStorage.getItem('levelx_bookings')) {
  // Array of { id, customerName, resourceId, inTime, outTime, status: 'active', 'finished' }
  localStorage.setItem('levelx_bookings', JSON.stringify([]));
}

function getResources() {
  let res = JSON.parse(localStorage.getItem('levelx_resources')) || [];
  if (res.length > 0 && !res.find(r => r.id === 'PS5_1_SP' || r.id === 'PS5-1-SP')) {
      const filtered = res.filter(r => !r.id.toLowerCase().includes('ps5'));
      filtered.push({ id: 'PS5_1_SP', name: 'PS5-1 (Single Player)', type: 'PS5_1_SP' });
      filtered.push({ id: 'PS5_1_MP', name: 'PS5-1 (Multi Player)', type: 'PS5_1_MP' });
      filtered.push({ id: 'PS5_2_SP', name: 'PS5-2 (Single Player)', type: 'PS5_2_SP' });
      filtered.push({ id: 'PS5_2_MP', name: 'PS5-2 (Multi Player)', type: 'PS5_2_MP' });
      res = filtered;
      localStorage.setItem('levelx_resources', JSON.stringify(res));
  }
  return res;
}

function getSettings() {
  const s = JSON.parse(localStorage.getItem('levelx_settings'));
  if (!s.prices || !s.prices['11_to_3']) {
    // If empty or old schema, set to defaults but keep flat prices safe if you need
    s.prices = DEFAULT_SETTINGS.prices;
  }
  if (!s.shopStatus) s.shopStatus = 'Open';
  return s;
}

function saveSettings(settings) {
  localStorage.setItem('levelx_settings', JSON.stringify(settings));
}

function getBookings() {
  try {
    let b = JSON.parse(localStorage.getItem('levelx_bookings')) || [];
    // Migration: ensure new fields securely to prevent crashes
    b.forEach(b => {
      if(!b.inTime) b.inTime = b.time || "00:00";
      if(!b.outTime) b.outTime = b.time || "00:00";
      if(!b.inDate) b.inDate = b.date || getLocalTodayStr();
      if(typeof b.inTime !== 'string') b.inTime = "00:00";
      if(typeof b.outTime !== 'string') b.outTime = "00:00";
      // Normalize any mistakenly saved 12-hour strings to 24-hr layout for native inputs
      function normalizeTo24(timeStr) {
        if (!timeStr) return "00:00";
        if (timeStr.toUpperCase().includes('M')) {
          let [t, m] = timeStr.trim().split(' ');
          if(!m) { m = timeStr.slice(-2); t = timeStr.slice(0, -2); }
          let [h, min] = t.split(':');
          if(h == '12') h = '00';
          if(m && m.toUpperCase() === 'PM') h = parseInt(h, 10) + 12;
          return `${String(h).padStart(2,'0')}:${(min||'00').padStart(2,'0')}`;
        }
        return timeStr;
      }
      b.inTime = normalizeTo24(b.inTime);
      b.outTime = normalizeTo24(b.outTime);

      if(!b.outDate) {
        let t1 = b.inTime.split(':').map(Number);
        let t2 = b.outTime.split(':').map(Number);
        if (t2[0] < t1[0] && t2[0] < 8) {
           let d = new Date(b.date || getLocalTodayStr());
           d.setDate(d.getDate() + 1);
           b.outDate = d.toISOString().split('T')[0];
        } else {
           b.outDate = b.date || getLocalTodayStr();
        }
      }
    });
    return b;
  } catch(e) {
    console.error("Critical error in getBookings:", e);
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem('levelx_bookings', JSON.stringify(bookings));
}

function addBooking(booking) {
  const bookings = getBookings();
  let defaultPrice = 0;
  const resources = JSON.parse(localStorage.getItem('levelx_resources')) || [];
  const resource = resources.find(r => r.id === booking.resourceId);
  if (resource) {
    defaultPrice = getPriceForBooking(resource.type, booking.inTime);
  }
  const newBooking = { ...booking, id: Date.now().toString() + Math.floor(Math.random()*1000), status: 'active', unitPrice: booking.unitPrice || defaultPrice || 0 };
  bookings.push(newBooking);
  saveBookings(bookings);
  return newBooking;
}

function getPriceForBooking(resourceType, inTimeStr) {
  const s = getSettings();
  const prices = s.prices || {};
  let hour = 12; // default
  if (inTimeStr) hour = parseInt(inTimeStr.split(':')[0], 10);
  
  let matchKey = 'pc';
  let tStr = (resourceType || '').toLowerCase();
  
  if (tStr.includes('pool')) matchKey = 'pool';
  else if (tStr.includes('ps5')) {
     if (tStr.includes('mp')) matchKey = 'ps5_mp';
     else matchKey = 'ps5_sp';
  }
  
  let categoryBlock = 'full_day';
  if (hour >= 11 && hour < 15) categoryBlock = '11_to_3';
  else if (hour >= 15) categoryBlock = 'after_3';
  
  const dict = prices[categoryBlock] || prices['full_day'] || {};
  let price = dict[matchKey];
  
  if (!price && price !== 0) {
      const fbDict = prices['full_day'] || {};
      price = fbDict[matchKey] || 0;
  }
  
  return price || 0;
}

function calculateDuration(stMs, etMs) {
  let diffMin = (etMs - stMs) / (1000 * 60);
  if (diffMin <= 0) return 0;
  return Math.ceil(diffMin / 30) * 0.5;
}

function getLocalTodayStr() {
  const nowRaw = new Date();
  return nowRaw.getFullYear() + '-' + String(nowRaw.getMonth() + 1).padStart(2, '0') + '-' + String(nowRaw.getDate()).padStart(2, '0');
}

function hasConflict(resourceId, inD, inT, outD, outT) {
  const settings = getSettings();
  if (settings.repairResources && settings.repairResources.includes(resourceId)) {
    return 'repair';
  }

  const newStart = parseDateTimeMs(inD, inT);
  const newEnd = parseDateTimeMs(outD, outT);

  let baseResId = resourceId.replace('_SP', '').replace('_MP', '');

  const bookings = getBookings().filter(b => b.status === 'active');
  for (let b of bookings) {
    let bBaseResId = b.resourceId.replace('_SP', '').replace('_MP', '');
    if (bBaseResId === baseResId) {
       let bStart = parseDateTimeMs(b.inDate, b.inTime);
       let bEnd = parseDateTimeMs(b.outDate, b.outTime);
       if (newStart < bEnd && newEnd > bStart) {
         return true; // Conflict found
       }
    }
  }
  return false;
}

function timeToMins(t) {
  if (!t || typeof t !== 'string') return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getLogicalDateStr() {
  return getLocalTodayStr();
}

function updateUnitPrice(id, price) {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index !== -1) {
    bookings[index].unitPrice = Number(price);
    bookings[index].isManualPrice = true;
    saveBookings(bookings);
  }
}

function completeBooking(id) {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index !== -1) {
    bookings[index].status = 'finished';
    saveBookings(bookings);
  }
}

function checkTimeElapsed(outTime) {
  if (!outTime || typeof outTime !== 'string') return false;
  // Use our safe parser to ensure accuracy if dates are present, else fallback
  const now = new Date();
  const [outHours, outMinutes] = outTime.split(':').map(Number);
  
  const outDate = new Date();
  outDate.setHours(outHours, outMinutes, 0, 0);

  return now > outDate;
}

function parseDateTimeMs(dStr, tStr) {
  if (!dStr || !tStr) return 0;
  
  var d = String(dStr).trim();
  var t = String(tStr).trim();

  // Handle slashes to dashes
  if (d.includes('/')) {
    var parts = d.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) d = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      else d = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }

  // Handle AM/PM
  var isPM = t.toLowerCase().includes('pm');
  var isAM = t.toLowerCase().includes('am');
  if (isPM || isAM) {
     t = t.replace(/am|pm/gi, '').trim();
     var tPartsTemp = t.split(':');
     var tH = parseInt(tPartsTemp[0], 10);
     var tM = parseInt(tPartsTemp[1] || 0, 10);
     if (isPM && tH < 12) tH += 12;
     if (isAM && tH === 12) tH = 0;
     t = `${String(tH).padStart(2, '0')}:${String(tM).padStart(2, '0')}`;
  }

  // Cross-browser bulletproof parsing
  var dParts = d.split('-');
  var tParts = t.split(':');
  
  if (dParts.length >= 3 && tParts.length >= 2) {
      var year = parseInt(dParts[0], 10);
      var month = parseInt(dParts[1], 10) - 1; // 0-indexed
      var day = parseInt(dParts[2], 10);
      var hour = parseInt(tParts[0], 10);
      var minute = parseInt(tParts[1], 10);
      
      var ms = new Date(year, month, day, hour, minute, 0).getTime();
      if (!isNaN(ms)) return ms;
  }

  return new Date().getTime() + Math.random(); // Fallback
}

// Custom Modal System (Alert/Confirm/Prompt)
window.CustomModal = {
  createOverlay: function() {
    let overlay = document.getElementById('custom-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'custom-modal-overlay';
      overlay.className = 'custom-modal-overlay';
      overlay.style.pointerEvents = 'none';
      document.body.appendChild(overlay);
    }
    return overlay;
  },
  show: function(options) {
    const overlay = this.createOverlay();
    const type = options.type || 'alert'; // 'alert', 'confirm', 'prompt'
    
    let inputHtml = type === 'prompt' ? `<input type="text" id="custom-modal-input-val" class="custom-modal-input" value="${options.defaultValue || ''}">` : '';
    let buttonsHtml = '';
    
    if (type === 'alert') {
      buttonsHtml = `<button class="btn" id="custom-modal-btn-ok" style="width: 100%;">OK</button>`;
    } else if (type === 'confirm' || type === 'prompt') {
      buttonsHtml = `
        <button class="btn" id="custom-modal-btn-cancel" style="width: 50%; background: var(--text-muted);">Cancel</button>
        <button class="btn" id="custom-modal-btn-ok" style="width: 50%;">OK</button>
      `;
    }

    overlay.innerHTML = `
      <div class="custom-modal">
        <p>${options.message}</p>
        ${inputHtml}
        <div class="custom-modal-actions">
          ${buttonsHtml}
        </div>
      </div>
    `;

    const modal = overlay.querySelector('.custom-modal');
    
    // Trigger animation
    setTimeout(() => {
      overlay.style.pointerEvents = 'auto';
      overlay.style.opacity = '1';
      modal.classList.add('show');
      const input = document.getElementById('custom-modal-input-val');
      if (input) input.focus();
    }, 10);

    const close = (result) => {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      modal.classList.remove('show');
      setTimeout(() => overlay.innerHTML = '', 300);
      if (options.onClose) options.onClose(result);
    };

    document.getElementById('custom-modal-btn-ok').addEventListener('click', () => {
      let result = true;
      if (type === 'prompt') {
        const val = document.getElementById('custom-modal-input-val').value;
        if (val === null || val === undefined || val === '') return;
        result = val;
      }
      close(result);
    });

    const cancelBtn = document.getElementById('custom-modal-btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => close(type === 'prompt' ? null : false));
    }
  },
  alert: function(message) {
    return new Promise(resolve => this.show({ type: 'alert', message, onClose: resolve }));
  },
  confirm: function(message) {
    return new Promise(resolve => this.show({ type: 'confirm', message, onClose: resolve }));
  },
  prompt: function(message, defaultValue) {
    return new Promise(resolve => this.show({ type: 'prompt', message, defaultValue, onClose: resolve }));
  }
};
