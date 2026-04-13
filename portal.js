// No import needed, functions are global

document.addEventListener('DOMContentLoaded', () => {
  // format AM/PM
  function formatAMPM(timeStr) {
    if (!timeStr) return '';
    let [h, m] = timeStr.split(':');
    let hour = parseInt(h, 10);
    let ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${hour}:${m} ${ampm}`;
  }

  // Load Settings (Store Hours)
  const settings = getSettings();
  document.getElementById('open-t').innerText = formatAMPM(settings.openTime);
  document.getElementById('close-t').innerText = formatAMPM(settings.closeTime);
  const statusBadge = document.getElementById('shop-status-badge');
  if (statusBadge) {
    statusBadge.innerText = settings.shopStatus || 'Open';
    statusBadge.style.color = (settings.shopStatus === 'Closed') ? 'var(--danger)' : 'var(--success)';
  }

  // Set date default
  const todayStr = getLocalTodayStr();
  if (document.querySelector('.cust-in-date')) document.querySelector('.cust-in-date').value = todayStr;
  if (document.querySelector('.cust-out-date')) document.querySelector('.cust-out-date').value = todayStr;

  // Initialize phone input
  const custPhone = document.getElementById('cust-phone');
  if (custPhone) {
    window.custPhoneInput = window.intlTelInput(custPhone, {
      initialCountry: "lk",
      preferredCountries: ["lk"],
      utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js"
    });
  }

  // Initialize time pickers for PCs
  if (window.innerWidth >= 768) {
    flatpickr(".cust-start", { enableTime: true, noCalendar: true, dateFormat: "H:i", altInput: true, altFormat: "h:i K" });
    flatpickr(".cust-end", { enableTime: true, noCalendar: true, dateFormat: "H:i", altInput: true, altFormat: "h:i K" });
  }

  renderResources();

  // Auto-refresh the resources every 30 seconds
  setInterval(renderResources, 30000);

  // Realtime update across tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'levelx_bookings' || e.key === 'levelx_settings') {
      renderResources();
    }
  });

  function renderCustResourceSelectors() {
    const container = document.getElementById('cust-booking-items-container');
    if (!container) return;
    const items = container.querySelectorAll('.cust-resource');
    const resources = getResources();
    items.forEach(select => {
      if (select.options.length === 0) {
        select.innerHTML = '<option value="">-- Choose Resource --</option>';
        resources.forEach(r => {
          const option = document.createElement('option');
          option.value = r.id;
          option.innerText = `${r.name}`;
          select.appendChild(option);
        });
        const parent = select.closest('.cust-booking-item');
        if (parent.querySelector('.cust-in-date')) parent.querySelector('.cust-in-date').value = getLocalTodayStr();
        if (parent.querySelector('.cust-out-date')) parent.querySelector('.cust-out-date').value = getLocalTodayStr();
      }
    });

    const newDIns = container.querySelectorAll('input[type="date"].cust-in-date:not(.flatpickr-input)');
    const newDOuts = container.querySelectorAll('input[type="date"].cust-out-date:not(.flatpickr-input)');
    newDIns.forEach(inp => flatpickr(inp, { dateFormat: "Y-m-d", altInput: true, altFormat: "m/d/Y" }));
    newDOuts.forEach(inp => flatpickr(inp, { dateFormat: "Y-m-d", altInput: true, altFormat: "m/d/Y" }));

    const newIns = container.querySelectorAll('input[type="time"].cust-start:not(.flatpickr-input)');
    const newOuts = container.querySelectorAll('input[type="time"].cust-end:not(.flatpickr-input)');
    newIns.forEach(inp => flatpickr(inp, { enableTime: true, noCalendar: true, dateFormat: "H:i", altInput: true, altFormat: "h:i K" }));
    newOuts.forEach(inp => flatpickr(inp, { enableTime: true, noCalendar: true, dateFormat: "H:i", altInput: true, altFormat: "h:i K" }));
  }

  const addResBtn = document.getElementById('cust-add-resource-btn');
  if (addResBtn) {
    addResBtn.addEventListener('click', () => {
      const container = document.getElementById('cust-booking-items-container');
      const template = container.querySelector('.cust-booking-item').cloneNode(true);

      template.querySelector('.cust-resource').innerHTML = '';
      template.querySelector('.cust-start').value = '';
      template.querySelector('.cust-end').value = '';

      // Clean up flatpickr artifacts
      const timeInWrap = template.querySelector('.cust-start').parentNode;
      const timeOutWrap = template.querySelector('.cust-end').parentNode;
      const dateInWrap = template.querySelector('.cust-in-date').parentNode;
      const dateOutWrap = template.querySelector('.cust-out-date').parentNode;

      dateInWrap.innerHTML = `
        <label>In Date</label>
        <input type="date" class="cust-in-date">
      `;
      dateOutWrap.innerHTML = `
        <label>Out Date</label>
        <input type="date" class="cust-out-date">
      `;
      timeInWrap.innerHTML = `
        <label>In Time</label>
        <input type="time" class="cust-start">
      `;
      timeOutWrap.innerHTML = `
        <label>Out Time</label>
        <input type="time" class="cust-end">
      `;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.innerText = 'X';
      removeBtn.style = 'float:right; background: var(--danger); color: white; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer;';
      removeBtn.onclick = () => { template.remove(); };
      template.prepend(removeBtn);

      container.appendChild(template);
      renderCustResourceSelectors();
    });
  }

  renderCustResourceSelectors();

  // Booking form
  document.getElementById('booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cust-name').value;
    const phone = window.custPhoneInput ? window.custPhoneInput.getNumber() : '';

    const items = document.querySelectorAll('.cust-booking-item');
    let hasError = false;
    let bookingsToCreate = [];

    const groupId = Math.floor(10000 + Math.random() * 90000).toString();

    items.forEach(item => {
      const getFVal = (parent, sel) => {
        let nodes = parent.querySelectorAll(sel);
        for(let n of nodes) if(n.value) return n.value;
        return '';
      };

      const resourceId = item.querySelector('.cust-resource').value;
      const inDateVal = getFVal(item, '.cust-in-date');
      const outDateVal = getFVal(item, '.cust-out-date');
      const inTime = getFVal(item, '.cust-start');
      const outTime = getFVal(item, '.cust-end');

      if (!resourceId) { hasError = true; window.CustomModal.alert("Please select a resource."); return; }
      if (!inTime || !outTime || !inDateVal || !outDateVal) {
        window.CustomModal.alert(`Missing Fields Detected!\nD1: '${inDateVal}' | T1: '${inTime}'\nD2: '${outDateVal}' | T2: '${outTime}'\nPlease fill in all dates and times.`);
        hasError = true;
        return;
      }

      const inDateObj = parseDateTimeMs(inDateVal, inTime);
      const outDateObj = parseDateTimeMs(outDateVal, outTime);

      if (inDateObj >= outDateObj) {
        window.CustomModal.alert(`End Time must be after Start Time!\n\nYou Entred:\nIn: ${inDateVal} ${inTime}\nOut: ${outDateVal} ${outTime}`);
        hasError = true;
        return;
      }

      const conflictStatus = hasConflict(resourceId, inDateVal, inTime, outDateVal, outTime);

      if (conflictStatus === 'repair') {
        window.CustomModal.alert(`Sorry! The selected resource is currently Under Maintenance/Repair.`);
        hasError = true;
        return;
      } else if (conflictStatus) {
        window.CustomModal.alert(`Sorry! Selected resource is already booked during your selected time.`);
        hasError = true;
        return;
      }

      bookingsToCreate.push({
        customerName: name,
        contactNum: phone,
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

    // Generate JPG Receipt
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 300 + (bookingsToCreate.length * 50);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00f2fe';
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LevelX Gaming Center', canvas.width / 2, 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Inter, sans-serif';
      ctx.fillText('Booking Receipt', canvas.width / 2, 100);

      ctx.textAlign = 'left';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`Receipt ID: #${groupId}`, 50, 150);
      ctx.fillText(`Customer: ${name} (${phone})`, 50, 180);
      ctx.fillText(`Date: ${getLogicalDateStr()}`, canvas.width - 250, 150);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 200);
      ctx.lineTo(canvas.width - 50, 200);
      ctx.stroke();

      let yY = 240;

      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillStyle = '#ffffff';
      bookingsToCreate.forEach(b => {
        const r = getResources().find(x => x.id === b.resourceId);
        const rName = r ? r.name : b.resourceId;
        const h = calculateDuration(parseDateTimeMs(b.inDate, b.inTime), parseDateTimeMs(b.outDate, b.outTime));

        ctx.fillText(`• ${rName}`, 50, yY);
        ctx.font = '14px Inter, sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText(`  ${b.inTime} - ${b.outTime} (${h} hrs)`, 50, yY + 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter, sans-serif';
        yY += 40;
      });

      // Readjust canvas height
      const finalImgData = (() => {
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = 600;
          finalCanvas.height = yY + 20; 
          const fctx = finalCanvas.getContext('2d');
          fctx.drawImage(canvas, 0, 0);
          return finalCanvas.toDataURL('image/jpeg', 0.95);
      })();
      const dlName = `LevelX_Receipt_${groupId}.jpg`;
      
      const popup = document.createElement('div');
      popup.style.position = 'fixed';
      popup.style.top = '0';
      popup.style.left = '0';
      popup.style.width = '100vw';
      popup.style.height = '100vh';
      popup.style.backgroundColor = 'rgba(0,0,0,0.85)';
      popup.style.zIndex = '999999';
      popup.style.display = 'flex';
      popup.style.flexDirection = 'column';
      popup.style.justifyContent = 'center';
      popup.style.alignItems = 'center';

      popup.innerHTML = `
        <div style="background: var(--bg-card); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-width: 90%; max-height: 90vh; overflow-y: auto; text-align: center;">
          <h2 style="color: var(--primary); margin-top: 0;">Booking Successful!</h2>
          <img src="${finalImgData}" style="max-width: 100%; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
          <div style="display: flex; gap: 10px; justify-content: center;">
              <button id="dl-receipt-btn" class="btn" style="flex: 1;">Download Receipt</button>
              <button id="close-receipt-btn" class="btn" style="flex: 1; background: var(--text-muted);">Close</button>
          </div>
        </div>
      `;

      document.body.appendChild(popup);

      document.getElementById('dl-receipt-btn').addEventListener('click', () => {
          const l = document.createElement('a');
          l.href = finalImgData;
          l.download = dlName;
          l.click();
      });

      document.getElementById('close-receipt-btn').addEventListener('click', () => {
          popup.remove();
      });
    } catch (e) {
      console.error("Receipt error:", e);
    }

    document.getElementById('booking-msg').style.display = 'block';
    setTimeout(() => {
      document.getElementById('booking-msg').style.display = 'none';
      e.target.reset();
      const container = document.getElementById('cust-booking-items-container');
      const allItems = container.querySelectorAll('.cust-booking-item');
      for (let i = 1; i < allItems.length; i++) {
        allItems[i].remove();
      }
      renderCustResourceSelectors();
    }, 3000);

    renderResources(); // Refresh availability
  });
});

function triggerSmoothRefresh(element) {
  element.style.animation = 'none';
  void element.offsetWidth; // Reflow
  element.style.animation = 'fadeIn 0.5s ease-in-out';
}

function renderResources() {
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) {
    return; // Don't interrupt user typing
  }

  const resources = getResources();
  const bookings = getBookings().filter(b => b.status === 'active');
  const list = document.getElementById('resource-list');
  const select = document.querySelector('.cust-resource');

  const currentSelectVal = select ? select.value : '';

  list.innerHTML = '';

  const now = new Date();
  const todayStr = getLogicalDateStr();
  const nowTimeStr = now.toTimeString().substring(0, 5);

  const settings = getSettings();
  const prices = settings.prices || {};

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

    const isLocked = !!activeBooking || !!nextUpcoming;

    // In the user's request: "sources monawahri currently playing wela thyenawa kyla ethakotai eyala time ekak pick karaddi future bookings wati;a thibbamai sources already book selected time kyla watila eka dropdown eke lock wenna one"
    // Since dropdown now handles specific time ranges per resource, locking it down completely from selecting might block them from booking a DIFFERENT time slot.
    // So we just indicate its status clearly in the list instead. But per request, if active/conflicting, they just won't be able to submit it for that time range (handled by `hasConflict`). We can also disable it in the dropdown if we assume they only book for right now.

    let scheduleHtml = '';

    if (isRepair) {
      scheduleHtml = '<div style="font-size: 0.85rem; margin-top: 0.5rem; color: #ffcccc;"><strong style="color: #ff3333;">Notice:</strong> This resource is temporarily out of service.</div>';
    } else if (activeBooking || upcomingBookings.length > 0) {
      scheduleHtml = '<div style="font-size: 0.85rem; margin-top: 0.5rem; color: #fff;">';

      if (activeBooking) {
        scheduleHtml += `<strong style="color: #ff3333;">${isExceeded ? 'Time Exceeded:' : 'Currently Playing:'}</strong><br>`;
        scheduleHtml += `<span style="margin-right:10px; color: #ffcccc;">• ${activeBooking.inTime} - ${activeBooking.outTime}</span><br>`;
      }

      if (upcomingBookings.length > 0) {
        if (activeBooking) scheduleHtml += '<div style="margin-top: 5px;"></div>';
        scheduleHtml += '<strong style="color: var(--primary);">Upcoming Bookings:</strong><br>';
        upcomingBookings.forEach(bk => {
          const dateLabel = bk.inDate === todayStr ? '' : `${bk.inDate} | `;
          scheduleHtml += `<span style="margin-right:10px;">• ${dateLabel}${bk.inTime} - ${bk.outTime}</span><br>`;
        });
      }

      scheduleHtml += '</div>';
    }

    // Render list items
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

    // Populate select in existing items
    const selects = document.querySelectorAll('.cust-resource');
    selects.forEach(select => {
      // We don't repopulate existing ones here to preserve selection state.
      // Only if option.innerText modification is needed, but we do that in renderCustResourceSelectors
    });
  });

  // Render clean standalone Price List
  const priceListUl = document.getElementById('price-list');
  if (priceListUl) {
    const p11to3 = prices['11_to_3'] || {};
    const pAfter3 = prices['after_3'] || {};
    const pFullDay = prices['full_day'] || {};

    const items = [
      { id: 'pool', label: 'Pool Table' },
      { id: 'ps5_sp', label: 'PS5 (Single Player)' },
      { id: 'ps5_mp', label: 'PS5 (Multi Player)' },
      { id: 'pc', label: 'PC' }
    ];

    let price11HTML = '';
    let priceAfterHTML = '';
    let priceFullHTML = '';

    items.forEach(r => {
      let p1 = p11to3[r.id];
      let p2 = pAfter3[r.id];
      let p3 = pFullDay[r.id];

      if (p1 === undefined && pFullDay[r.id] !== undefined) p1 = pFullDay[r.id];
      if (p2 === undefined && pFullDay[r.id] !== undefined) p2 = pFullDay[r.id];

      p1 = Number(p1);
      p2 = Number(p2);
      p3 = Number(p3);

      if (p1 > 0) price11HTML += `<li style="display:flex; justify-content:space-between; margin-bottom: 8px;"><span>${r.label}:</span> <strong>Rs. ${p1}</strong></li>`;
      if (p2 > 0) priceAfterHTML += `<li style="display:flex; justify-content:space-between; margin-bottom: 8px;"><span>${r.label}:</span> <strong>Rs. ${p2}</strong></li>`;
      if (p3 > 0) priceFullHTML += `<li style="display:flex; justify-content:space-between; margin-bottom: 8px;"><span>${r.label}:</span> <strong>Rs. ${p3}</strong></li>`;
    });

    priceListUl.innerHTML = `
      <h3 style="margin-bottom: 1rem; color: var(--text-muted); font-size: 0.9rem; text-align: center;">Pricing (Per Hour / Per Person)</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
          <div style="background: rgba(0,0,0,0.3); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(0,242,254,0.2);">
             <h4 style="color: var(--primary); margin-bottom: 1rem; text-align: center;">11:00 AM - 3:00 PM</h4>
             <ul style="list-style: none; padding: 0; font-size: 0.95rem; color: #ccc;">
                 ${price11HTML || '<li style="text-align:center; color:#888;">No pricing set</li>'}
             </ul>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,145,0,0.2);">
             <h4 style="color: var(--warning); margin-bottom: 1rem; text-align: center;">After 3:00 PM</h4>
             <ul style="list-style: none; padding: 0; font-size: 0.95rem; color: #ccc;">
                 ${priceAfterHTML || '<li style="text-align:center; color:#888;">No pricing set</li>'}
             </ul>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(0,230,118,0.2);">
             <h4 style="color: var(--success); margin-bottom: 1rem; text-align: center;">Full Day</h4>
             <ul style="list-style: none; padding: 0; font-size: 0.95rem; color: #ccc;">
                 ${priceFullHTML || '<li style="text-align:center; color:#888;">No pricing set</li>'}
             </ul>
          </div>
      </div>
    `;
    triggerSmoothRefresh(priceListUl);
  }

  triggerSmoothRefresh(list);
}
