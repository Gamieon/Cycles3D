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

// The current camera mode
var cameraMode : CameraMode = CameraMode.CycleFaceForward;
// Camera zoom
var requestedZoom : float = 0;
// HUD style
var hudStyle : GUIStyle;
// The Game UI for knowing if the main menu is visible
var gameUI : GameUI;
// The mouse director for getting the "wrapped" mouse position
var mouseDirector : MouseDirector;

// The cycle that the camera is watching
private var cycle : Transform;
// The position of the camera when in FaceForward ode
private var cameraFaceForwardPosition : Transform;

// The distance from the camera to the player in orbit mode
private var orbitDistance : float = 250.0;
// The distance from the camera to the player in top-down mode
private var topDownDistance : float = 600.0;
// The current zoom which we interpolate towards
private var currentZoom : float = 0;

// Set to true when the player is now watching others
private var isWatchingOtherPlayers : boolean = false;
// The index of the player being watched
private var playerBeingWatchedIndex : int;
// True if we've ever been assigned a cycle before
private var everBeenAssignedCycle : boolean = false;

function Start()
{
	cameraMode = ConfigurationDirector.GetCameraMode();
	ApplyDefaultCameraOrientation();
}

function SetCycle(newCycle : Transform)
{
	everBeenAssignedCycle = true;
	cycle = newCycle;
	cameraFaceForwardPosition = cycle.Find("CameraFaceForwardPosition");
}

function OnGUI()
{
	if (isWatchingOtherPlayers)
	{
		// Show the person we're watching near the bottom
		if (null != cycle) {
			GUI.color = cycle.GetComponent("Cycle").color;
			GUI.color.a = 0.75;
			GUI.Label(Rect(0,Screen.height-40,Screen.width,40), "Watching " + cycle.name, hudStyle);
		}
	}
}

function Update()
{
	if (Input.GetAxis("Mouse ScrollWheel") > 0) // forward
    {
        if (requestedZoom > -4) { requestedZoom--; }
    }
    else if (Input.GetAxis("Mouse ScrollWheel") < 0) // back
    {
        if (requestedZoom < 6) { requestedZoom++; }
    }
    
    // If we're watching other players, use LMB to switch between them
    if (isWatchingOtherPlayers && Input.GetMouseButtonDown(0))
    {
    	var cycles : GameObject[] = GameObject.FindGameObjectsWithTag("Cycle");
    	if (cycles.length > 0) {
    		playerBeingWatchedIndex = (playerBeingWatchedIndex + 1) % cycles.length;
    		SetCycle(cycles[playerBeingWatchedIndex].transform);
    	}
    	// If this happens to be in progress, cancel it.
    	CancelInvoke("OnSwitchToRandomPlayer");
    }
    
    // Press F5 to switch views. If the player is dead, the right mouse button is fine.
    if ((!isWatchingOtherPlayers && Input.GetKeyDown(KeyCode.F5)) ||
    	(isWatchingOtherPlayers && Input.GetMouseButtonDown(1))
    )
    {
    	var newMode : int = cameraMode;
    	newMode = (newMode + 1) % 3;
    	if (isWatchingOtherPlayers && CameraMode.CycleFaceForward == newMode) {
    		newMode = (newMode + 1) % 3;
    	}
    	cameraMode = newMode;
    	
    	// Only preserve the view change if they hit F5
    	if (!isWatchingOtherPlayers && Input.GetKeyDown(KeyCode.F5)) {
    		ConfigurationDirector.SetCameraMode(cameraMode);
    	}
    }
}

function LateUpdate()
{
	// Update the zoom
	currentZoom = (currentZoom * 4.0 + requestedZoom) / 5.0;
	// Update the camera orientation
	UpdateCameraOrientation();
}


// Timer for switching the camera to another random player
function OnSwitchToRandomPlayer()
{
	// Find another player if we're not watching any
	CancelInvoke("OnSwitchToRandomPlayer");
	var cycles : GameObject[] = GameObject.FindGameObjectsWithTag("Cycle");
	var l : float = cycles.length;
	if (l > 0) {		
		playerBeingWatchedIndex = Random.value * (l - 0.1);
		SetCycle(cycles[playerBeingWatchedIndex].transform);
		var modeInt : int = 1 + Random.value * 1.999;
		cameraMode = modeInt;
	}
}

// This function will update the player camera's position. This should be
// called each frame.
private function UpdateCameraOrientation()
{
	if (!everBeenAssignedCycle)
		return;

	var mousePos : Vector2;
	switch (cameraMode)
	{
		case CameraMode.CycleFaceForward:
			if (null != cycle) {
				// Orient the camera to look forward in front of the cycle
				Camera.main.transform.position = cameraFaceForwardPosition.position;
				Camera.main.transform.forward = -cycle.forward;
				// Do rotations on the camera so the player can look around.
				if (!gameUI.isMenuWindowVisible) {
					mousePos = GetMousePos();
					Camera.main.transform.Rotate(Vector3(mousePos.y * -30.0,mousePos.x * 90.0,0));
				}
			} else {
				// If we get here, the cycle we were watching just blew up
				HandleMissingCycle();		
			}
			break;
			
		case CameraMode.CycleOrbit:
			if (null != cycle) {
				mousePos = GetMousePos();
				if (!gameUI.isMenuWindowVisible) {
					if (mousePos.y > 0.88) { mousePos.y = 0.88; } // Don't let the orbit go under the cycle
		        	Camera.main.transform.rotation = Quaternion.Euler((1.0 - mousePos.y) * 30.0, mousePos.x * 180.0, 0);
		        }
	        	Camera.main.transform.position = Camera.main.transform.rotation * Vector3(0.0, 0.0, -(orbitDistance + currentZoom * 50.0)) + cycle.position;
			} else {
				// If we get here, the cycle we were watching just blew up
				HandleMissingCycle();
			}
			break;
			
		case CameraMode.CycleTopDown:
			if (null != cycle) {
				Camera.main.transform.position = cycle.transform.position + Vector3(0,1,1) * (topDownDistance + currentZoom * 50.0);
				Camera.main.transform.LookAt(cycle.position);
			} else {
				// If we get here, the cycle we were watching just blew up
				HandleMissingCycle();	
			}
			break;
			
		case CameraMode.Freeze:
			break;
			
		default:
			break;
	}
}

// This function is called when the cycle we were watching just blew up
private function HandleMissingCycle()
{
	cameraMode = CameraMode.Freeze;
	isWatchingOtherPlayers = true;	
	// Switch to another player in three seconds
	InvokeRepeating("OnSwitchToRandomPlayer", 3.0, 1.0);
}

private function ApplyDefaultCameraOrientation()
{
	if (Camera.main) {
		Camera.main.transform.position = Vector3(79.28511, 71.74137, 46.0177);
		Camera.main.transform.localEulerAngles = Vector3(21.97003, 223.1048, 0);
	} else {
		// We must be a dedicated server
	}
}

// Returns the position of the mouse cursor. Each axe is in the range [-1,1].
// If the mouse cursor is perfectly centered, its coordinate value is (0,0)
private function GetMousePos() : Vector2
{
	// Get the mouse position. The origin is on the lower left-hand corner
	// of the window. Input.mousePosition is given to us in screen coordinates;
	// we need to transform them such that the center of the screen is (0,0).
	var mousePos : Vector2 = Vector2(Input.mousePosition.x, Input.mousePosition.y);
	mousePos.x = (mousePos.x / Screen.width) * 2.0 - 1.0;
	mousePos.y = (mousePos.y / Screen.height) * 2.0 - 1.0;
	return mousePos;
}