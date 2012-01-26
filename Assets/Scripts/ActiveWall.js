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

var parentCycle : Cycle;

@RPC // This message is sent from a player to complete the act of spawning this wall
function OnSetWallAttributes(networkViewID : NetworkViewID, scaleFactor : Vector3)
{
	var parentCycleObject : GameObject = NetworkView.Find(networkViewID).gameObject;
	parentCycle = parentCycleObject.GetComponent("Cycle");
	parentCycle.createdWalls.Add(gameObject);
	gameObject.name = "Wall";
	transform.localScale = scaleFactor;
	SetWallColorRecurse(transform, parentCycle.color);
	SFXDirector.Play(parentCycle.sndTurn, parentCycle.transform.position, 0.7, 1.0);
	
	// If we're not the server, then disable colliders. We don't need them
	// because the server decides what hits what.
	if (!InputDirector.Get().IsHosting()) 
	{
		collider.enabled = false;
	}
}

@RPC // This message is sent from a player to begin destroying the wall
function OnBeginFadeAndDestroy()
{
	var f : FadeAndDestroy = gameObject.AddComponent("FadeAndDestroy");
	f.lifeSpan = 0.5;
}

function SetWallColorRecurse(t : Transform, color : Color)
{
	for (var c in t) 
	{
		if (null != c.renderer) {
			c.renderer.material.color = Color(0,0,0,1);
			if (c.transform.parent.name == "MirroredWalls") {			
				c.renderer.material.SetColor("_Emission", color * 0.2);			
			}
			else
			{
				c.renderer.material.SetColor("_Emission", color);
			}
		}
		SetWallColorRecurse(c, color);
	}
}