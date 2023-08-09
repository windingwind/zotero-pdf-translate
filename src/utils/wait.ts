export function waitUntil(
  condition: () => boolean,
  callback: () => void,
  interval = 100,
  timeout = 10000,
) {
  const start = Date.now();
  const intervalId = setInterval(() => {
    if (condition()) {
      clearInterval(intervalId);
      callback();
    } else if (Date.now() - start > timeout) {
      clearInterval(intervalId);
    }
  }, interval);
}

export function waitUtilAsync(
  condition: () => boolean,
  interval = 100,
  timeout = 10000,
) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const intervalId = setInterval(() => {
      if (condition()) {
        clearInterval(intervalId);
        resolve();
      } else if (Date.now() - start > timeout) {
        clearInterval(intervalId);
        reject();
      }
    }, interval);
  });
}
