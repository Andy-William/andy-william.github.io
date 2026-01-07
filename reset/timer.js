function updateCountdown() {
  // Get current time in GMT+7
  const now = new Date();
  const options = { timeZone: 'Asia/Jakarta', hour12: false };

  // Format current time for display
  const timeString = now.toLocaleTimeString('en-GB', options);
  document.getElementById('clock').textContent = timeString;

  // Calculate Target: 5:00 AM in GMT+7
  // We create a target date object based on the local time of the GMT+7 zone
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });

  const parts = formatter.formatToParts(now);
  const dateMap = {};
  parts.forEach(p => dateMap[p.type] = p.value);

  let target = new Date(now);
  target.setHours(5, 0, 0, 0);

  // If it's already past 5 AM today, set target to 5 AM tomorrow
  if (now >= target) {
      target.setDate(target.getDate() + 1);
  }

  const diffMs = target - now;
  const diffMins = Math.floor(diffMs / (1000 * 60));

  document.getElementById('minutes').textContent = diffMins;
}

// Update every second
setInterval(updateCountdown, 1000);
updateCountdown();
