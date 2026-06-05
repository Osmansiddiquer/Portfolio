#include "utility.h"

void clamp(double* value_to_clamp, float min, float max){//min and max are inclusive
	if(*value_to_clamp < min)
		*value_to_clamp = min;
	else if(*value_to_clamp > max)
		*value_to_clamp = max;
}

/* Web: there is no console window to maximise. */
void fullscreen()
{
}

double randrange(double min,double max){
	srand(time(0));
	rand();
	double random = ((double)rand()/(RAND_MAX));
    double range =((double) random)*max;
    double num = range + min;
    return num;
}

/* Polled key state, fed by the page's keyboard events (browser keyCode
 * matches the Windows VK_* values the game asks for). */
bool keydown(int key)
{
    return web_keystate[key & 0xff] != 0;
}

/* Console colour attribute -> ANSI SGR foreground.
 * Index is the 0..15 Windows colour; we map to the 16 ANSI colours. */
void setColor(int c)
{
	static const int ansi[16] = {
		30, 34, 32, 36, 31, 35, 33, 37,   /* dim   */
		90, 94, 92, 96, 91, 95, 93, 97    /* bright */
	};
	web_printf("\x1b[%dm", ansi[c & 15]);
}

/* SetConsoleCursorPosition -> ANSI cursor move (1-based row;col). */
void gotoxy(int x, int y) {
	if(x>=0 && y>=0 && x<WIDTH && y<HEIGHT){
		web_printf("\x1b[%d;%dH", y+1, x+1);
	}
}

/* The terminal is fixed at WIDTH x HEIGHT by the loader; nothing to do. */
void setScreenSize(int length, int height)
{
}

void hideCursor()
{
	web_printf("\x1b[?25l");
}

void openFile(FILE** fp, char* filename, char* Mode){
	*fp = fopen(filename, Mode);
	if(fp == NULL){
		printf("Failed to open the file. Closing");
		exit(EXIT_FAILURE);
	}
}
