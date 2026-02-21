let timer = null;

self.onmessage = (e) => {
  if (e.data === 'start') {
    if (timer) clearInterval(timer);
    timer = setInterval(() => self.postMessage('tick'), 1000);
  } else if (e.data === 'stop') {
    clearInterval(timer);
    timer = null;
  }
};
