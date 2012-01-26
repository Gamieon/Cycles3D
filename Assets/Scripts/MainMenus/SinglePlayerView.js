/*******************************************************************************

Copyright (C) 2012 Gamieon, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

******************************************************************************/

var hslTex : Texture2D;
var gradTex : Texture2D;
var arialSkin : GUISkin;

function DoRender(director : MainMenuDirector)
{
	// Change the GUI skin for the static text for configuration options
	var oldSkin : GUISkin = GUI.skin;
	GUI.skin = arialSkin;

	var sx : float = Screen.width;
	var sy : float = Screen.height;	

	// Let the player configure their cycle color
	GUI.Label(Rect(sx * 0.1, sy * 0.1, sx * 0.4, 22), "Cycle Color");
	GUI.DrawTexture(Rect(sx * 0.51, sy * 0.1 + 8, sx * 0.28, 7), hslTex);
	var newHue : float = GUI.HorizontalSlider(Rect(sx * 0.5, sy * 0.1 + 6, sx * 0.3, 20), director.cycleHue, 0, 1);
	if (newHue != director.cycleHue) {
		director.cycleHue = newHue;
		ConfigurationDirector.SetCycleHue(newHue);
		director.UpdateSceneColors();
	}
	
	// Let the player configure the AI count
	var intEnemyCount : int = director.enemyCount;
	GUI.Label(Rect(sx * 0.1, sy * 0.2, sx * 0.4, 22), "Enemies: " + intEnemyCount.ToString());
	GUI.DrawTexture(Rect(sx * 0.51, sy * 0.2 + 6, sx * 0.28, 7), gradTex);
	var newEnemyCount : float = GUI.HorizontalSlider(Rect(sx * 0.5, sy * 0.205, sx * 0.3, 20), director.enemyCount, 1, 10);
	if (newEnemyCount != director.enemyCount)
	{
		director.enemyCount = newEnemyCount;
		ConfigurationDirector.SetEnemyCount(newEnemyCount);
	}
	
	// Restore the original skin for the buttons
	GUI.skin = oldSkin;
		
	// Play button
	if (GUI.Button(Rect(sx * 0.2, sy * 0.75, sx * 0.25, sy * 0.16), "Play"))
	{
		// Populate the player list with self and AI players. We can't do this in the game scene
		// or else we'll keep resetting the scores.
		var player : Player = Player.GetSelf();
		player.ClearPlayerList();
		player.AddPlayer("0", ConfigurationDirector.GetPlayerName(), ConfigurationDirector.GetCycleHue(), false);
		var enemyCount : int = ConfigurationDirector.GetEnemyCount();
		for (i=0; i < enemyCount; i++)
		{
			player.AddPlayer((i+1).ToString(), "BOT", Random.value, false);
		}
		
		// Start a single player game
		var inputDirector : InputDirector = InputDirector.Get();
		inputDirector.SetMode(InputTransportMode.Local);
		inputDirector.LoadScene("Game");
	}

	// Back button
	if (GUI.Button(Rect(sx * 0.6, sy * 0.75, sx * 0.25, sy * 0.16), "Back"))
	{
		director.mainMenuMode = MainMenuMode.Main;
		director.TransitionCamera(director.mainCameraXForm, 4.0);
	}	
}