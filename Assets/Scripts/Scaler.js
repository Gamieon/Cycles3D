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

// This component performs a simple continual scaling. You should avoid using
// this on physics objects; it kills performance on mobile devices.

var linearScale : Vector3 = Vector3(0,0,0);
var quadraticScale : Vector3 = Vector3(0,0,0);

private var tStart : float;

function Start()
{
	tStart = Time.time;
}

function FixedUpdate ()
{
	var dt : float = Time.time - tStart;
	transform.localScale = Vector3(
		quadraticScale.x * dt * dt + linearScale.x * dt,
		quadraticScale.y * dt * dt + linearScale.y * dt,
		quadraticScale.z * dt * dt + linearScale.z * dt
		);
}