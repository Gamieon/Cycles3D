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

// The input director
private var inputDirector : InputDirector;
// The cycle that the player is controlling
private var cycle : Cycle;

function Start()
{
	inputDirector = InputDirector.Get();
}

// This is called from the Player component after the player's cycle has spawned
// to give this instance of the game control over the cycle.
function SetCycle(newCycle : Cycle)
{
	cycle = newCycle;
	Debug.Log("Game controls have been transferred to your cycle. Enjoy!");
}

// Process keyboard commands.
// TODO: Let the user configure the keys
function Update()
{	
	if (null != cycle) 
	{
		// Let the player turn left and right
		if (Input.GetKeyDown(KeyCode.A))
		{
			cycle.DoTurn(-1);
		}
		else if (Input.GetKeyDown(KeyCode.D))
		{
			cycle.DoTurn(1);
		}
		
		if (Input.GetKey(KeyCode.W)) {
			// Speed up
			cycle.ChangeSpeed(Time.deltaTime * 200.0);
		}
		else if (Input.GetKey(KeyCode.S)) {
			// Slow down
			cycle.ChangeSpeed(-Time.deltaTime * 200.0);
		}
	}
}
