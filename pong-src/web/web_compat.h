/*
 * web_compat.h — browser/Emscripten compatibility shim for Pong.
 *
 * The original game targets the Windows console API (windows.h, conio.h):
 * cursor positioning, console colour attributes, GetAsyncKeyState polling,
 * PlaySound, Sleep, system("cls"). None of that exists under Emscripten,
 * so we replace each piece with its terminal/web equivalent:
 *
 *   - rendering   -> ANSI escape sequences written to an xterm.js terminal
 *   - input       -> a key-state table fed by the page's keyboard events
 *                    (browser KeyboardEvent.keyCode already matches Win VK_*)
 *   - timing      -> wall-clock ms via emscripten_get_now()
 *   - blocking    -> emscripten_sleep() yields to the browser (ASYNCIFY)
 *   - text input  -> web_read_line() awaits a line from the terminal
 *   - persistence -> the save file is synced to the root of localStorage
 *                    (this is "Osman's OS": localStorage is the filesystem)
 */
#pragma once

#ifdef __EMSCRIPTEN__

#include <stdarg.h>
#include <stdio.h>
#include <time.h>
#include <emscripten.h>

/* ---- Windows types/handles the game still references ------------------- */
typedef int HANDLE;
#define STD_OUTPUT_HANDLE 0
#define GetStdHandle(x) ((HANDLE)0)

/* ---- Virtual-key codes used by the game (match browser keyCode) -------- */
#define VK_RETURN 0x0D
#define VK_MENU   0x12
#define VK_SPACE  0x20
#define VK_LEFT   0x25
#define VK_UP     0x26
#define VK_RIGHT  0x27
#define VK_DOWN   0x28

/* ---- Live keyboard state, written from JS (see pong loader) ------------ */
extern volatile unsigned char web_keystate[256];

/* ---- Terminal / platform shims ---------------------------------------- */
int  web_printf(const char *fmt, ...);   /* writes ANSI text to the terminal */
void web_system(const char *cmd);        /* emulates system("cls")           */
void web_read_line(char *out, int maxlen); /* awaits a line of typed input   */
void web_fs_load(void);                  /* localStorage -> save file        */
void web_fs_sync(void);                  /* save file -> localStorage         */
void web_yield(unsigned ms);             /* yield to browser; quit if asked   */

/* Redirect the game's console calls onto the web shims. These come AFTER all
 * system headers (utility.h includes them first), so the standard library is
 * left untouched and only the game's own call sites are rewritten. */
#define printf            web_printf
#define system(x)         web_system(x)
#define Sleep(ms)         web_yield((unsigned)(ms))
#define PlaySound(a, b, c) ((void)0)
#define getch()           (0)

/* Cooperative yield so the browser can paint and deliver input. Also the point
 * at which a closed window tells the binary to exit, so reopening boots fresh. */
#define WYIELD(ms)        web_yield((unsigned)(ms))

/* Real-time deltaTime: measure wall-clock ms instead of CPU clock(), so the
 * time spent yielded to the browser counts toward the frame's elapsed time. */
#undef  CLOCKS_PER_SEC
#define CLOCKS_PER_SEC 1000
#define clock() ((clock_t)emscripten_get_now())

#else
#define WYIELD(ms) ((void)0)
#endif /* __EMSCRIPTEN__ */
