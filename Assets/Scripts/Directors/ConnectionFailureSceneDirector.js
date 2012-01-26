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

// The GUI skin for the scene
var guiSkin : GUISkin;
var centeredLabel : GUIStyle;
// The reason for the connection failure
private var reason : String;

static function Initialize(reason : String)
{
	PlayerPrefs.SetString("ConnectionFailureSceneReason", reason);
	Application.LoadLevel("ConnectionFailureScene");
}

function Start()
{
	// Cache the reason for the disconnection
	reason = PlayerPrefs.GetString("ConnectionFailureSceneReason");
}

function OnGUI()
{
	GUI.skin = guiSkin;
	GUI.Label(Rect(0,0,Screen.width,Screen.height / 2), reason, centeredLabel);
	
	// Back button takes the player back to the main menu
	var sx : float = Screen.width;
	var sy : float = Screen.height;
	if (GUI.Button(Rect(sx * 0.425, sy * 0.55, sx * 0.15, sy * 0.1), "Back"))
	{
		Application.LoadLevel("Main");
	}	
}