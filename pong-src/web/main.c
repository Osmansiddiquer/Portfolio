#include <stdio.h>
#include <stdlib.h>
#include "utility.h"
#include "Scenes.h"
/* Web port entry point. */
HANDLE output;
int score_1;
int score_2;
double deltaTime;

void setup(){
	output = GetStdHandle(STD_OUTPUT_HANDLE);
	web_fs_load();   /* pull saved games out of localStorage ("Osman's OS") */
	fullscreen();
	hideCursor();
}

int main(int argc, char *argv[]) {
	setup();
	SplashScreen();
	return 0;
}
