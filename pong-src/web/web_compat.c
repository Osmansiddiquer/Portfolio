/* web_compat.c — implementations of the browser shims declared in web_compat.h */
#include "web_compat.h"
#include <string.h>
#include <emscripten.h>

/* Keyboard state table, indexed by browser keyCode (== Windows VK_*). */
volatile unsigned char web_keystate[256];

/* Push a UTF-8 string straight to the xterm.js terminal in the page. */
EM_JS(void, web_term_write_js, (const char *s), {
  if (Module.termWrite) Module.termWrite(UTF8ToString(s));
});

/* printf replacement: format into a buffer, then write to the terminal.
 * Buffer is generous — the widest thing drawn is an 85-col splash line. */
int web_printf(const char *fmt, ...) {
  char buf[4096];
  va_list ap;
  va_start(ap, fmt);
  int n = vsnprintf(buf, sizeof(buf), fmt, ap);
  va_end(ap);
  web_term_write_js(buf);
  return n;
}

/* system("cls") -> clear screen + scrollback + home the cursor. */
void web_system(const char *cmd) {
  (void)cmd;
  web_term_write_js("\x1b[2J\x1b[3J\x1b[H");
}

/* Called from the page's keyboard handlers to drive GetAsyncKeyState-style
 * polling (keydown() in utility.c reads this table). */
EMSCRIPTEN_KEEPALIVE void web_set_key(int code, int down) {
  if (code >= 0 && code < 256) web_keystate[code] = down ? 1 : 0;
}
EMSCRIPTEN_KEEPALIVE void web_clear_keys(void) {
  for (int i = 0; i < 256; i++) web_keystate[i] = 0;
}

/* The window sets Module.__quit when it is closed; the binary then exits at its
 * next yield/prompt so a reopen starts a brand-new game from the splash. */
EM_JS(int, web_should_quit, (void), { return Module.__quit ? 1 : 0; });

/* Cooperative frame yield. Exits the process if the window was closed. */
void web_yield(unsigned ms) {
  if (web_should_quit()) emscripten_force_exit(0);
  emscripten_sleep(ms);
}

/* Await a line typed into the terminal (replaces scanf for name/key entry).
 * Suspends the C call via ASYNCIFY until the page resolves the promise. */
EM_ASYNC_JS(void, web_read_line_js, (char *out, int maxlen), {
  const line = await Module.readLine();
  stringToUTF8(line || "", out, maxlen);
});
void web_read_line(char *out, int maxlen) {
  if (web_should_quit()) emscripten_force_exit(0);
  web_read_line_js(out, maxlen);
}

/* "Osman's OS": the save file lives at the root of localStorage. On boot we
 * hydrate the in-memory file from localStorage; after each save we flush it
 * back out, so resume data survives reloads. */
EM_JS(void, web_fs_load, (void), {
  try {
    const data = localStorage.getItem("Save Data.txt");
    if (data !== null) FS.writeFile("/Save Data.txt", data);
  } catch (e) {}
});
EM_JS(void, web_fs_sync, (void), {
  try {
    const data = FS.readFile("/Save Data.txt", { encoding: "utf8" });
    localStorage.setItem("Save Data.txt", data);
  } catch (e) {}
});
