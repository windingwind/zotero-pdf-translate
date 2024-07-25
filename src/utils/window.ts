export { isWindowAlive, getFocusedWindow };

function isWindowAlive(win?: Window) {
  return win && !Components.utils.isDeadWrapper(win) && !win.closed;
}

function getFocusedWindow() {
  const wins = Services.wm.getEnumerator("") as unknown as Window[];
  for (const win of wins) {
    if (win.document?.hasFocus()) {
      return win;
    }
  }
}
