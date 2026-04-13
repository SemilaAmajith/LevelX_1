// No import needed, functions are global

document.addEventListener('DOMContentLoaded', () => {
  // Load Settings (Store Hours)
  const settings = getSettings();
  document.getElementById('open-t').innerText = settings.openTime;
  document.getElementById('close-t').innerText = settings.closeTime;

  // Set default date to today
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('cust-date').value = todayStr;

  renderResources();

  // Booking form
  document.getElementById('booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cust-name').value;
    const resourceId = document.getElementById('cust-resource').value;
    const dateVal = document.getElementById('cust-date').value;
    const inTime = document.getElementById('cust-start').value;
    const outTime = document.getElementById('cust-end').value;

    addBooking({
      customerName: name,
      resourceId: resourceId,
      date: dateVal,
      inTime: inTime,
      outTime: outTime
    });

    document.getElementById('booking-msg').style.display = 'block';
    setTimeout(() => {
        document.getElementById('booking-msg').style.display = 'none';
        e.target.reset();
        document.getElementById('cust-date').value = todayStr; // reset to today
    }, 3000);

    renderResources(); // Refresh availability
  });
});

function renderResources() {
  const resources = getResources();
  const bookings = getBookings().filter(b => b.status === 'active');
  const list = document.getElementById('resource-list');
  const select = document.getElementById('cust-resource');

  list.innerHTML = '';
  select.innerHTML = '<option value="">-- Choose Resource --</option>';

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nowTimeStr = now.toTimeString().substring(0, 5); //HH:MM format for simple logic

  resources.forEach(r => {
    // Filter today's active bookings for this resource
    const todaysBookings = bookings.filter(b => b.resourceId === r.id && b.date === todayStr);

    // Is it currently occupied?
    const activeBooking = todaysBookings.find(b => b.inTime <= nowTimeStr && b.outTime > nowTimeStr);
    
    // Find next upcoming booking today
    const upcomingBookings = todaysBookings.filter(b => b.inTime > nowTimeStr).sort((a,b) => a.inTime.localeCompare(b.inTime));
    const nextUpcoming = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

    let statusText = "Available Now";
    let badgeClass = "available";

    if (activeBooking) {
        statusText = 'Booked until ' + activeBooking.outTime;
        badgeClass = "booked";
    } else if (nextUpcoming) {
        statusText = 'Available until ' + nextUpcoming.inTime;
    }

    // Build a tiny schedule string for the UI so customers can see exact segments booked
    let scheduleHtml = '';
    if (todaysBookings.length > 0) {
      scheduleHtml = '<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">';
      scheduleHtml += '<strong>Today\'s Bookings:</strong><br>';
      todaysBookings.sort((a,b) => a.inTime.localeCompare(b.inTime)).forEach(bk => {
        let isPast = bk.outTime <= nowTimeStr;
        scheduleHtml += `<span style="margin-right:10px; ${isPast ? 'text-decoration:line-through; opacity:0.5': ''}">• ${bk.inTime} - ${bk.outTime}</span>`;
      });
      scheduleHtml += '</div>';
    }

    // Render list items
    const li = document.createElement('li');
    li.className = 'resource-item';
    li.style.flexDirection = 'column';
    li.style.alignItems = 'flex-start';
    li.innerHTML = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <span><strong>${r.name}</strong> <span style="font-size:0.85rem">(${r.type})</span></span>
        <span class="badge ${badgeClass}">${statusText}</span>
      </div>
      ${scheduleHtml}
    `;
    list.appendChild(li);

    // Populate select
    const option = document.createElement('option');
    option.value = r.id;
    option.innerText = `${r.name} (${r.type})`;
    select.appendChild(option);
  });
}
