function nextReset(time = new Date){
  return time - (time - 0 + 7200000) % 86400000 + 86400000;
}

function diffMins(from, to){
  return Math.floor((to-from)/(1000*60))
}

function getTimeZoneString(time = new Date){
  const offset = time.getTimezoneOffset()
  return "GMT" + (offset<=0?"+":"-") + Math.floor(Math.abs(offset)/60) + (offset%60?":"+Math.abs(offset)%60:"")
}

function updateCountdown() {
  const now = new Date();
  const yourTime = now.toLocaleTimeString('en-GB')
  const serverTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta' });
  const minutesUntilReset = diffMins(now, nextReset(now))

  document.getElementById('serverClock').textContent = serverTime;
  document.getElementById('yourTz').textContent = getTimeZoneString(now);
  document.getElementById('yourClock').textContent = yourTime;
  document.getElementById('minutes').textContent = minutesUntilReset;

  setTimeout(updateCountdown, 1000 - new Date().getMilliseconds());
}

updateCountdown();
