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

// All overhead rendering should be done here

var gameDirector : GameDirector;
var headerTextStyle : GUIStyle;
var gameOverTextStyle : GUIStyle;
var playerListHeaderStyle : GUIStyle;
var playerListSubHeaderStyle : GUIStyle;
var playerListItemStyle : GUIStyle;
var guiSkin : GUISkin;
var checkbox : Texture2D;
var checkboxChecked : Texture2D;
var cycles3DBackColor : Color;
var cycles3DTextLayout : GUIStyle;
var countdownStyle : GUIStyle;
var isMenuWindowVisible : boolean = false;
var isOptionsMenuWindowVisible : boolean = false;
var optionsView : OptionsView;

private var inputDirector : InputDirector;
private var consoleDirector : ConsoleDirector;
private var player : Player;
private var switchViewsTextFade : float = 1.0;
private var startedAsDedicatedServer : boolean = false;
private var isPlayerReadyList : boolean[];
private var readyCountdownExpiration : float = -1;
// If a countdown is in motion, this is how long we have left
private var tCountdownExpires : float = -1;

// Chat box members
private var isChatWindowVisible : boolean = false;
private var hasGivenChatWindowDefaultFocus : boolean = false;
private var chatText : String = "";

function Awake()
{
	inputDirector = InputDirector.Get();
	consoleDirector = ConsoleDirector.Get();
	player = Player.GetSelf();
	isPlayerReadyList = new boolean[ConfigurationDirector.GetAbsoluteMaxPlayerCount()];
	for (var i=0; i < ConfigurationDirector.GetAbsoluteMaxPlayerCount(); i++) {
		isPlayerReadyList[i] = false;
	}
	
	// If we're a dedicated server, then the console will render everything
	if (inputDirector.IsDedicatedServer())
	{
		startedAsDedicatedServer = true;
		consoleDirector.SetPersistentConsoleWindow();
	}
}

function Update()
{
	// Handle keystrokes
	if (inputDirector.IsNetworking() && Input.GetKeyDown(KeyCode.T)) {
		SetChatWindowVisible(isChatWindowVisible ? false : true);
	}
	
	// Handle the start countdown.
	// DEVELOPER NOTE: This happens for all clients. So, the command may be sent
	// multiple times. If it is, it's moot because all the other commands get
	// discarded.
	if (readyCountdownExpiration > -1 && Time.time > readyCountdownExpiration)
	{
		StartGameFromWaitingScreen();
	}
	
	// Listen for and handle special characters
	if (Input.GetKeyDown(KeyCode.Escape))
	{
		if (isMenuWindowVisible) {
			SetMenuWindowVisible(false);
		} else {
			SetMenuWindowVisible(true);
		}
	}
	
	// Handle countdowns in motion
	if (tCountdownExpires > -1) {
		tCountdownExpires -= Time.deltaTime;
		if (tCountdownExpires <= 0) {
			tCountdownExpires = -1;
			// Tell the game rules component that the countdown has expired
			SendMessage("OnStartCountdownExpired");
		}
	}	
}

function SetChatWindowVisible(value : boolean)
{
	isChatWindowVisible = value;
	hasGivenChatWindowDefaultFocus = false;
}

function SetMenuWindowVisible(value : boolean)
{
	isMenuWindowVisible = value;
}

// TODO: For peak performance, OnGUI should not be called if it's not needed. If another
// script in the scene invokes OnGUI, consider changing it to a custom function which this
// one invokes.
function OnGUI () 
{
	var sx : float = Screen.width;
	var sy : float = Screen.height;

	GUI.skin = guiSkin;
	if (startedAsDedicatedServer)
	{
		// Do nothing. The console director will render the screen.
	}
	else if (GameDirectorMode.WaitingForPlayers == gameDirector.GetGameMode())
	{		
		if (isMenuWindowVisible) 
		{
			// Render the main menu window if it's visible
			RenderMenuWindow(sx,sy);
		}
		else 
		{
			// Show the "Waiting for players" screen if the main menu
			// window is not visible
			RenderWaitingForPlayers(sx,sy);
		}
		
		// Render the chat window if it's visible in all cases
		if (isChatWindowVisible)
		{
			RenderChatWindow();		
		}
	}
	else
	{
		// Render the instructions overlay
		// TODO: Long term way of handling this
		if (!player.IsSelfSpectating())
		{
			RenderInstructions();
		}
	
		// Render the chat window if it's visible
		if (isChatWindowVisible)
		{
			RenderChatWindow();
		}
		
		// Render the menu window if it's visible
		if (isMenuWindowVisible) 
		{
			RenderMenuWindow(sx,sy);
		}

		// Make the cursor visibility consistent with the main menu appearance
		MouseDirector.EnsureCursorVisible(isMenuWindowVisible);
		
		// Render the player list. This is actually controlled
		// by the game rules component because we don't know how
		// to display it. Maybe it's a team DM and there's two
		// columns of names. Maybe it's a FFA. Maybe it's soccer
		// and we only show team scores.
		if (Input.GetKeyDown(KeyCode.Tab)) 
		{			
			SendMessage("OnRenderPlayerList", true);
		}
		else if (Input.GetKeyUp(KeyCode.Tab)) 
		{			
			SendMessage("OnRenderPlayerList", false);
		}
		
		// Render the help window
		if (Input.GetKey(KeyCode.F1))
		{
			RenderHelpWindow();
		}
	}	
	
	RenderCountdownTimer();
}

private function RenderWaitingForPlayers(sx : float, sy : float)
{
	var w : float = sx * 0.8;
	var h : float = sy * 0.7;
	GUI.BeginGroup(Rect(sx*0.1,sy*0.1,w,h));
		GUI.color = Color(1,1,1,1);
		GUI.Box(Rect(0,0,w,h),"");
		GUI.Box(Rect(0,0,w,h),"");
		GUI.Box(Rect(0,0,w,h),"");
		
		GUI.Label(Rect(0,0,w,40), "Waiting For Players", playerListHeaderStyle);
		
		GUI.Label(Rect(w*0.05, h*0.15, w, 20), "Ready", playerListSubHeaderStyle);
		GUI.Label(Rect(w*0.25, h*0.15, w, 20), "Name", playerListSubHeaderStyle);

		var playerCount : int = player.GetPlayerCount();
		var lineHeight : float = h * 0.1;
		var y : float = h * 0.25;
		var selfID : String = player.GetSelfID();
		for (var i=0; i < playerCount; i++) {
			var p : PlayerListElement = player.GetPlayerInfoByIndex(i);
			var rCheckbox : Rect = Rect(w*0.075, y - 6, 26, 26);
			if (!p.isSpectator) 
			{
				// Show the ready checkbox
				GUI.color = p.cycleColor;
				if (selfID == p.ID) {
					var newValue : boolean = GUI.Toggle(rCheckbox, isPlayerReadyList[i], "");
					if (newValue != isPlayerReadyList[i])
					{
						isPlayerReadyList[i] = newValue;
						inputDirector.BroadcastCommand("OnGameChangeReadyState", player.GetSelfID(), newValue);
					}
				} else {
					if (isPlayerReadyList[i]) {
						GUI.DrawTexture(rCheckbox, checkboxChecked);
					} else {
						GUI.DrawTexture(rCheckbox, checkbox);
					}
				}
			
				// Show the player's name
				//GUI.Label(Rect(w*0.05, y, w,20), p.ID, playerListItemStyle);
				//GUI.Label(Rect(w*0.1, y, w,20), p.playerName, playerListItemStyle);
				GUI.Label(Rect(w*0.25, y, w,20), p.playerName, playerListItemStyle);
				y += lineHeight;
			}
		}
		
		if (readyCountdownExpiration > -1)
		{
			var secondsLeft : int = (readyCountdownExpiration - Time.time);
			GUI.color = Color(1,1,1,1);
			GUI.Label(Rect(0,h - 45,w,40),"Game starts in " + secondsLeft.ToString() + " seconds", playerListHeaderStyle);
		}
		
	GUI.EndGroup();
}

private function RenderInstructions()
{
	if (switchViewsTextFade > 0) {
		GUI.color = Color(1,1,1,switchViewsTextFade);
		GUI.Label(Rect(0,10,Screen.width,40), "Press and hold F1 for help", headerTextStyle);
		switchViewsTextFade -= Time.deltaTime * 0.01;
		if (switchViewsTextFade < 0.95) {
			switchViewsTextFade -= Time.deltaTime * 0.25;
		}
	}
}

private function RenderChatWindow()
{
	// This needs to be above all the other GUI's
	var oldSkin : GUISkin = GUI.skin;
	GUI.skin = null;
	GUI.depth = -1;
	GUI.color = Color(1,1,1,1);
	
	// Listen for and handle special characters
	if (Event.current.type == EventType.KeyDown)
	{
		if (Event.current.keyCode == KeyCode.KeypadEnter || Event.current.keyCode == KeyCode.Return)
		{
			var chat : String = chatText;
			// Reset the command text
			chatText = "";
			// Now broadcast the chat message
			inputDirector.BroadcastCommand("OnGameChatMessage", player.GetSelfID(), chat);
			// And close the chat window
			SetChatWindowVisible(false);
		}
		else if (Event.current.keyCode == KeyCode.BackQuote || Event.current.keyCode == KeyCode.Escape) // Tilde (~)
		{
			chatText = "";
			SetChatWindowVisible(false);
		}
	}
			
	// Render the chat box
	if (isChatWindowVisible) {
		var h : float = 22;
		GUI.Label(Rect(2,Screen.height-h,Screen.width,h), "Say to all");
		GUI.SetNextControlName("GameChatText");
		chatText = GUI.TextField(Rect(70,Screen.height-h,Screen.width,h), chatText);
		if (!hasGivenChatWindowDefaultFocus) {
			GUI.FocusControl("GameChatText");
			hasGivenChatWindowDefaultFocus = true;
		}
	}
	GUI.skin = null;
}

private function RenderMenuWindow(sx : float, sy : float)
{
	// Render the options window instead of this main window if it's open
	if (isOptionsMenuWindowVisible)
	{
		if (optionsView.RenderUI(sx,sy))
		{
			isOptionsMenuWindowVisible = false;
			// Tell the cycles to update their configurations
			var cycles : GameObject[] = GameObject.FindGameObjectsWithTag("Cycle");
			for (var cycle : GameObject in cycles)
			{
				cycle.SendMessage("OnConfigurationUpdated");
			}
		}
	}
	else
	{
		// Render the menu window if it's visible
		var w : float = sx * 0.6;
		var h : float = sy * 0.8;
		
		GUI.BeginGroup(Rect(sx*0.2,sy*0.1,w,h));
			GUI.color = Color(1,1,1,1);
			GUI.Box(Rect(0,0,w,h),"");
			GUI.Box(Rect(0,0,w,h),"");
			GUI.Box(Rect(0,0,w,h),"");
			
			// Render the Cycles3D logo
			var c : Color;
			for (var i=0; i < 5; i++) {
				GUI.color = Color.Lerp( cycles3DBackColor, Color(1,1,1,1), i * 0.2 );
				GUI.Label(Rect(-i,20-i,w,100), "Cycles3D", cycles3DTextLayout);
			}
			
			if (!inputDirector.IsNetworking()) 
			{
				h = h * 0.85;
			}
			
			// Show the resume button
			var y : int = h * 0.25;
			if (GUI.Button(Rect(w*0.5 - sx * 0.25 * 0.5, y, sx * 0.25, sy * 0.14), "Resume"))
			{
				isMenuWindowVisible = false;
			}
			y += h * 0.22;
			
			// Show the skip round button
			if (!inputDirector.IsNetworking()) 
			{
				if (GUI.Button(Rect(w*0.5 - sx * 0.25 * 0.5, y, sx * 0.25, sy * 0.14), "Skip Round"))
				{
					// TODO: We should really have the Game Rules component provide this option, and 
					// have it properly skip the round.
					inputDirector.LoadScene("Game");
				}
				y += h * 0.22;
			}
		
			// Show the options button
			if (GUI.Button(Rect(w*0.5 - sx * 0.25 * 0.5, y, sx * 0.25, sy * 0.14), "Options"))
			{
				isOptionsMenuWindowVisible = true;
			}
			y += h * 0.22;
		
			// Show the quit button
			if (GUI.Button(Rect(w*0.5 - sx * 0.25 * 0.5, y, sx * 0.25, sy * 0.14), "Quit"))
			{
				// Send the shutdown message if we're quitting
				SendMessage("OnShutdown");
			}
			y += h * 0.22;
		
		GUI.EndGroup();
	}
}

// Shows the help window when someone presses F1
private function RenderHelpWindow()
{
	var sx : float = Screen.width;
	var sy : float = Screen.height;
	var w : float = sx * 0.8;
	var h : float = sy * 0.7;
	GUI.BeginGroup(Rect(sx*0.1,sy*0.1,w,h));
		GUI.color = Color(1,1,1,1);
		GUI.Box(Rect(0,0,w,h),"");
		GUI.Box(Rect(0,0,w,h),"");
		GUI.Box(Rect(0,0,w,h),"");
		
		GUI.Label(Rect(0,0,w,40), "Game Commands", playerListHeaderStyle);
		
		GUILayout.BeginArea(Rect(20,80,w-40,h-80));
			GUILayout.Label("W - Accelerate");
			GUILayout.Label("A - Turn left");
			GUILayout.Label("S - Turn right");
			GUILayout.Label("D - Slow down");
			GUILayout.Label("");
			GUILayout.Label("F1 - Help");
			GUILayout.Label("F5 - Change Views");
			GUILayout.Label("Esc - Menu");
			GUILayout.Label("Tab - Scoreboard / player list");
			GUILayout.Label("T - Network game chat");
			GUILayout.Label("");
			GUILayout.Label("Mouse Buttons - Toggle views when dead");
		GUILayout.EndArea();
	
	GUI.EndGroup();
}

private var lastFloorTime : int = 0;
private function RenderCountdownTimer()
{
	if (tCountdownExpires > 0) {
		var floorTime : int = Mathf.Floor(tCountdownExpires);
		if (lastFloorTime != floorTime) {
			SFXDirector.Play(Resources.Load("Sounds/" + (floorTime + 1).ToString()), 0.75);
			lastFloorTime = floorTime;
		}
		var subTime : float = tCountdownExpires - floorTime;
		lastSubTime = subTime;
		for (var i=0; i < 5; i++) {
			GUI.color = Color.Lerp( cycles3DBackColor, Color(1,1,1,1), i * 0.2 );
			GUI.color.a = subTime;
			GUI.Label(Rect(-i,80-i,Screen.width,100), (floorTime+1).ToString(), countdownStyle);
		}		
	}	
}

// This is called when the ready status of any player changes for any reason
private function UpdateWaitingForPlayersStatus()
{
	var playersReady : int = 0;
	var playersNotReady : int = 0;
	var playerCount : int = player.GetPlayerCount();
	var totalWaitingPlayers : int = 0;
	for (var i=0; i < playerCount; i++) {
		var p : PlayerListElement = player.GetPlayerInfoByIndex(i);
		if (!p.isSpectator) 
		{
			if (isPlayerReadyList[i]) {
				playersReady++;
			} else {
				playersNotReady++;
			}
			totalWaitingPlayers++;
		}	
	}
	
	// If everyone is ready, tell the server we want to begin the game
	// DEVELOPER NOTE: This is one place where a client has control over when the game
	// starts. Some refactoring to somehow keep this power in the server's hands, even
	// if it's dedicated, would be nice.
	if (totalWaitingPlayers > 1)
	{
		if (playersReady == totalWaitingPlayers) {
			StartGameFromWaitingScreen();
		}	
		else if (0 == playersReady) {
			// If nobody is ready, cancel the countdown
			readyCountdownExpiration = -1;
		}
		else if (-1 == readyCountdownExpiration) {
			// If at least one person is ready, and the countdown isn't running,
			// start it.
			readyCountdownExpiration = Time.time + 60.0;	
		}
	}
	else
	{
		readyCountdownExpiration = -1;
	}
}

// This function is called on a server or a client when the conditions are right
// to begin a game starting from the wait screen
private function StartGameFromWaitingScreen()
{
	if (!inputDirector.IsHosting()) {
		inputDirector.SendCommandToServer("OnAllPlayersReadyInWaitingArea");
	} else {
		// We can't do anything if we're hosting. If we call Network.LoadLevel
		// from here, then we can still get a OnAllPlayersReadyInWaitingArea
		// right after that, and then the game will reset twice in a row.
	}
}

// This message is sent from the Player component after a new player has registered
function OnNewPlayerRegistered(ID : String)
{
	// Reset all the ready flags when a new player joins
	for (var i=0; i < ConfigurationDirector.GetAbsoluteMaxPlayerCount(); i++) {
		isPlayerReadyList[i] = false;
	}
	UpdateWaitingForPlayersStatus();
}

// This message is sent from the Player component after a player left the game
function OnPlayerUnregistered(ID : String)
{
	// Reset all the ready flags when a player leaves
	for (var i=0; i < ConfigurationDirector.GetAbsoluteMaxPlayerCount(); i++) {
		isPlayerReadyList[i] = false;
	}
	UpdateWaitingForPlayersStatus();
}

// This message is sent from the Player component when a player has checked
// their Ready box
function OnRemotePlayerReady(ID : String)
{
	// Update the checkbox on our UI
	var playerCount : int = player.GetPlayerCount();
	for (var i=0; i < playerCount; i++) {
		var p : PlayerListElement = player.GetPlayerInfoByIndex(i);
		if (p.ID == ID) {
			isPlayerReadyList[i] = true;
			break;
		}
	}
	// Now look at how the ready list has changed and determine whether we can
	// begin the game
	UpdateWaitingForPlayersStatus();
}

// This message is sent from the Player component when a player has unchecked
// their Ready box
function OnRemotePlayerNotReady(ID : String)
{
	// Update the checkbox on our UI
	var playerCount : int = player.GetPlayerCount();
	for (var i=0; i < playerCount; i++) {
		var p : PlayerListElement = player.GetPlayerInfoByIndex(i);
		if (p.ID == ID) {
			isPlayerReadyList[i] = false;
			break;
		}
	}
	UpdateWaitingForPlayersStatus();
}

// This message is sent from a game rule plug-in to begin a countdown
function OnStartCountdown(duration : int)
{
	tCountdownExpires = duration;
}
