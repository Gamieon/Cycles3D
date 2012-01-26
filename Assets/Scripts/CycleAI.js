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

// Note: At present, this is not "AI". This is just a script that makes decisions
// based on reacting to immediate threats.

// TODO: Figure out how to support plug-ins to control the AI...it may actually
// need to attach to a GameRules script though.

var cycle : Cycle;
var raycastSource : Transform;
var target : GameObject;

function Start()
{
	InvokeRepeating("OnNewDecision", 0.2, 0.2);
	PickNewTarget();
}

function OnNewDecision() 
{
	// Cast a ray forward, to the left, and to the right of the front of the bike.
	var forwardHit : RaycastHit;
	var leftHit : RaycastHit;
	var rightHit : RaycastHit;
	Physics.Raycast(raycastSource.position, -transform.forward, forwardHit);
	Physics.Raycast(raycastSource.position, transform.right, leftHit);
	Physics.Raycast(raycastSource.position, -transform.right, rightHit);
	
	// If the bike is in imminent danger, then turn in the direction of least resistance
	if (forwardHit.distance < 200) {
		if (leftHit.distance > rightHit.distance) {
			// Turn left
			cycle.DoTurn(-1);
		} else {
			// Turn right
			cycle.DoTurn(1);
		}
		return;
	}
	
	// If we get here, we're not in imminent danger. Lets chase our target
	if (null != target)
	{
		var targetDirection : Vector3 = Vector3.Normalize(target.transform.position - transform.position);
		var targetDistance : float = Vector3.Magnitude(target.transform.position - transform.position);
	
		// Determine whether the target is ahead of, or behind us.
		var dpFwd : float = Vector3.Dot(-transform.forward, targetDirection);
		var dpRight : float  = Vector3.Dot(-transform.right, targetDirection);
		// if dpFwd is negative, our target is behind us.
		// if dpRight is negative, our target is to our left.
		if (dpFwd < 0) {

			// if dpFwd is negative (meaning our target is behind us) and it's close, then
			// lets make the target hit our wall so long as we don't hit something in the process
			if (dpRight < 0 && targetDistance < 300 && leftHit.distance > 2000) 
			{
				// Turn left
				cycle.DoTurn(-1);
				return;
			}
			else if (dpRight > 0 && targetDistance < 300 && rightHit.distance > 2000)
			{
				// Turn right
				cycle.DoTurn(1);
				return;
			}
			
			// At this point we've established the player is not close. We want to turn around and
			// chase them...but do so at a randomly slower pace
			if (Random.value < 0.15) {
				if (dpRight < 0 && leftHit.distance > 2000) {
					// Turn left
					cycle.DoTurn(-1);
					return;
				}
				else if (dpRight > 0 && rightHit.distance > 2000)
				{
					// Turn right
					cycle.DoTurn(1);
					return;
				}
			}
			
		}
		
		//Debug.Log("F:" + dpFwd + " R:" + dpRight + " D:" + targetDistance);
	}
	else
	{
		// Try to find a target
		PickNewTarget();
	}
}

private function PickNewTarget()
{
	// How about we make the human the target :)
	
	if (!InputDirector().Get().IsNetworking())
	{
		var cycles = GameObject.FindGameObjectsWithTag("Cycle");
		for (var c : GameObject in cycles)
		{
			// Find the human-driven cycle. It's the only one without
			// a CycleAI script.
			if (null == c.GetComponent("CycleAI")) {
				target = c;
				return;
			}
		}
		
		// If we get here, pick an AI opponent.
		// TODO: Change opponents every few seconds to be the cycle
		// closest to us.
		if (cycles.length > 1) 
		{
			while (null == target)
			{
				var n : int = (Random.value * 0.99) * cycles.length;
				if (cycles[n] != gameObject) 
				{
					target = cycles[n];
				}
			}
		}
	}
	else
	{
		// TODO: Pick a human target
	}
	
/*
	var cycles = GameObject.FindGameObjectsWithTag("Cycle");
	if (1 == cycles.length) 
	{
		return;
	}
	while (null == target)
	{
		var n : int = (Random.value * 0.99) * cycles.length;
		if (cycles[n] != gameObject) 
		{
			target = cycles[n];
		}
	}*/
}
