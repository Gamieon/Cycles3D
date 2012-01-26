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

// Standalone script for making an object fade away and then self-terminate.

var lifeSpan : float = 1.0;
var destroyNetworkView : boolean = true;

private var tStart : float;

function Start()
{
	tStart = Time.time;
}

function FixedUpdate ()
{
	var dt : float = Time.time - tStart;
	if (dt >= lifeSpan) {	
		// Normally we would always let the input director destroy
		// an object; but this is a special case where the object
		// itself may not have been instantiated by the input manager.
		// So, we have to do this workaround.
		if (destroyNetworkView) {
			if (InputDirector.Get().IsHosting()) {
				InputDirector.Get().DestroyObject(gameObject);
			}
		} else {
			Destroy(gameObject);
		}
	} else {
		
		var a : float = Mathf.Lerp(lifeSpan, 0, dt);
		ChangeColor(transform, a);
	}
}

private function ChangeColor(t : Transform, a : float)
{
	if (null != t.renderer) {
		t.renderer.material.color.a = a;
	}
	for (var c in t)
	{
		ChangeColor(c,a);
	}
}