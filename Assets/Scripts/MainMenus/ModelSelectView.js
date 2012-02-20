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

var frameTex : Texture2D;
var fileNameStyle : GUIStyle;
var fileList : String[];
var whiteTex : Texture2D;

// File listing scroll box variables go here. The -right- way to implement
// this would be to create a generic list control and use it for both this
// and the server listing in MultiplayerView.js, but in this case I'm choosing
// implementation time over correctness.
private var fileListScrollPos : Vector2;
// The selected game
var selectedFile : String;
private var mouseOverFile : String;
private var selectionScreenRect : Rect = Rect(0,0,0,0);
private var showSelectionRect : boolean = false;

function PopulateFileList()
{
	fileList = CustomContentDirector.GetFilesInFolder("CycleModels");
	selectedFile = ConfigurationDirector.GetCycleModelName();
}

// This must be called from the OnGUI function of another component.
// Returns true if the player requested to back out of this menu.
function RenderUI(sx : float, sy : float) : boolean
{
	// Draw the file list
	DrawFileList(sx,sy);
	
	// Draw the buttons	
	return DrawButtons(sx,sy);

}

private function DrawFileList(sx : float, sy : float)
{
	// Reset the mouse over index
	if(Event.current.type == EventType.Repaint) {
		mouseOverFile = null;
	}
	
	// Display the files
	var fileListRect : Rect = Rect(0, 0, sx, sy * 0.65);
	GUI.BeginGroup(fileListRect);
		GUI.color = Color(0.3,0.3,0.3,1);
		GUI.DrawTexture(fileListRect, frameTex);
		GUI.color = Color(1,1,1,1);
		
		if (null != fileList)
		{
			showSelectionRect = false;
			GUILayout.BeginArea(Rect(sx*0.06,sy*0.08,fileListRect.width*0.9,fileListRect.height*0.84));
			
				// Define field widths. This is easy because there's only one field and that's the filename
				var nameLen : float = fileListRect.width*0.8;
			
				// Show the headers		
				GUI.color = Color(0.8,0.8,0.8,1);	
				GUILayout.BeginHorizontal();
					GUILayout.Space(50);
					GUILayout.Label("Name", fileNameStyle, GUILayout.Height(16), GUILayout.Width(nameLen));
				GUILayout.EndHorizontal();
				GUILayout.Space(15);
				GUI.color = Color(1,1,1,1);
			
				fileListScrollPos = GUILayout.BeginScrollView(fileListScrollPos);
					var fileCount : int = fileList.length;
					for (var i=0; i < fileCount; i++)
					{
						GUILayout.BeginHorizontal();
							GUILayout.Space(50);
							
							// Show the file name
							GUILayout.Label(fileList[i], fileNameStyle, GUILayout.Width(nameLen));
							
							// Handle mouse events
							if(Event.current.type == EventType.Repaint)
							{
								// See if this is the row the mouse is hovering over. If so, update mouseOverFile
								var curRect : Rect = GUILayoutUtility.GetLastRect();
								curRect.xMin = 0;
								curRect.xMax = fileListRect.width*0.9;
						        if (selectedFile == fileList[i]) {
							        selectionScreenRect = Rect(
							        	sx * 0.08, sy * 0.08 + 31.0 + curRect.y,
							        	sx * 0.85, curRect.height);
							    }							    								
							    if (curRect.Contains(Event.current.mousePosition)) 
							    {
							        mouseOverFile = fileList[i];
							    }
							}

														
						GUILayout.EndHorizontal();
					}
				GUILayout.EndScrollView();		
			GUILayout.EndArea();		
			
			// Select the current mouse over row if the left mouse button is down
			if (Input.GetMouseButtonDown(0) && null != mouseOverFile) 
			{
				selectedFile = mouseOverFile;
				ConfigurationDirector.SetCycleModelName(selectedFile);
				// Load the model in the main menu scene
				SendMessage("LoadCycleModel");
			}	
			
			// Render the selection
			if (selectionScreenRect.width > 0)
			{
				GUI.color = Color(0.5,0.5,0,0.5);
				GUI.DrawTexture(selectionScreenRect, whiteTex);
				GUI.color = Color(1,1,1,1);
			}			
		}
				
	GUI.EndGroup();
}

private function DrawButtons(sx : float, sy : float) : boolean
{
	var x : float = sx * 0.02;
	var dx : float = sx * 0.2;

	if (GUI.Button(Rect(x, sy * 0.65, sx * 0.18, sy * 0.1), "Use Default"))
	{
		selectedFile = ConfigurationDirector.GetDefaultCycleModelName();
		ConfigurationDirector.SetCycleModelName(selectedFile);
		selectionScreenRect = Rect(0,0,0,0);
		// Load the model in the main menu scene
		SendMessage("LoadCycleModel");		
	}
	
	if (GUI.Button(Rect(x + dx * 4, sy * 0.65, sx * 0.15, sy * 0.1), "Back"))
	{		
		return true;
	}
	return false;
}