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

// This class stored information about a game in the master list
class GameListEntry
{
	var gameIndex : int;
	var screenRect : Rect;
}

var hslTex : Texture2D;
var gradTex : Texture2D;
var frameTex : Texture2D;
var whiteTex : Texture2D;
var arialSkin : GUISkin;
var enterPasswordStyle : GUIStyle;
var foundGameStyle : GUIStyle;
var serverIcon : Texture2D;
var lockIcon : Texture2D;
var masterServerDirector : MasterServerDirector;

// Global settings
private var playerName : String;
// Server settings
private var gameName : String;
private var gameDescription : String;
private var gamePort : String;
private var gamePassword : String;
private var gameDedicatedServer : boolean;
private var gameMaxConnections : int;
private var gamePrivate : boolean;
// Client settings
private var joinIPAddress : String;
private var joinPort : String;
private var joinPassword : String;
// Was hoping to avoid this so as to keep things as black boxed as possible, 
// but OnServerInitializationFailure and OnFailedToConnect need it
private var mainMenuDirector : MainMenuDirector;
private var gameListScrollPos : Vector2;
// The selected game
private var selectedGame : GameListEntry = new GameListEntry();
private var mouseOverGame : GameListEntry = new GameListEntry();
// The last time we released the left mouse button
private var tLastLeftClickRelease : float = -1;

function Start()
{
	// Load global configuration settings
	playerName = ConfigurationDirector.GetPlayerName();
	// Load host configuration settings
	gameName = ConfigurationDirector.GetGameName();
	gameDescription = ConfigurationDirector.GetGameDescription();
	gamePort = ConfigurationDirector.GetGamePort();
	gamePassword = ConfigurationDirector.GetGamePassword();
	gameDedicatedServer = ConfigurationDirector.GetGameDedicatedServer();
	gameMaxConnections = ConfigurationDirector.GetGameMaxConnections();
	gamePrivate = ConfigurationDirector.GetGamePrivate();
	// Load client configuration settings
	joinIPAddress = ConfigurationDirector.GetJoinIPAddress();
	joinPort = ConfigurationDirector.GetJoinPort();
	joinPassword = "";
	// Was hoping to avoid this, but OnServerInitializationFailure and OnFailedToConnect need it
	mainMenuDirector = GetComponent("MainMenuDirector");
	// Request the host list
	masterServerDirector.RequestHostList();
	// Reset the selected game
	selectedGame.gameIndex = -1;
	mouseOverGame.gameIndex = -1;
}

// Called when the server has been (or failed to) initialize after a request to host a game was
// made by the player.
function OnHostServerComplete(error : NetworkConnectionError)
{
	if (NetworkConnectionError.NoError == error) {
		// Just start the game.
		Application.LoadLevel("Game");
	} else {
		mainMenuDirector.errorDisplayText = "An error occurred. Code: " + error.ToString();
		mainMenuDirector.mainMenuMode = MainMenuMode.Error;
	}
}

// Called when we're done trying to connect to the server.
function OnConnectToServerComplete(error : NetworkConnectionError)
{
	if (NetworkConnectionError.NoError != error) {
		mainMenuDirector.errorDisplayText = "An error occurred. Code: " + error.ToString();
		mainMenuDirector.mainMenuMode = MainMenuMode.Error;
	}
}

function DoRender(director : MainMenuDirector, sx : float, sy : float)
{

	// Render all the network-related controls
	switch (director.mainMenuMode)
	{
		case MainMenuMode.NetworkLobby:
			DrawLoungeControls(director, sx,sy);
			break;
		case MainMenuMode.NetworkLobbyHosting:
			DrawHostSetupControls(director, sx,sy);
			break;
		case MainMenuMode.NetworkLobbyEnteringPassword:
			DrawEnterPasswordControls(director, sx,sy);
			break;
		case MainMenuMode.ManualConnect:
			DrawManualConnectControls(director, sx,sy);
			break;
	}
	
	// Set the menu skin to show Arial font
	var oldSkin : GUISkin = GUI.skin;
	GUI.skin = arialSkin;
	
	// Let the player configure their name
	GUI.Label(Rect(sx * 0.45, sy * 0.85, sx * 0.4, 22), "Name");
	var newName : String = GUI.TextField(Rect(sx * 0.65, sy * 0.85, sx * 0.3, 22), playerName);
	if (newName != playerName) {
		playerName = newName;
		ConfigurationDirector.SetPlayerName(newName);
	}
	
	// Let the player configure their cycle color
	GUI.Label(Rect(sx * 0.45, sy * 0.92, sx * 0.4, 22), "Cycle Color");
	GUI.DrawTexture(Rect(sx * 0.66, sy * 0.92 + 8, sx * 0.28, 7), hslTex);
	var newHue : float = GUI.HorizontalSlider(Rect(sx * 0.65, sy * 0.92 + 6, sx * 0.3, 20), director.cycleHue, 0, 1);
	if (newHue != director.cycleHue) {
		director.cycleHue = newHue;
		ConfigurationDirector.SetCycleHue(newHue);
		director.UpdateSceneColors();
	}	
	
	// Reset the skin
	GUI.skin = oldSkin;
}

private function DrawLoungeControls(director : MainMenuDirector, sx : float, sy : float)
{	
	// Reset the mouse over index
	if(Event.current.type == EventType.Repaint) {
		mouseOverGame.gameIndex = -1;
	}
	
	// Draw the game list	
	var gameListRect : Rect = Rect(0, 0, sx, sy * 0.65);
	GUI.BeginGroup(gameListRect);
		GUI.color = Color(0.3,0.3,0.3,1);
		GUI.DrawTexture(gameListRect, frameTex);
		GUI.color = Color(1,1,1,1);
		GUILayout.BeginArea(Rect(sx*0.06,sy*0.08,gameListRect.width*0.9,gameListRect.height*0.84));
		
			// Define field widths
			var nameLen : float = sx*0.25;
			var commentLen : float = sx*0.4;
			var playerCountLen : float = sx*0.1;
			var pingLen : float = sx*0.05;
		
			// Show the headers		
			GUI.color = Color(0.8,0.8,0.8,1);	
			GUILayout.BeginHorizontal();
				GUILayout.Space(50);
				GUILayout.Label("Name", foundGameStyle, GUILayout.Height(16), GUILayout.Width(nameLen));
				GUILayout.Label("Description", foundGameStyle, GUILayout.Height(16), GUILayout.Width(commentLen));
				GUILayout.Label("Players", foundGameStyle, GUILayout.Height(16), GUILayout.Width(playerCountLen));
				GUILayout.Label("Ping", foundGameStyle, GUILayout.Height(16), GUILayout.Width(pingLen));
			GUILayout.EndHorizontal();
			GUILayout.Space(15);
			GUI.color = Color(1,1,1,1);
		
			gameListScrollPos = GUILayout.BeginScrollView(gameListScrollPos);
				var gameCount : int = masterServerDirector.GetGameCount();
				for (var i=0; i < gameCount; i++)
				{
					var foundGame : FoundGame = masterServerDirector.GetGameByIndex(i);
					var hostData : HostData = foundGame.host;
					var hostPing : Ping = foundGame.ping;
					var connectedPlayers : int = hostData.connectedPlayers;
					var playerLimit : int = hostData.playerLimit;
					
					// If this game is a dedicated server, we must decrement the player count and limit
					// so as to not count the host.
					if (MasterServerDirector.IsDedicatedServerByComment(hostData.comment))
					{
						connectedPlayers--;
						playerLimit--;
					}
					
					GUILayout.BeginHorizontal();
					
						// Show the dedicated server icon						
						if (foundGame.isDedicated) {
							GUILayout.Box(serverIcon, foundGameStyle, GUILayout.Height(16), GUILayout.Width(16));
						} else {
							GUILayout.Box("", foundGameStyle, GUILayout.Height(16), GUILayout.Width(16));
						}
						GUILayout.Space(6);
						
						// Show the password protection icon
						if (hostData.passwordProtected) {
							GUILayout.Box(lockIcon, foundGameStyle, GUILayout.Height(16), GUILayout.Width(16));
						} else {
							GUILayout.Box("", foundGameStyle, GUILayout.Height(16), GUILayout.Width(16));
						}
						GUILayout.Space(12);
						
						// Show the other fields
						GUILayout.Label(hostData.gameName, foundGameStyle, GUILayout.Width(sx*0.25));
						if(Event.current.type == EventType.Repaint)
						{
							// See if this is the row the mouse is hovering over. If so, update mouseOverGame
							var curRect : Rect = GUILayoutUtility.GetLastRect();
							curRect.xMin = 0;
							curRect.xMax = gameListRect.width*0.9;
						    if (curRect.Contains(Event.current.mousePosition)) 
						    {
						        mouseOverGame.gameIndex = i;
						        mouseOverGame.screenRect = Rect(
						        	sx * 0.08, sy * 0.08 + 31.0 + curRect.y,
						        	gameListRect.width*0.85, curRect.height);
						    }
						}
						GUILayout.Label(MasterServerDirector.UnformatGameComment(hostData.comment), foundGameStyle, GUILayout.Width(commentLen));
						GUILayout.Label(foundGame.playerCount.ToString() + "/" + foundGame.maxPlayerCount.ToString(), foundGameStyle, GUILayout.Width(playerCountLen));
						GUILayout.Label( (hostPing.isDone) ? hostPing.time.ToString() : "...", foundGameStyle, GUILayout.Width(pingLen));
						
					GUILayout.EndHorizontal();
				}
			GUILayout.EndScrollView();		
		GUILayout.EndArea();
	GUI.EndGroup();	
	
	// Select the current mouse over row if the left mouse button is down
	if (Input.GetMouseButtonDown(0) && -1 != mouseOverGame.gameIndex) 
	{
		if (tLastLeftClickRelease > -1 && 
			selectedGame.gameIndex > -1 &&
			Time.time - tLastLeftClickRelease < 0.3) 
		{
			JoinSelectedGame(director);
		} 
		else 
		{
			selectedGame.gameIndex = mouseOverGame.gameIndex;
			selectedGame.screenRect = mouseOverGame.screenRect;
		}
	}
	if (Input.GetMouseButtonUp(0))
	{
		tLastLeftClickRelease = Time.time;
	}
	
	// Render the game selection
	if (selectedGame.gameIndex > -1) 
	{
		GUI.color = Color(0.5,0.5,0,0.5);
		GUI.DrawTexture(selectedGame.screenRect, whiteTex);
		GUI.color = Color(1,1,1,1);
	}
	
	// Draw the buttons	
	var x : float = sx * 0.02;
	var dx : float = sx * 0.2;
	if (GUI.Button(Rect(x, sy * 0.65, sx * 0.18, sy * 0.1), "Refresh"))
	{
		selectedGame.gameIndex = -1;
		masterServerDirector.RequestHostList();
		return;
	}
	x += dx;

	GUI.color = Color(1,1,1,(selectedGame.gameIndex == -1) ? 0.25 : 1);
	if (GUI.Button(Rect(x, sy * 0.65, sx * 0.18, sy * 0.1), "Join"))
	{
		if (selectedGame.gameIndex > -1) 
		{
			JoinSelectedGame(director);
		}
		return;
	}
	GUI.color = Color(1,1,1,1);
	x += dx;

	if (GUI.Button(Rect(x, sy * 0.65, sx * 0.18, sy * 0.1), "Host"))
	{
		director.mainMenuMode = MainMenuMode.NetworkLobbyHosting;
		return;
	}
	x += dx;
	
	if (GUI.Button(Rect(x, sy * 0.65, sx * 0.18, sy * 0.1), "Manual"))
	{
		director.mainMenuMode = MainMenuMode.ManualConnect;
		return;
	}
	x += dx;
	
	if (GUI.Button(Rect(x, sy * 0.65, sx * 0.15, sy * 0.1), "Back"))
	{
		director.mainMenuMode = MainMenuMode.Main;
		director.TransitionCamera(director.mainCameraXForm, 100.0);
		return;
	}
	x += dx;
}

private function DrawHostSetupControls(director : MainMenuDirector, sx : float, sy : float)
{
	// Change the GUI skin for the static text for configuration options
	var oldSkin : GUISkin = GUI.skin;
	GUI.skin = arialSkin;

	var y : float = sy * 0.05;
	var dy : float = sy * 0.06;
	
	// Now render key fields 
	GUI.Label(Rect(sx * 0.1, y, sx * 0.4, 22), "Game Name");
	var newGameName : String = GUI.TextField(Rect(sx * 0.4, y, sx * 0.5, 22), gameName);
	if (newGameName != gameName) {
		gameName = newGameName;
		ConfigurationDirector.SetGameName(newGameName);
	}
	y += dy;
	
	GUI.Label(Rect(sx * 0.1, y, sx * 0.4, 22), "Game Description");
	var newGameDescription : String = GUI.TextField(Rect(sx * 0.4, y, sx * 0.5, 22), gameDescription);
	if (newGameDescription != gameDescription) {
		gameDescription = newGameDescription;
		ConfigurationDirector.SetGameDescription(newGameDescription);
	}
	y += dy;
	
	GUI.Label(Rect(sx * 0.1, y, sx * 0.4, 22), "Max Players");
	GUI.Label(Rect(sx * 0.4, y, sx * 0.05, 22), gameMaxConnections.ToString());
	GUI.DrawTexture(Rect(sx * 0.45 + 1, y + 8, sx * 0.45 - 2, 7), gradTex);
	var newMaxConnections : float = GUI.HorizontalSlider(Rect(sx * 0.45, y + 6, sx * 0.45, 22), gameMaxConnections, 2, ConfigurationDirector.GetAbsoluteMaxPlayerCount());
	if (newMaxConnections != gameMaxConnections) {
		gameMaxConnections = newMaxConnections;
		ConfigurationDirector.SetGameMaxConnections(newMaxConnections);
	}	
	y += dy;
		
	GUI.Label(Rect(sx * 0.1, y, sx * 0.4, 22), "Listen Port");
	var newPort : String = GUI.TextField(Rect(sx * 0.4, y, sx * 0.5, 22), gamePort);
	if (newPort != gamePort) {
		gamePort = newPort;
		ConfigurationDirector.SetGamePort(newPort);
	}
	y += dy;
	
	GUI.Label(Rect(sx * 0.1, y, sx * 0.4, 22), "Password");	
	var newPassword : String = GUI.TextField(Rect(sx * 0.4, y, sx * 0.5, 22), gamePassword);
	if (newPassword != gamePassword) {
		gamePassword = newPassword;
		ConfigurationDirector.SetGamePassword(newPassword);
	}
	y += dy;
	
	GUI.Label(Rect(sx * 0.1, y, sx * 0.4, 22), "Dedicated Server");
	var newDedicatedServer : boolean = GUI.Toggle(Rect(sx * 0.4, y, 22, 22), gameDedicatedServer, "");
	if (newDedicatedServer != gameDedicatedServer) {
		gameDedicatedServer = newDedicatedServer;
		ConfigurationDirector.SetGameDedicatedServer(newDedicatedServer);
	}
	y += dy;

	GUI.Label(Rect(sx * 0.1, y, sx * 0.4, 22), "Private");
	var newPrivate : boolean = GUI.Toggle(Rect(sx * 0.4, y, 22, 22), gamePrivate, "");
	if (newPrivate != gamePrivate) {
		gamePrivate = newPrivate;
		ConfigurationDirector.SetGamePrivate(newPrivate);
	}
	y += dy;

	GUI.Label(Rect(sx * 0.1, y, sx * 0.4, 22), "Your IP");
	GUI.Label(Rect(sx * 0.4, y, sx * 0.4, 22), Network.player.ipAddress);
	y += dy;

	// Restore the original skin for the buttons
	GUI.skin = oldSkin;	
	
	// Start button
	if (GUI.Button(Rect(sx * 0.2, sy * 0.6, sx * 0.25, sy * 0.16), "Start"))
	{
		director.mainMenuMode = MainMenuMode.StartingHost;
		var inputDirector : InputDirector = InputDirector.Get();
		var connections : int = (gameDedicatedServer) ? gameMaxConnections : (gameMaxConnections - 1);
		inputDirector.HostServer(connections, parseInt(gamePort), gameDedicatedServer, gamePassword,
			gamePrivate, VersionDirector.GetGameTypeName(), gameName, gameDescription);
		return;
	}
	
	// Back button
	if (GUI.Button(Rect(sx * 0.6, sy * 0.6, sx * 0.25, sy * 0.16), "Back"))
	{
		director.mainMenuMode = MainMenuMode.NetworkLobby;
		return;
	}
}

private function DrawEnterPasswordControls(director : MainMenuDirector, sx : float, sy : float)
{
	// Now render key fields 
	var oldSkin : GUISkin = GUI.skin;
	GUI.skin = arialSkin;
	GUI.Label(Rect(0, sy * 0.2, sx, 64), "Enter Password", enterPasswordStyle);
	joinPassword = GUI.TextField(Rect(sx * 0.2, sy * 0.35, sx * 0.6, 22), joinPassword);
	GUI.skin = oldSkin;

	// Start button
	if (GUI.Button(Rect(sx * 0.2, sy * 0.5, sx * 0.25, sy * 0.16), "Start"))
	{
		var foundGame : FoundGame = masterServerDirector.GetGameByIndex(selectedGame.gameIndex);
		JoinGame(director, foundGame.ipAddress, foundGame.host.port, joinPassword);
		return;
	}
	
	// Back button
	if (GUI.Button(Rect(sx * 0.55, sy * 0.5, sx * 0.25, sy * 0.16), "Back"))
	{
		director.mainMenuMode = MainMenuMode.NetworkLobby;
		return;
	}
}

private function DrawManualConnectControls(director : MainMenuDirector, sx : float, sy : float)
{
	// Change the GUI skin for the static text for configuration options
	var oldSkin : GUISkin = GUI.skin;
	GUI.skin = arialSkin;
	
	var dy : float = sy * 0.1;
	var y : float = sy * 0.1;
	
	// Render the host address
	GUI.Label(Rect(sx * 0.1, y, sx * 0.4, 22), "Host Address");
	var newJoinIPAddress : String = GUI.TextField(Rect(sx * 0.5, y, sx * 0.3, 22), joinIPAddress);
	if (newJoinIPAddress != gameName) {
		joinIPAddress = newJoinIPAddress;
		ConfigurationDirector.SetJoinIPAddress(newJoinIPAddress);
	}
	y += dy;
	
	// Render the host port
	GUI.Label(Rect(sx * 0.1, y, sx * 0.4, 22), "Host Port");
	var newJoinPort : String = GUI.TextField(Rect(sx * 0.5, y, sx * 0.3, 22), joinPort);
	if (newJoinPort != gameName) {
		joinPort = newJoinPort;
		ConfigurationDirector.SetJoinPort(newJoinPort);
	}	
	y += dy;
	
	// Render the host password
	GUI.Label(Rect(sx * 0.1, y, sx * 0.4, 22), "Host Password");
	var newJoinPassword : String = GUI.TextField(Rect(sx * 0.5, y, sx * 0.3, 22), joinPassword);
	if (newJoinPassword != joinPassword) {
		joinPassword = newJoinPassword;
		ConfigurationDirector.SetJoinPassword(newJoinPassword);
	}	
	y += dy;
	

	// Restore the original skin for the buttons
	GUI.skin = oldSkin;

	// Join button
	if (GUI.Button(Rect(sx * 0.2, sy * 0.55, sx * 0.25, sy * 0.16), "Join"))
	{
		JoinGame(director, joinIPAddress, parseInt(joinPort), joinPassword);
		return;
	}

	// Back button
	if (GUI.Button(Rect(sx * 0.6, sy * 0.55, sx * 0.25, sy * 0.16), "Back"))
	{
		director.mainMenuMode = MainMenuMode.NetworkLobby;
		return;
	}
	
}

// This function is called when the user requests to join the selected game from
// the master list
private function JoinSelectedGame(director : MainMenuDirector)
{
	var foundGame : FoundGame = masterServerDirector.GetGameByIndex(selectedGame.gameIndex);
	if (foundGame.host.passwordProtected)
	{
		// Show a password prompt before going into the game
		joinPassword = "";
		director.mainMenuMode = MainMenuMode.NetworkLobbyEnteringPassword;
	}
	else 
	{
		JoinGame(director, foundGame.ipAddress, foundGame.host.port, "");
	}	
}

// This is the raw function to call when intending to join a game
private function JoinGame(director : MainMenuDirector, IP : String, port : int, password : String)
{	
	var inputDirector : InputDirector = InputDirector.Get();
	director.mainMenuMode = MainMenuMode.ConnectingToServer;
	inputDirector.ConnectToServer(IP, port, password, Player.GetSelf().gameObject);
}