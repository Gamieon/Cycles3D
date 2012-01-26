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

// The console director is the central place where logging and text
// command dispatching should take place.
//
// This component will send the OnConsoleUserCommand message after the
// user enters a command from the open console window.
//

// A single element in the console log
class ConsoleLogEntry
{
	var text : String; // Log text
	var color : Color; // Log text color
	var t : float; // Log time
}

// The console log as an array of log entries. The zero'th element is the first entry.
var logEntries : Array = new Array();
// The latest items sent to the console log. These are removed after a short duration
var newLogEntries : Array = new Array();
private var newLogEntryLifetime : float = 6.0;
// The color to set the next log entry to
var activeLoggingColor : Color = Color(1,1,1,1);
// Solid white texture
private var whiteTex : Texture2D;
// Scrollbar position for rendering the console content
private var scrollPos : Vector2;
// The console command text
private var commandText : String = "";
// True if the console at the top of the screen is visible
private var isConsoleVisible : boolean = false;
private var hasGivenConsoleDefaultFocus : boolean = false;
// True if the notification area on the lower right is visible
private var isNotificationAreaVisible : boolean = false;
// Set to true if the console is always visible and full screen (usually
// for a dedicated server)
private var persistentConsoleWindow : boolean = false;

// Returns the one and only console
static function Get() : ConsoleDirector
{
	var o : GameObject = InputDirector.Get().gameObject;
	var c : ConsoleDirector = o.GetComponent("ConsoleDirector");
	if (null == c) {
		c = o.AddComponent("ConsoleDirector");
	}
	return c;
}

// Logs a string with the specified color to the console
static function Log(text : String, color : Color)
{
	var c : ConsoleDirector = ConsoleDirector.Get();
	if (color != c.activeLoggingColor) {
		c.SendMessage("OnConsoleSetLoggingColor", color);
	}
	c.SendMessage("OnConsoleLog", text);
}

static function Log(text : String)
{
	Log(text, Color(1,1,1,1));
}

static function GetConsoleDefaultLogColor() : Color
{
	return Color(0.7, 0.7, 0.7, 1);
}

// Logging color change handler
function OnConsoleSetLoggingColor(value : Color)
{
	activeLoggingColor = value;
}

function Awake()
{
	whiteTex = Resources.Load("Textures/white");
}

function OnLevelWasLoaded()
{
	persistentConsoleWindow = false;
}

function SetPersistentConsoleWindow()
{
	persistentConsoleWindow = true;
}

// Logging message handler. This way other components can log
// while being oblivious to the internal nature of the component
function OnConsoleLog(value : String)
{
	var e : ConsoleLogEntry = new ConsoleLogEntry();
	e.text = value;
	e.color = activeLoggingColor;
	e.t = Time.time;
	
	// Max log entries at 200 messages
	if (logEntries.length > 200) {	
		logEntries.RemoveAt(0);
	}
	logEntries.Add(e);
	// Update the scroll position to an absurdly large value to force it to the bottom
	scrollPos.y = logEntries.length * 100;
	
	// Max notification entries at 6 messages
	if (newLogEntries.length > 6) {
		newLogEntries.RemoveAt(0);
	}
	newLogEntries.Add(e);
	
	// Log to Unity as well
	Debug.Log(value);
}

// Used to change the visibility of the console in the top half of the screen
function SetConsoleVisible(value : boolean)
{
	isConsoleVisible = value;
	hasGivenConsoleDefaultFocus = false;
}

function GetConsoleVisible() : boolean
{
	return isConsoleVisible;
}

// Used to change the visibility of the notification area on the lower left
function SetNotificationAreaVisible(value : boolean)
{
	isNotificationAreaVisible = value;
}

function GetNotificationAreaVisible() : boolean
{
	return isNotificationAreaVisible;
}

function Update()
{
	if (persistentConsoleWindow) {
		// If we're a persistent full screen console, then we
		// don't regard toggling visibility or notifications
	}
	else {
		// Handle keystrokes
		if (Input.GetKeyDown(KeyCode.BackQuote)) { // Tilde (~)
			SetConsoleVisible(isConsoleVisible ? false : true);
		}
		
		// Flush the newLogEntries array of new log notifications
		for (var i=0; i < newLogEntries.length; i++) {
			var e : ConsoleLogEntry = newLogEntries[i];
			if (e.t + newLogEntryLifetime < Time.time) {
				newLogEntries.RemoveAt(i--);
			}
		}
	}
}

function OnGUI()
{
	// Render the console if it's visible
	if (persistentConsoleWindow) {
		RenderConsoleWindow(Screen.height);
	}
	else
	{
		if (isConsoleVisible) {
			RenderConsoleWindow(Screen.height / 2);
		}
		
		// Render the notification area if it's available. This will show recently added log entries.
		if (isNotificationAreaVisible) {	
			h = 22;
			var y : float = Screen.height - h*2; // Save a little room for a chat text field at the bottom
			for (var i=newLogEntries.length-1; i >= 0; i--) {
				var e : ConsoleLogEntry = newLogEntries[i];
				GUI.color = e.color;
				if (e.t + newLogEntryLifetime - Time.time < 0.5) {
					GUI.color.a = (e.t + newLogEntryLifetime - Time.time) * 2.0;
				}
				GUI.Label(Rect(2,y,Screen.width,h),e.text);
				y -= h;
			}
		}
	}
}

function RenderConsoleWindow(h : int)
{
	// This needs to be above all the other GUI's
	var oldDepth : int = GUI.depth;
	GUI.depth = -1;		
	// Render the console background
	var inputHeight : int = 22; // Height of the input text field
	GUI.color = Color(0.1,0.1,0.1,0.85);
	GUI.DrawTexture(Rect(0,0,Screen.width,h),whiteTex);
	GUI.color = Color(0.75,0.75,0.75,1);
	GUI.DrawTexture(Rect(0,h-1,Screen.width,1),whiteTex);
	
	// Now render the text in a scroll view
	GUILayout.BeginArea(Rect(2,2,Screen.width - 4, h - inputHeight));
		scrollPos = GUILayout.BeginScrollView(scrollPos);
			for (var e : ConsoleLogEntry in logEntries)
			{
				GUI.color = e.color;
				GUILayout.Label(e.text);
			}
		GUILayout.EndScrollView();
	GUILayout.EndArea();
	
	// Listen for and handle special characters
	if (Event.current.type == EventType.KeyDown)
	{
		if (Event.current.keyCode == KeyCode.KeypadEnter || Event.current.keyCode == KeyCode.Return)
		{
			var cmd : String = commandText;
			// Reset the command text
			commandText = "";
			// Now execute the command
			SendMessage("OnConsoleUserCommand", cmd, SendMessageOptions.DontRequireReceiver);
		}
		else if (Event.current.keyCode == KeyCode.BackQuote || Event.current.keyCode == KeyCode.Escape) // Tilde (~)
		{
			SetConsoleVisible(false);
		}
	}
	
	// Now render the input box
	GUI.color = Color(1,1,1,1);
	GUI.SetNextControlName("ConsoleCommandText");
	commandText = GUI.TextField(Rect(0,h - inputHeight,Screen.width, inputHeight), commandText);
	if (!hasGivenConsoleDefaultFocus) {
		GUI.FocusControl("ConsoleCommandText");
		hasGivenConsoleDefaultFocus = true;
	}
}