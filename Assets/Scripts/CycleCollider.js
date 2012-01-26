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

private var inputDirector : InputDirector;
private var thisCycle : Cycle;

function Awake()
{
	thisCycle = GetComponent("Cycle");
	inputDirector = InputDirector.Get();
}

// This is called when the player cycle hits something. In all cases,
// it needs to explode. If the other object is a cycle, it too needs
// to explode.
function OnTriggerEnter(other : Collider)
{
	if (inputDirector.IsHosting())
	{	
		// Ignore collisions between the cycle and its own active wall
		// or the wall behind it
		if (other.gameObject.transform.parent == gameObject)
		{
			return;
		}
		else if (null != thisCycle.createdWalls && 
			thisCycle.createdWalls.length > 0 &&
			other.gameObject == thisCycle.createdWalls[ thisCycle.createdWalls.length - 1])
		{
			return;
		}
		
		// Figure out who all is involved in this collision
		var otherCycle : Cycle = other.gameObject.GetComponent("Cycle");
		if (null == otherCycle) {
			// Ok so this isn't another cycle. Maybe it's a wall
			var wall : ActiveWall = other.gameObject.GetComponent("ActiveWall");
			if (null != wall) {
				otherCycle = wall.parentCycle;
			}
		}
		else
		{
			// Return if the collision is cycle-to-cycle but they don't actually intersect.
			if (!collider.bounds.Intersects(other.gameObject.collider.bounds))
			{
				return;
			}
		}
		
		// Log how the collision happened
		if (Application.isEditor) {
			Debug.Log("in CycleCollider OnTriggerEnter: " + gameObject.name + " to " + other.gameObject.name);
		}
				
		// If the other object is a cycle, destroy that one first
		if (other.gameObject.tag == "Cycle") {
			Debug.Log("Destroying other cycle " + other.gameObject.name);
			DestroyCycle(otherCycle, thisCycle);
		}
		Debug.Log("Destroying this cycle " + gameObject.name);
		DestroyCycle(thisCycle, otherCycle);
	}
}

// This function will destroy a cycle. This is only be called by the game host.
private function DestroyCycle(doomedCycle : Cycle, causedByCycle : Cycle)
{
	var gameDirector : GameDirector = GameDirector.Get();
	
	// Notify the game director object of the collision
	var involved : Cycle[] = new Cycle[2];
	involved[0] = doomedCycle;
	involved[1] = causedByCycle;
	gameDirector.SendMessage("OnCycleDestroying", involved);

	// Anchor the cycle's current wall so other cycles can crash into it
	doomedCycle.AnchorActiveWall();
		
	if (inputDirector.IsNetworking()) {
		// Instantiate the explosion sphere for clients
		inputDirector.BroadcastCommand("OnShowCycleExplosion", transform.position, doomedCycle.color);
	} else {
		// Instantiate the explosion sphere locally
		var p : Player = Player.GetSelf();
		p.OnShowCycleExplosion(transform.position, doomedCycle.color.r, doomedCycle.color.g, doomedCycle.color.b, doomedCycle.color.a);
	}
	
	// Now add the fade-and-destroy script to all the walls so they get destroyed.
	// Because the wall creation is buffered, its destruction should be as well.
	for (var o in doomedCycle.createdWalls)
	{
		inputDirector.SendBufferedCommand(o, "OnBeginFadeAndDestroy");
	}
	
	// Now destroy the doomed cycle. The problem with doing so is that in when OnCycleDestroyed is
	// processed, the doomed cycle will actually still be alive (presumably because we have a reference
	// to it). So we need to change the tag first.
	doomedCycle.tag = "CycleDoomed";
	inputDirector.DestroyObject(doomedCycle.gameObject);
	
	// Now send a message to the game director object that the destruction is done
	gameDirector.gameObject.SendMessage("OnCycleDestroyed");
}