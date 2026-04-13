// Functions are globally available from shared.js

document.addEventListener('DOMContentLoaded', () => {
  // Request notification permissions
  // if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
  //  Notification.requestPermission();
  // }
  const settings = getSettings();
  document.getElementById('set-open').value = settings.openTime;
  document.getElementById('set-close').value = settings.closeTime;
  const setStatus = document.getElementById('set-status');
  if (setStatus) setStatus.value = settings.shopStatus || 'Open';

  const categorySelect = document.getElementById('set-price-category');
  const priceContainer = document.getElementById('price-inputs-container');

  function renderPriceInputs() {
    if (!categorySelect || !priceContainer) return;
    const cat = categorySelect.value;
    const prices = getSettings().prices[cat] || {};
    priceContainer.innerHTML = '';

    const items = [
      { id: 'pool', label: 'Pool' },
      { id: 'ps5_sp', label: 'PS5 (Single Player)' },
      { id: 'ps5_mp', label: 'PS5 (Multi Player)' },
      { id: 'pc', label: 'PC' }
    ];

    items.forEach(item => {
      priceContainer.innerHTML += `
          <div class="form-group" style="flex:1; min-width: 120px;">
             <label>${item.label}</label>
             <input type="number" data-category="${cat}" data-resource="${item.id}" class="dynamic-price-input" value="${prices[item.id] || 0}" required style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:0.8rem; border-radius:8px;">
          </div>
        `;
    });
  }

  if (categorySelect) {
    let previousCat = categorySelect.value;
    categorySelect.addEventListener('change', () => {
      // Auto-save current values before switching
      const currentSettings = getSettings();
      const inputs = document.querySelectorAll('.dynamic-price-input');
      inputs.forEach(inp => {
        currentSettings.prices[previousCat][inp.dataset.resource] = Number(inp.value);
      });
      saveSettings(currentSettings);

      previousCat = categorySelect.value;
      renderPriceInputs();
    });
    renderPriceInputs();
  }

  function renderRepairCheckboxes() {
    const container = document.getElementById('repair-resources-container');
    if (!container) return;
    container.innerHTML = '';
    const resources = getResources();
    const settings = getSettings();
    const repairList = settings.repairResources || [];

    resources.forEach(r => {
      container.innerHTML += `
           <label style="display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1);">
              <input type="checkbox" class="repair-checkbox" value="${r.id}" ${repairList.includes(r.id) ? 'checked' : ''}>
              ${r.name}
           </label>
        `;
    });
  }
  renderRepairCheckboxes();

  const todayStr = getLocalTodayStr();

  // Initialize phone input
  const adminPhone = document.getElementById('admin-cust-phone');
  if (adminPhone) {
    window.adminPhoneInput = window.intlTelInput(adminPhone, {
      initialCountry: "lk",
      preferredCountries: ["lk", "in", "us"],
      utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js"
    });
  }

  // Setup form settings
  document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const currentSettings = getSettings();

    if (categorySelect) {
      const cat = categorySelect.value;
      const inputs = document.querySelectorAll('.dynamic-price-input');
      inputs.forEach(inp => {
        currentSettings.prices[cat][inp.dataset.resource] = Number(inp.value);
      });
    }

    const repairInputs = document.querySelectorAll('.repair-checkbox');
    currentSettings.repairResources = Array.from(repairInputs).filter(i => i.checked).map(i => i.value);

    currentSettings.openTime = document.getElementById('set-open').value;
    currentSettings.closeTime = document.getElementById('set-close').value;
    if (setStatus) currentSettings.shopStatus = setStatus.value;

    saveSettings(currentSettings);
    window.CustomModal.alert("Store settings and pricing updated successfully!");
    renderSessions();
  });

  function renderAdminResourceSelectors() {
    const container = document.getElementById('admin-booking-items-container');
    if (!container) return;
    const items = container.querySelectorAll('.admin-resource');
    const resources = getResources();
    items.forEach(select => {
      if (select.options.length === 0) {
        resources.forEach(r => {
          const option = document.createElement('option');
          option.value = r.id;
          option.innerText = `${r.name} (${r.type})`;
          select.appendChild(option);
        });
        const parent = select.closest('.admin-booking-item');
        if (parent.querySelector('.admin-in-date')) parent.querySelector('.admin-in-date').value = getLocalTodayStr();
        if (parent.querySelector('.admin-out-date')) parent.querySelector('.admin-out-date').value = getLocalTodayStr();
      }
    });

    const dIns = container.querySelectorAll('input[type="date"].admin-in-date:not(.flatpickr-input)');
    const dOuts = container.querySelectorAll('input[type="date"].admin-out-date:not(.flatpickr-input)');
    dIns.forEach(inp => flatpickr(inp, { dateFormat: "Y-m-d", altInput: true, altFormat: "m/d/Y" }));
    dOuts.forEach(inp => flatpickr(inp, { dateFormat: "Y-m-d", altInput: true, altFormat: "m/d/Y" }));

    const newIns = container.querySelectorAll('input[type="time"].admin-in:not(.flatpickr-input)');
    const newOuts = container.querySelectorAll('input[type="time"].admin-out:not(.flatpickr-input)');
    newIns.forEach(inp => flatpickr(inp, { enableTime: true, noCalendar: true, dateFormat: "H:i", altInput: true, altFormat: "h:i K" }));
    newOuts.forEach(inp => flatpickr(inp, { enableTime: true, noCalendar: true, dateFormat: "H:i", altInput: true, altFormat: "h:i K" }));
  }

  const addResBtn = document.getElementById('admin-add-resource-btn');
  if (addResBtn) {
    addResBtn.addEventListener('click', () => {
      const container = document.getElementById('admin-booking-items-container');
      const template = container.querySelector('.admin-booking-item').cloneNode(true);

      template.querySelector('.admin-resource').innerHTML = '';
      template.querySelector('.admin-in').value = '';
      template.querySelector('.admin-out').value = '';

      // Clean up flatpickr artifacts
      const timeInWrap = template.querySelector('.admin-in').parentNode;
      const timeOutWrap = template.querySelector('.admin-out').parentNode;
      const dateInWrap = template.querySelector('.admin-in-date').parentNode;
      const dateOutWrap = template.querySelector('.admin-out-date').parentNode;

      dateInWrap.innerHTML = `
        <label>In Date</label>
        <input type="date" class="admin-in-date">
      `;
      dateOutWrap.innerHTML = `
        <label>Out Date</label>
        <input type="date" class="admin-out-date">
      `;
      timeInWrap.innerHTML = `
        <label>In Time</label>
        <input type="time" class="admin-in">
      `;
      timeOutWrap.innerHTML = `
        <label>Out Time</label>
        <input type="time" class="admin-out">
      `;
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.innerText = 'X';
      removeBtn.style = 'float:right; background: var(--danger); color: white; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer;';
      removeBtn.onclick = () => { template.remove(); };
      template.prepend(removeBtn);

      container.appendChild(template);
      renderAdminResourceSelectors();
    });
  }

  renderAdminResourceSelectors();

  // Handle Manual Booking
  document.getElementById('admin-booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const custName = document.getElementById('admin-cust-name').value;
    const custPhone = window.adminPhoneInput ? window.adminPhoneInput.getNumber() : '';

    const items = document.querySelectorAll('.admin-booking-item');
    let hasError = false;
    let bookingsToCreate = [];
    const groupId = Math.floor(10000 + Math.random() * 90000).toString();

    items.forEach(item => {
      const resourceId = item.querySelector('.admin-resource').value;
      const getFVal = (parent, sel) => {
        let nodes = parent.querySelectorAll(sel);
        for (let n of nodes) if (n.value) return n.value;
        return '';
      };

      const inDateVal = getFVal(item, '.admin-in-date');
      const outDateVal = getFVal(item, '.admin-out-date');
      const inTime = getFVal(item, '.admin-in');
      const outTime = getFVal(item, '.admin-out');

      const inDateObj = parseDateTimeMs(inDateVal, inTime);
      const outDateObj = parseDateTimeMs(outDateVal, outTime);

      if (!inTime || !outTime || !inDateVal || !outDateVal) {
        window.CustomModal.alert("Please fill in all dates and times.");
        hasError = true;
        return;
      }

      if (inDateObj >= outDateObj) {
        window.CustomModal.alert(`End Time must be after Start Time!\n\nYou Entred:\nIn: ${inDateVal} ${inTime}\nOut: ${outDateVal} ${outTime}`);
        hasError = true;
        return;
      }

      const conflictStatus = hasConflict(resourceId, inDateVal, inTime, outDateVal, outTime);
      if (conflictStatus === 'repair') {
        window.CustomModal.alert(`Conflict! The selected resource is currently Under Repair.`);
        hasError = true;
        return;
      } else if (conflictStatus) {
        window.CustomModal.alert(`Conflict! Select resource is already booked during the selected time.`);
        hasError = true;
        return;
      }

      bookingsToCreate.push({
        customerName: custName,
        contactNum: custPhone,
        resourceId: resourceId,
        inDate: inDateVal,
        outDate: outDateVal,
        inTime: inTime,
        outTime: outTime,
        groupId: groupId
      });
    });

    if (hasError) return;

    bookingsToCreate.forEach(b => addBooking(b));

    window.CustomModal.alert("Booking(s) created successfully!");

    e.target.reset();
    const container = document.getElementById('admin-booking-items-container');
    const allItems = container.querySelectorAll('.admin-booking-item');
    for (let i = 1; i < allItems.length; i++) {
      allItems[i].remove(); // Remove dynamically added
    }
    renderAdminResourceSelectors();
    renderSessions();
  });

  // Export to Excel/CSV function
  document.getElementById('export-btn').addEventListener('click', () => {
    const finished = window.currentFilteredHistory || getBookings().filter(b => b.status === 'finished');
    let csvContent = "data:text/csv;charset=utf-8,In Date,Out Date,Customer,Resource,In Time,Out Time,Hours,Unit Price,Amount\n";

    finished.reverse().forEach(b => {
      const resName = getResources().find(r => r.id === b.resourceId)?.name || b.resourceId;
      const st = parseDateTimeMs(b.inDate, b.inTime);
      const et = parseDateTimeMs(b.outDate, b.outTime);
      const diffHours = calculateDuration(st, et);
      const amount = (diffHours * (b.unitPrice || 0)).toFixed(2);
      csvContent += `${b.inDate || '-'},${b.outDate || '-'},${b.customerName},${resName},${b.inTime},${b.outTime},${diffHours},${b.unitPrice || 0},${amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LevelX_Session_History_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  // Initial render
  renderSessions();

  // Lightweight checker
  setInterval(() => {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) return;
    const nowMs = Date.now();
    let needsRender = false;
    getBookings().filter(b => b.status === 'active').forEach(b => {
      const et = parseDateTimeMs(b.outDate || b.date, b.outTime);
      const st = parseDateTimeMs(b.inDate || b.date, b.inTime);
      if (et <= nowMs && st <= nowMs && !notifiedSessions.has(b.id)) {
        needsRender = true;
      }
    });
    if (needsRender) renderSessions();
  }, 10000);

  window.addEventListener('storage', (e) => {
    if (e.key === 'levelx_bookings' || e.key === 'levelx_settings') {
      renderSessions();
    }
  });

  // Attach global filter listeners
  document.getElementById('apply-filters-btn').addEventListener('click', renderSessions);
  document.getElementById('clear-filters-btn').addEventListener('click', () => {
    if (document.getElementById('filter-from-date')) document.getElementById('filter-from-date').value = '';
    if (document.getElementById('filter-to-date')) document.getElementById('filter-to-date').value = '';
    document.getElementById('filter-from-time').value = '';
    document.getElementById('filter-to-time').value = '';
    document.getElementById('filter-resource').value = '';
    renderSessions();
  });
});

window.togglePaymentStatus = function (id) {
  const bookings = getBookings();
  const idx = bookings.findIndex(x => x.id === id);
  if (idx !== -1) {
    bookings[idx].paymentStatus = bookings[idx].paymentStatus === 'Paid' ? 'Pending' : 'Paid';
    saveBookings(bookings);
    renderSessions();
  }
}

// Avoid spamming notifications
const notifiedSessions = new Set();

function triggerSmoothRefresh(element) {
  element.style.animation = 'none';
  void element.offsetWidth; // Reflow
  element.style.animation = 'fadeIn 0.5s ease-in-out';
}

function renderSessions() {
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) {
    return; // Don't wipe the DOM while the user is actively filling out a field or typing
  }

  renderAdminResources(); // Update availability widget
  const allBookings = getBookings();
  const activeBookings = allBookings.filter(b => b.status === 'active');
  const finishedBookings = allBookings.filter(b => b.status === 'finished');

  const tbodyActive = document.querySelector('#sessions-table tbody');
  const tbodyHistory = document.querySelector('#history-table tbody');
  const resources = getResources();

  const now = new Date();
  const todayStr = getLogicalDateStr();
  const nowTimeStr = now.toTimeString().substring(0, 5);

  // --- RENDER ACTIVE / UPCOMING ---
  tbodyActive.innerHTML = '';

  activeBookings.sort((a, b) => {
    if (a.inDate !== b.inDate) return a.inDate.localeCompare(b.inDate);
    return timeToMins(a.inTime) - timeToMins(b.inTime);
  });

  if (activeBookings.length === 0) {
    tbodyActive.innerHTML = `<tr><td colspan="12" style="text-align: center; color: var(--text-muted)">No active or upcoming bookings.</td></tr>`;
  } else {
    let globalActivePrepaid = 0;

    const groupedBookings = {};
    activeBookings.forEach(b => {
      const gid = b.groupId || b.id; // unique group id or individual id fallback
      if (!groupedBookings[gid]) {
        groupedBookings[gid] = { customerName: b.customerName, contactNum: b.contactNum, items: [], tAmt: 0 };
      }
      groupedBookings[gid].items.push(b);
    });

    Object.keys(groupedBookings).forEach(gid => {
      const group = groupedBookings[gid];

      let groupTotal = 0;
      group.items.forEach(b => {
        const resource = resources.find(r => r.id === b.resourceId) || { name: 'Unknown', type: '?' };
        const stMs = parseDateTimeMs(b.inDate || b.date, b.inTime);
        const etMs = parseDateTimeMs(b.outDate || b.date, b.outTime);
        const hours = calculateDuration(stMs, etMs);
        let unitPrice = b.unitPrice;
        if ((!unitPrice || (unitPrice === 0 && !b.isManualPrice)) && resource) {
          unitPrice = getPriceForBooking(resource.type, b.inTime);
        }
        groupTotal += (hours * Number(unitPrice || 0));
      });

      if (group.items.length > 0 && group.items[0].groupId) {
        const hTr = document.createElement('tr');
        hTr.innerHTML = `<td colspan="12" style="background: rgba(0, 242, 254, 0.1); border-top: 2px solid var(--primary); padding: 0.5rem; text-align: left;">
            <strong style="color:var(--primary)">Receipt ID: #${gid}</strong> &nbsp; | &nbsp; Customer: ${group.customerName} &nbsp; | &nbsp; Contact: ${group.contactNum || 'N/A'} &nbsp; | &nbsp; <strong>Group Est. Total: Rs. ${groupTotal.toFixed(2)}</strong>
         </td>`;
        tbodyActive.appendChild(hTr);
      }

      group.items.forEach(b => {
        const resource = resources.find(r => r.id === b.resourceId) || { name: 'Unknown', type: '?' };
        let isUpcoming = false;
        const nowMs = now.getTime();
        const st = parseDateTimeMs(b.inDate, b.inTime);
        const et = parseDateTimeMs(b.outDate, b.outTime);

        if (st > nowMs) {
          isUpcoming = true;
        }

        let isExceeded = false;
        if (!isUpcoming && et <= nowMs) {
          isExceeded = true;
          if (!notifiedSessions.has(b.id)) {
            notifiedSessions.add(b.id);
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              if (ctx.state === 'suspended') ctx.resume();
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(850, ctx.currentTime);
              gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
              osc.connect(gainNode);
              gainNode.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 1);
              setTimeout(() => {
                if (ctx.state !== 'closed') { ctx.close().catch(console.error); }
              }, 1200);
            } catch (e) { console.error('Beep failed:', e); }

            const toast = document.createElement('div');
            toast.innerHTML = `⚠️ Time Exceeded: ${b.customerName} on ${resource.name}!`;
            toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#ff3333;color:#fff;padding:15px;border-radius:5px;z-index:9999;box-shadow:0 0 10px rgba(0,0,0,0.5);font-weight:600;animation: fadein 0.5s;';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 6000);

            if (Notification.permission === 'granted') {
              new Notification("Session Time Exceeded!", {
                body: `${b.customerName} on ${resource.name} has exceeded out time (${b.outTime}).`,
              });
            }
          }
        }

        const stMs = parseDateTimeMs(b.inDate || b.date, b.inTime);
        const etMs = parseDateTimeMs(b.outDate || b.date, b.outTime);
        const hours = calculateDuration(stMs, etMs);

        let unitPrice = b.unitPrice;
        if ((!unitPrice || (unitPrice === 0 && !b.isManualPrice)) && resource) {
          unitPrice = getPriceForBooking(resource.type, b.inTime);
        }
        unitPrice = Number(unitPrice || 0);

        const amount = (hours * unitPrice).toFixed(2);

        const payStatus = b.paymentStatus || 'Pending';
        const payColor = payStatus === 'Paid' ? 'var(--success)' : 'var(--danger)';
        if (payStatus === 'Paid') {
          window.activePrepaidAmount = (window.activePrepaidAmount || 0) + parseFloat(amount);
          globalActivePrepaid += parseFloat(amount);
        }

        const tr = document.createElement('tr');
        if (isExceeded) tr.className = 'row-danger';
        else if (isUpcoming) tr.className = 'row-upcoming';

        let timeStatus = '<span style="color:var(--success)">Active</span>';
        if (isExceeded) timeStatus = '<span style="color:var(--danger)">Exceeded</span>';
        else if (isUpcoming) timeStatus = '<span style="color:var(--primary)">Upcoming</span>';

        tr.innerHTML = `
          <td><input type="date" value="${b.inDate || b.date}" style="width: 110px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 0.3rem; border-radius:4px" onchange="window.updateBookingField('${b.id}', 'inDate', this.value)"></td>
          <td><input type="date" value="${b.outDate || b.date}" style="width: 110px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 0.3rem; border-radius:4px" onchange="window.updateBookingField('${b.id}', 'outDate', this.value)"></td>
          <td>${b.customerName} <br><span style="font-size:0.75rem; color:#888;">${b.contactNum || ''}</span></td>
          <td><strong>${resource.name}</strong> <span style="font-size:0.8rem; color: var(--text-muted)">(${resource.type})</span></td>
          <td><input type="time" class="inline-time-input" value="${b.inTime}" onchange="window.updateBookingField('${b.id}', 'inTime', this.value)"></td>
          <td><input type="time" class="inline-time-input" value="${b.outTime}" onchange="window.updateBookingField('${b.id}', 'outTime', this.value)"></td>
          <td>${hours}</td>
          <td>
            <span style="display:inline-block; min-width: 30px;">${unitPrice}</span>
            <button style="background:transparent; border:none; cursor:pointer; color:var(--primary); font-size:1rem;" onclick="window.promptEditPrice('${b.id}', ${unitPrice})">✎</button>
          </td>
          <td>${amount}</td>
          <td style="color:${payColor}; cursor:pointer; font-weight:600; min-width:80px;" onclick="window.togglePaymentStatus('${b.id}')">
            ${payStatus} <span style="font-size: 0.75rem;">(✎)</span>
          </td>
          <td>${timeStatus}</td>
          <td>
            ${!isUpcoming ? `<button class="btn btn-danger" style="padding: 0.4rem 1rem; font-size: 0.9rem;" onclick="window.finishSession('${b.id}')">Finish</button>` : `<button class="btn" style="padding: 0.4rem 1rem; font-size: 0.9rem; background: var(--text-muted);" onclick="window.finishSession('${b.id}', true)">Cancel</button>`}
          </td>
        `;
        tbodyActive.appendChild(tr);
      });
    });

    window.activePrepaidAmount = globalActivePrepaid;
  }

  triggerSmoothRefresh(tbodyActive);

  // --- RENDER HISTORY ---
  tbodyHistory.innerHTML = '';
  let totalAmount = 0;

  // --- RENDER HISTORY FILTER LOGIC ---
  const filterFromDateInput = document.getElementById('filter-from-date');
  const filterToDateInput = document.getElementById('filter-to-date');
  const filterFromInput = document.getElementById('filter-from-time');
  const filterToInput = document.getElementById('filter-to-time');
  const filterResSelect = document.getElementById('filter-resource');

  // Ensure Resource Filter Options Exist
  if (filterResSelect && filterResSelect.options.length <= 1) {
    resources.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.innerText = r.name;
      filterResSelect.appendChild(opt);
    });
  }

  const fFromDate = filterFromDateInput ? filterFromDateInput.value : '';
  const fToDate = filterToDateInput ? filterToDateInput.value : '';
  const fFrom = filterFromInput ? filterFromInput.value : '';
  const fTo = filterToInput ? filterToInput.value : '';
  const fRes = filterResSelect ? filterResSelect.value : '';

  const isFiltered = fFromDate || fToDate || fFrom || fTo || fRes;
  let filteredHistory = [];

  if (isFiltered) {
    filteredHistory = finishedBookings.filter(b => {
      const bInD = b.inDate || b.date || '';
      const bOutD = b.outDate || b.date || '';

      if (fFromDate && bInD < fFromDate) return false;
      if (fToDate && bOutD > fToDate) return false;
      if (fRes && b.resourceId !== fRes) return false;

      const stMins = timeToMins(b.inTime);
      const etMins = timeToMins(b.outTime);

      if (fFrom) {
        if (etMins <= timeToMins(fFrom)) return false;
      }
      if (fTo) {
        if (stMins >= timeToMins(fTo)) return false;
      }
      return true;
    });
  }
  window.currentFilteredHistory = filteredHistory;

  if (!isFiltered) {
    // Show instruction prompt by default instead of full history
    tbodyHistory.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 2rem;">Please apply filters to view session history and calculate revenue. <br><span style="font-size:0.8rem;">(E.g., Select today's date and click 'Filter Data')</span></td></tr>`;
  } else if (filteredHistory.length === 0) {
    tbodyHistory.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 2rem;">No records matched the selected filters.</td></tr>`;
  } else {
    // 1. Calculate totals ONLY for FILTERED finished bookings
    filteredHistory.forEach(b => {
      const resource = resources.find(r => r.id === b.resourceId) || { name: 'Unknown', type: '?' };
      const stMs = parseDateTimeMs(b.inDate, b.inTime);
      const etMs = parseDateTimeMs(b.outDate, b.outTime);
      const diffHours = calculateDuration(stMs, etMs);

      let unitPrice = b.unitPrice;
      if (!unitPrice) {
        const t = resource.type ? resource.type.toUpperCase() : 'PC';
        const s = getSettings();
        if (t === 'PC') unitPrice = Number(s.pricePC || 500);
        else if (t === 'PS5') unitPrice = Number(s.pricePS5 || 1000);
        else if (t === 'POOL') unitPrice = Number(s.pricePool || 1500);
      }
      totalAmount += parseFloat((diffHours * Number(unitPrice)).toFixed(2));
    });

    // 2. Render all filtered history (no more 30 limit, since it's filtered)
    const recentHistory = filteredHistory.slice().reverse();
    recentHistory.forEach(b => {
      const resource = resources.find(r => r.id === b.resourceId) || { name: 'Unknown', type: '?' };

      const stMs = parseDateTimeMs(b.inDate, b.inTime);
      const etMs = parseDateTimeMs(b.outDate, b.outTime);
      const diffHours = calculateDuration(stMs, etMs);

      const hours = diffHours;

      let unitPrice = b.unitPrice;
      if (!unitPrice) {
        const t = resource.type ? resource.type.toUpperCase() : 'PC';
        const s = getSettings();
        if (t === 'PC') unitPrice = Number(s.pricePC || 500);
        else if (t === 'PS5') unitPrice = Number(s.pricePS5 || 1000);
        else if (t === 'POOL') unitPrice = Number(s.pricePool || 1500);
      }
      unitPrice = Number(unitPrice);

      const amount = (hours * unitPrice).toFixed(2);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.inDate}</td>
        <td>${b.outDate}</td>
        <td>${b.customerName} <span style="font-size:0.75rem; color:#888;">${b.contactNum || ''}</span></td>
        <td><strong>${resource.name}</strong> <span style="font-size:0.8rem; color: var(--text-muted)">(${resource.type})</span></td>
        <td>${b.inTime}</td>
        <td>${b.outTime}</td>
        <td>${hours}</td>
        <td>${unitPrice}</td>
        <td>${amount}</td>
        <td><span style="color:var(--text-muted)">Completed</span></td>
        <td>
          <button class="btn btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="window.deleteHistory('${b.id}')">🗑️</button>
        </td>
      `;
      tbodyHistory.appendChild(tr);
    });

    if (filteredHistory.length > 300) {
      const infoRow = document.createElement('tr');
      infoRow.innerHTML = `<td colspan="11" style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding: 1rem;">Export CSV for complete breakdown if you have selected a very large date range.</td>`;
      tbodyHistory.appendChild(infoRow);
    }
  }

  const tfootTotal = document.getElementById('history-total');
  if (tfootTotal) tfootTotal.innerText = totalAmount.toFixed(2);

  const prepaidTotal = window.activePrepaidAmount || 0;
  const tfootPrepaid = document.getElementById('active-prepaid-total');
  if (tfootPrepaid) tfootPrepaid.innerText = prepaidTotal.toFixed(2);

  const tfootGrand = document.getElementById('grand-total');
  if (tfootGrand) tfootGrand.innerText = (totalAmount + prepaidTotal).toFixed(2);

  triggerSmoothRefresh(tbodyHistory);

  triggerSmoothRefresh(tbodyHistory);
}

window.promptEditPrice = async function (id, currentPrice) {
  const newPrice = await window.CustomModal.prompt("Enter new unit price for this session:", currentPrice);
  if (newPrice !== null && !isNaN(newPrice) && newPrice !== "") {
    window.updatePrice(id, parseFloat(newPrice));
  }
}

window.deleteHistory = async function (id) {
  if (await window.CustomModal.confirm("Are you sure you want to delete this session from history?")) {
    let bookings = getBookings();
    bookings = bookings.filter(b => b.id !== id);
    saveBookings(bookings);
    renderSessions();
  }
}

// Attach function to window for row inline onclick execution
window.updatePrice = function (id, val) {
  updateUnitPrice(id, val);
  renderSessions();
}

window.updateBookingField = function (id, field, val) {
  const bookings = getBookings();
  const idx = bookings.findIndex(x => x.id === id);
  if (idx !== -1) {
    bookings[idx][field] = val;
    saveBookings(bookings);
    renderSessions();
  }
}

// Attach function to window for row inline onclick execution
window.finishSession = async function (id, isCancel = false) {
  const msg = isCancel ? "Are you sure you want to cancel this upcoming session?" : "Are you sure you want to finish this session?";
  if (await window.CustomModal.confirm(msg)) {
    completeBooking(id);
    renderSessions();
  }
}

function renderAdminResources() {
  const resources = getResources();
  const bookings = getBookings().filter(b => b.status === 'active');
  const list = document.getElementById('admin-resource-list');
  if (!list) return;

  list.innerHTML = '';
  const now = new Date();
  const todayStr = getLogicalDateStr();
  const nowTimeStr = now.toTimeString().substring(0, 5);

  const displayResources = resources.filter(r => !r.id.includes('_MP'));

  displayResources.forEach(r => {
    // Is it currently occupied?
    const nowMs = now.getTime();

    let dispName = r.name;
    if (r.id.includes('PS5')) {
      dispName = r.id.replace('_SP', '').replace('_', ' - 0');
    }

    // Find Currently Occupying Booking (Even if exceeded)
    let rBaseId = r.id.replace('_SP', '').replace('_MP', '');
    const activeBooking = bookings.find(b => {
      let bBaseId = b.resourceId.replace('_SP', '').replace('_MP', '');
      if (bBaseId !== rBaseId) return false;
      const st = parseDateTimeMs(b.inDate || b.date, b.inTime);
      return st <= nowMs;
    });

    // Find next upcoming bookings
    const upcomingBookings = bookings.filter(b => {
      let bBaseId = b.resourceId.replace('_SP', '').replace('_MP', '');
      if (bBaseId !== rBaseId) return false;
      const st = parseDateTimeMs(b.inDate || b.date, b.inTime);
      return st > nowMs;
    }).sort((a, b) => parseDateTimeMs(a.inDate || a.date, a.inTime) - parseDateTimeMs(b.inDate || b.date, b.inTime)).slice(0, 3);

    const nextUpcoming = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

    let statusText = "Available Now";
    let badgeStyle = "background: rgba(0, 255, 136, 0.1); color: var(--success); border: 1px solid var(--success);";
    let isExceeded = false;

    const isRepair = (getSettings().repairResources || []).includes(r.id);

    if (isRepair) {
      statusText = 'Under Repair';
      badgeStyle = "background: rgba(255, 0, 0, 0.15); color: #ff3333; border: 1px solid #ff3333;";
    } else if (activeBooking) {
      const et = parseDateTimeMs(activeBooking.outDate, activeBooking.outTime);
      if (et <= nowMs) isExceeded = true;

      statusText = isExceeded ? 'Time Exceeded' : 'Currently Playing';
      badgeStyle = "background: rgba(255, 0, 0, 0.15); color: #ff3333; border: 1px solid #ff3333;";
    } else if (nextUpcoming) {
      statusText = 'Available until ' + nextUpcoming.inTime;
    }

    let scheduleHtml = '';

    if (isRepair) {
      scheduleHtml = '<div style="font-size: 0.85rem; margin-top: 0.5rem; color: #ffcccc;"><strong style="color: #ff3333;">Notice:</strong> This resource is temporarily out of service.</div>';
    } else if (activeBooking || upcomingBookings.length > 0) {
      scheduleHtml = '<div style="font-size: 0.85rem; margin-top: 0.5rem; color: #fff;">';

      if (activeBooking) {
        scheduleHtml += `<strong style="color: #ff3333;">${isExceeded ? 'Time Exceeded:' : 'Currently Playing:'}</strong><br>`;
        scheduleHtml += `<span style="margin-right:10px; color: #ffcccc;">• ${activeBooking.inTime} - ${activeBooking.outTime} (${activeBooking.customerName})</span><br>`;
      }

      if (upcomingBookings.length > 0) {
        if (activeBooking) scheduleHtml += '<div style="margin-top: 5px;"></div>';
        scheduleHtml += '<strong style="color: var(--primary);">Upcoming Bookings:</strong><br>';
        upcomingBookings.forEach(bk => {
          const dateLabel = bk.inDate === todayStr ? '' : `${bk.inDate} | `;
          scheduleHtml += `<span style="margin-right:10px;">• ${dateLabel}${bk.inTime} - ${bk.outTime} (${bk.customerName})</span><br>`;
        });
      }

      scheduleHtml += '</div>';
    }

    const li = document.createElement('li');
    li.className = 'resource-item';
    li.style.flexDirection = 'column';
    li.style.alignItems = 'flex-start';
    li.innerHTML = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <span><strong>${dispName}</strong></span>
        <span class="badge" style="${badgeStyle}">${statusText}</span>
      </div>
      ${scheduleHtml}
    `;
    list.appendChild(li);
  });
}
