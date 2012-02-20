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

var bikeSpeed : float = 800;
var bikeAngle : float = 0;
var color : Color;
var playerID : String;
var sndTurn : AudioClip;
var cycleMesh : GameObject;
var mirroredCycleMesh : GameObject;

// The array of renderers that have diffuse colors that we need to
// sync with the player's color
var diffuseColors : MeshRenderer[];
// The array of renderers in the Mirrored cycle that we need to sync
// with the player's color
var diffuseMirroredColors : MeshRenderer[];
// The array of renderers that have emissive colors that we need to
// sync with the player's color.
var emissiveColors : MeshRenderer[];

// The active wall trail we're creating
var activeWall : Transform;
// This is the "back" of the active wall (away from the cycle). This
// is the pivot around which the cycle turns.
var activeWallPivot : Transform;
// This is the "front" of the active wall that touches the cycle. 
// Together with the active wall, the two objects define the bounds 
// of the wall actively being stretched
var activeWallForward : Transform;

// Set to true if the cycle is frozen and cannot be controlled by a player.
// This is set to true after a game begins.
var isLocked : boolean = true;

// All the walls we created (not counting the active wall)
var createdWalls : Array = new Array();

private var inputDirector : InputDirector;
private var dir : int = 0;
private var bikeVel : Vector3;
private var wallStart : Vector3;
private var originalActiveWallScale : Vector3;
private var lastPosition : Vector3;

function Awake()
{
	inputDirector = InputDirector.Get();
}

function Start()
{
	// If the player has a custom model, then set it up now. Only supported
	// in single player. Applies to all cycles.
	if (InputTransportMode.Local == inputDirector.GetMode())
	{
		var modelFileName : String = ConfigurationDirector.GetCycleModelName();
		if (ConfigurationDirector.GetDefaultCycleModelName() != modelFileName)	
		{
			// Rename the old meshes
			cycleMesh.name = "DoomedCycleMesh";
			mirroredCycleMesh.name = "DoomedCycleMirrorMesh";
			// Create the new one on the top
			var newCycleMesh : GameObject = CycleModelDirector.InstantiateSimpleCycle();
			newCycleMesh.transform.parent = cycleMesh.transform.parent;
			newCycleMesh.transform.position = cycleMesh.transform.position;
			newCycleMesh.transform.rotation = cycleMesh.transform.rotation;
			newCycleMesh.name = "CustomCycleMesh";
			newCycleMesh.SendMessage("OnUpdateCycleColors", color * 0.5f);
			// Create the new one on the bottom
			var newMirrorMesh = Instantiate(newCycleMesh);
			newMirrorMesh.transform.parent = mirroredCycleMesh.transform.parent;
			newMirrorMesh.transform.position = mirroredCycleMesh.transform.position;
			newMirrorMesh.transform.rotation = mirroredCycleMesh.transform.rotation;
			newMirrorMesh.transform.localScale.y *= -1;
			newMirrorMesh.name = "CustomCycleMeshMirrored";
			newMirrorMesh.SendMessage("OnUpdateCycleColors", color * 0.1f);
			// Replace the old models
			Destroy(cycleMesh);
			Destroy(mirroredCycleMesh);
			cycleMesh = newCycleMesh;
			mirroredCycleMesh = newMirrorMesh;
		}		
	}
	// Wall setup
	originalActiveWallScale = activeWall.localScale;
	lastPosition = transform.position;	
	// Make sure our configuration is updated
	OnConfigurationUpdated();
	// Make sure the bike is in motion going forwards
	UpdateVelAndOrientation();
	// Tell the bike it's time to start making a new all
	StartNewActiveWall();
}

// Sent from the GameUI after the player exits from the Options menu
function OnConfigurationUpdated()
{
	audio.volume = ConfigurationDirector.GetCycleHumVolume();
}

function FixedUpdate() 
{
	if (inputDirector.IsOurs(gameObject)) 
	{
		// Update the player's position
		UpdatePlayerPosition();
		// Stretch the active wall 
		UpdateActiveWall();
	}
}

function LateUpdate()
{
	// Update the audio source to reflect the speed
	var p : Vector3 = transform.position;
	audio.pitch = 1.0 + Vector3.Magnitude(lastPosition - p) * 0.02;
	lastPosition = p;
}

function OnAccelerateAndUnlock(newSpeed : float)
{
	bikeSpeed = newSpeed;
	isLocked = false;	
	UpdateVelAndOrientation();
}

// This function is called when the bike needs to turn. The input is the
// direction increment (either 1 or -1)
function DoTurn(dirInc : int)
{
	if (!isLocked && inputDirector.IsOurs(gameObject)) 
	{
		dir += dirInc;
		// Clone the active wall so that it stays in the playfield
		AnchorActiveWall();
		// Get the world position of the active wall pivot point (the back end of the wall)
		var pivotPoint : Vector3 = activeWallPivot.position;
		// Update the player's velocity and orientation
		UpdateVelAndOrientation();
		// Now reset the cycle position so that its current activeWallPivot
		// is the same as pivotPoint.
		var diff : Vector3 = (pivotPoint - activeWallPivot.position);
		transform.position += diff;
		// Now reset the active wall
		StartNewActiveWall();
	}
}

// This function changes the speed of the cycle
function ChangeSpeed(delta : float)
{
	if (!isLocked && inputDirector.IsOurs(gameObject)) 
	{
		bikeSpeed += delta;
		if (bikeSpeed < 0) {
			bikeSpeed = 0;
		}		
		UpdateVelAndOrientation();
	}
}

// This function will update the bike velocity and orientation based on the
// bike's speed and angle. This should only be used when either speed or
// angle change.
private function UpdateVelAndOrientation()
{
	if (inputDirector.IsOurs(gameObject)) 
	{
		bikeVel.x = Mathf.Cos(dir * 90.0 * Mathf.Deg2Rad) * bikeSpeed;
		bikeVel.z = -Mathf.Sin(dir * 90.0 * Mathf.Deg2Rad) * bikeSpeed;
		transform.localEulerAngles = Vector3(0,(dir+3) * 90,0);
	}
}

// This function will update the player's position. This should be called
// each frame.
private function UpdatePlayerPosition()
{
	if (inputDirector.IsOurs(gameObject))
	{
		transform.position += bikeVel * Time.deltaTime;
	}
}

// This function will stretch the active wall so that it's between wallStart and the
// cycle.
private function UpdateActiveWall()
{
	if (inputDirector.IsOurs(gameObject))
	{
		// Calculate the center of the wall
		var c : Vector3 = (wallStart + activeWallForward.position) * 0.5;
		// Reposition the wall
		activeWall.transform.position = c;
		// Stretch the wall
		var s : float = Vector3.Magnitude(wallStart - activeWallForward.position);
		// We have to multiply s by a crazy constant because when the scale of the plane is
		// [1,1,1], the line segment that connects the top left to the bottom right of the
		// plane is actually much larger than sqrt(2).
		activeWall.transform.localScale.x = s * 0.045041;
	}
}

// This function will clone the active wall so that it stays on the playfield until
// the cycle is destroyed or the game is over
function AnchorActiveWall()
{
	if (inputDirector.IsOurs(gameObject))
	{
		var wallClone : GameObject = inputDirector.InstantiateObject(
			Resources.Load("Prefabs/ActiveWall")
			,activeWall.position
			,activeWall.rotation
			,Player.GetSelf().GetCycleGroupID()
			);

		if (inputDirector.IsNetworking())
		{
			wallClone.networkView.RPC("OnSetWallAttributes", RPCMode.AllBuffered,
				gameObject.networkView.viewID, activeWall.transform.localScale);		
		}
		else		
		{
			createdWalls.Add(wallClone);
			wallClone.name = "Wall";
			wallClone.transform.localScale = activeWall.transform.localScale;
			wallClone.GetComponent("ActiveWall").SetWallColorRecurse(wallClone.transform, color);
			SFXDirector.Play(sndTurn, transform.position, 0.7, 1.0);
		}		
	}
}

// This function will begin a new active wall so that we can begin expanding it. This
// should be called when the game starts and whenever a player turns AFTER the existing
// wall has been cloned and preserved in the playfield.
private function StartNewActiveWall()
{
	if (inputDirector.IsOurs(gameObject))
	{
		wallStart = activeWallPivot.position;
		// Reset the active wall's scale
		activeWall.transform.localScale = originalActiveWallScale;
	}
}

@RPC
function OnSetCycleAttributes(owningPlayerID : String, name : String, hue : float)
{
	SetStartingAttributes(owningPlayerID, name, hue);
	
	// If we're not the server, then disable colliders. We don't need them
	// because the server decides what hits what.
	if (!InputDirector.Get().IsHosting()) 
	{
		collider.enabled = false;
	}	
}

private function SetStartingAttributes(owningPlayerID : String, name : String, hue : float)
{
	playerID = owningPlayerID;
	gameObject.name = name;
	color = ColorDirector.H2RGB(hue);
	BroadcastMessage("OnUpdateCycleColors", color, SendMessageOptions.DontRequireReceiver);	
}

@script RequireComponent(NetworkView)
@script RequireComponent(AudioSource)