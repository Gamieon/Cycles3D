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

enum MainMenuMode { Main, Options, SinglePlayerSetup, NetworkLobby, NetworkLobbyHosting, 
	NetworkLobbyEnteringPassword, StartingHost, ManualConnect, ConnectingToServer, Error };

var mainMenuMode : MainMenuMode = MainMenuMode.Main;

var cycles3DTextLayout : GUIStyle;
var copyrightLayout : GUIStyle;
var pleaseWaitLayout : GUIStyle;
var errorTextLayout : GUIStyle;
var cycles3DBackColor : Color;
var guiSkin : GUISkin;

var mainCameraXForm : Transform;
var singlePlayerViewCameraXForm : Transform;
var multiplayerViewCameraXForm : Transform;
var optionsViewCameraXForm : Transform;

var hslTex : Texture2D;
var gradTex : Texture2D;

var sceneColors : Renderer[];

var cycleHue : float = 0.56;
var enemyCount : float = 1.0;

var singlePlayerView : SinglePlayerView;
var multiplayerView : MultiplayerView;
var optionsView : OptionsView;

var errorDisplayText : String;

private var oldCameraTarget : Transform;
private var cameraTarget : Transform;
private var cameraTransitionTime : float = -1;
private var cameraTransitionSpeed : float = 4.0;

function Start()
{
	// Ensure the input director is created 
	var inputDirector : InputDirector = InputDirector.Get();
	// Ensure the player component of the input director is created
	Player.GetSelf();
	// Disable the console notification area
	ConsoleDirector.Get().SetNotificationAreaVisible(false);

	// Now do some initial setup
	oldCameraTarget = mainCameraXForm;
	Camera.main.transform.position = mainCameraXForm.position;
	cycleHue = ConfigurationDirector.GetCycleHue();	
	enemyCount = ConfigurationDirector.GetEnemyCount();
	UpdateSceneColors();
}

function OnGUI() 
{
	// Set the GUI skin
	GUI.skin = guiSkin;
	
	switch (mainMenuMode)
	{
		case MainMenuMode.Main:
			RenderMain();
			break;
		case MainMenuMode.Options:
			if (optionsView.RenderUI()) 
			{
				mainMenuMode = MainMenuMode.Main;
				TransitionCamera(mainCameraXForm, 100.0);				
			}
			break;
		case MainMenuMode.SinglePlayerSetup:
			singlePlayerView.DoRender(this);
			break;
		case MainMenuMode.NetworkLobby:
		case MainMenuMode.NetworkLobbyHosting:
		case MainMenuMode.NetworkLobbyEnteringPassword:		
		case MainMenuMode.ManualConnect:
			multiplayerView.DoRender(this);
			break;
		case MainMenuMode.StartingHost:
		case MainMenuMode.ConnectingToServer:
			RenderWaitScreen();
			break;
		case MainMenuMode.Error:
			RenderErrorScreen();
			break;
	}
}

function LateUpdate()
{
	if (null != cameraTarget) 
	{
		cameraTransitionTime += Time.deltaTime * cameraTransitionSpeed;
		if (cameraTransitionTime >= 1) {
			Camera.main.transform.position = cameraTarget.position;
			Camera.main.transform.rotation = cameraTarget.rotation;
			oldCameraTarget = cameraTarget;
			cameraTarget = null;
		}
		else {
			Camera.main.transform.position = Vector3.Lerp(
				oldCameraTarget.position, cameraTarget.position, Mathf.Sin(cameraTransitionTime * Mathf.PI * 0.5)
			);
			Camera.main.transform.rotation = Quaternion.Lerp(
				oldCameraTarget.rotation, cameraTarget.rotation, Mathf.Sin(cameraTransitionTime * Mathf.PI * 0.5)
			);				
		}
	}
}

function TransitionCamera(newTarget : Transform, speed : float)
{
	cameraTarget = newTarget;
	cameraTransitionSpeed = speed;
	cameraTransitionTime = 0;
}

private function RenderMain()
{
	// Draw the "Cycles3D" logo
	var c : Color;
	for (var i=0; i < 5; i++) {
		GUI.color = Color.Lerp( cycles3DBackColor, Color(1,1,1,1), i * 0.2 );
		GUI.Label(Rect(15-i,20-i,Screen.width,Screen.height), "Cycles3D", cycles3DTextLayout);
	}
	
	// Render all the buttons
	DrawButtons();
	
	// Render the version at the bottom
	GUI.Label(Rect(Screen.width-100,Screen.height-20,100,20), "V" + VersionDirector.GetVersion(), copyrightLayout);
	
	// Render the copyright at the bottom
	GUI.Label(Rect(0,Screen.height-20,Screen.width,20), "Copyright (C) 2012 Gamieon, Inc.", copyrightLayout);
}

private function DrawButtons()
{
	var sx : float = Screen.width;
	var sy : float = Screen.height;
	if (GUI.Button(Rect(sx * 0.5, sy * 0.18, sx * 0.25, sy * 0.16), "Single\nPlayer"))
	{
		mainMenuMode = MainMenuMode.SinglePlayerSetup;
		TransitionCamera(singlePlayerViewCameraXForm, 4.0);
	}
	if (GUI.Button(Rect(sx * 0.65, sy * 0.37, sx * 0.25, sy * 0.16), "Multiplayer"))
	{
		mainMenuMode = MainMenuMode.NetworkLobby;
		TransitionCamera(multiplayerViewCameraXForm, 100.0);
	}
	if (GUI.Button(Rect(sx * 0.65, sy * 0.60, sx * 0.25, sy * 0.16), "Options"))
	{
		mainMenuMode = MainMenuMode.Options;
		TransitionCamera(optionsViewCameraXForm, 100.0);
	}
	if (GUI.Button(Rect(sx * 0.5, sy * 0.79, sx * 0.25, sy * 0.16), "Quit"))
	{
		Application.Quit();
	}
}

function UpdateSceneColors()
{
	var c : Color = ColorDirector.H2RGB(cycleHue);
	for (var r in sceneColors)
	{
		// Special case for the multi-material body
		if (r.materials.length == 2) {
			r.materials[1].color = c;
		} else {
			r.material.color = c;
		}
	}
}

private function RenderWaitScreen()
{
	var t : int = Time.time;
	var s : String = "Please Wait";
	t = t % 4;
	for (var i=0; i < t; i++) {
		s = s + ".";
	}
	GUI.Label(Rect(0,0,Screen.width,Screen.height), s, pleaseWaitLayout);
}

private function RenderErrorScreen()
{	
	var sx : float = Screen.width;
	var sy : float = Screen.height;

	GUI.Label(Rect(0,0,Screen.width,Screen.height * 0.5), errorDisplayText, errorTextLayout);
	if (GUI.Button(Rect(sx * 0.425, sy * 0.55, sx * 0.15, sy * 0.1), "Back"))
	{
		// TODO: Since we can only get here from the network lobby, we will take advantage of that
		// fact and just send the player back. The proper way is really to recall the previous
		// main menu mode, but we can fix that later.
		mainMenuMode = MainMenuMode.NetworkLobby;
	}
}
