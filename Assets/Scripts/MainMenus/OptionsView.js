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

var headerStyle : GUIStyle;
var gradTex : Texture2D;

private var sfxVolume : float;
private var cycleHumVolume : float;

function Start()
{
	sfxVolume = ConfigurationDirector.GetSFXVolume();
	cycleHumVolume = ConfigurationDirector.GetCycleHumVolume();
}

// This must be called from the OnGUI function of another component.
// Returns true if the player requested to back out of this menu.
function RenderUI() : boolean
{
	var sx : float = Screen.width;
	var sy : float = Screen.height;
	var w : float = sx * 0.8;
	var h : float = sy * 0.7;
	var y : float = sy * 0.2;
	var dy : float = sy * 0.1;
	var result : boolean = false;
	
	GUI.BeginGroup(Rect(sx*0.1,sy*0.1,w,h));
		GUI.color = Color(1,1,1,1);
		GUI.Box(Rect(0,0,w,h),"");
		GUI.Box(Rect(0,0,w,h),"");
		GUI.Box(Rect(0,0,w,h),"");
		GUI.Label(Rect(0, sy * 0.05, w, 64), "Options", headerStyle);	
		
		// Let the player configure the sound volume
		var pct : int = sfxVolume * 100.0;
		GUI.Label(Rect(sx * 0.05, y, sx * 0.4, 22), "SFX Volume: " + pct + "%");
		GUI.DrawTexture(Rect(sx * 0.51, y + 6, sx * 0.28, 7), gradTex);
		var newSfxVolume : float = GUI.HorizontalSlider(Rect(sx * 0.5, y + 4, sx * 0.3, 20), sfxVolume, 0,1);
		if (newSfxVolume != sfxVolume)
		{
			sfxVolume = newSfxVolume;
			ConfigurationDirector.SetSFXVolume(newSfxVolume);
		}
		y += dy;
		
		pct = cycleHumVolume * 100.0;
		GUI.Label(Rect(sx * 0.05, y, sx * 0.4, 22), "Cycle Hum Volume: " + pct + "%");
		GUI.DrawTexture(Rect(sx * 0.51, y + 6, sx * 0.28, 7), gradTex);
		var newCycleHumVolume : float = GUI.HorizontalSlider(Rect(sx * 0.5, y + 4, sx * 0.3, 20), cycleHumVolume, 0,1);
		if (newCycleHumVolume != cycleHumVolume)
		{
			cycleHumVolume = newCycleHumVolume;
			ConfigurationDirector.SetCycleHumVolume(newCycleHumVolume);
		}
		y += dy;
		
		// Back button
		if (GUI.Button(Rect(sx * 0.3, sy * 0.5, sx * 0.2, sy * 0.12), "Back"))
		{
			result = true;
		}
				
	GUI.EndGroup();	
	
	return result;
}