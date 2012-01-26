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

class PlayerListElement
{
	var ID : String; // This is the player's network view ID from the server's perspective
	var playerName : String;
	var cycleHue : float;
	var cycleColor : Color; // This is a calculated value
	var isSpectator : boolean; // True if the player is a spectator and should not be counted
	var score : Object; // The player's score. We don't care what it is; we just want to ensure
						// it is preserved and identical for all clients.
}

// The input director
private var inputDirector : InputDirector;
// The console director
private var consoleDirector : ConsoleDirector;
// The list of players in the game
private var playerList : Array = new Array();
// Our own player ID
private var selfID : String;
// Our cycle
private var selfCycle : GameObject;
// Our cycle wall trail network group ID
private var cycleGroupID : int = -1;
// The explosion sound
private var sndExplosion : AudioClip;

// Returns the one and only "self" player. This is needed to expose game-specific
// information to the input director when registering with a server.
//
// Though the InputDirector game object and component are oblivious to it, this component
// is actually attached to the InputDirector game object.

static function GetSelf() : Player
{
	var o : GameObject = InputDirector.Get().gameObject;
	var s : Player = o.GetComponent("Player");
	if (null == s) {
		s = o.AddComponent("Player");
	}
	return s;
}

function Awake()
{
	inputDirector = InputDirector.Get();	
	consoleDirector = ConsoleDirector.Get();
	sndExplosion = Resources.Load("Sounds/Thunder Explosion Fx");
	// Log the version of the game in the console
	consoleDirector.Log("Cycles3D Version " + VersionDirector.GetVersion() + " now running.");	
	// Now log the console commands
	LogAllCommands();
}

function GetSelfID() : String
{
	return selfID;
}

function GetSelfCycle() : GameObject
{
	return selfCycle;
}

function GetCycleGroupID() : int
{
	return cycleGroupID;
}

function GetPlayerCount() : int
{
	return playerList.length;
}

function GetPlayerInfoByIndex(index : int) : PlayerListElement
{
	return playerList[index];
}

function SetPlayerInfoByIndex(index : int, value : PlayerListElement)
{
	playerList[index] = value;
}

function ClearPlayerList()
{
	playerList = new Array();
}

// Returns true if you, the player, are spectating (not playing the game). When your
// cycle is destroyed, that does not count as spectating as this component defnes it;
// it just means you're waiting to be in the next round.
function IsSelfSpectating() : boolean
{
	for (var i=0; i < playerList.length; i++) {
		var e : PlayerListElement = playerList[i];
		if (e.ID == selfID) {
			return e.isSpectator;
		}
	}
	return false;
}

// Called when the server has been initialized after a request to host a game was
// made by the player.
function OnHostServerComplete(error : NetworkConnectionError)
{
	// This should only happen from the main menu. Send the message to the main menu director.
	GameObject.Find("MainMenuDirector").SendMessage("OnHostServerComplete", error);
	
	// Now handle player stuff
	if (NetworkConnectionError.NoError == error) {
		// Clear the player list
		playerList = new Array();
		selfID = "";
		selfCycle = null;
		// Register with ourselves
		Server.Get().Register();
	}
}

// Called after an attempt to connect to a game server.
function OnConnectToServerComplete(error : NetworkConnectionError)
{
	// This should only happen from the main menu. Send the message to the main menu director.
	GameObject.Find("MainMenuDirector").SendMessage("OnConnectToServerComplete", error);
	
	// Now handle player stuff
	if (NetworkConnectionError.NoError == error) {
		// Clear the player list
		playerList = new Array();
		selfID = "";
		selfCycle = null;
		// Register with the server
		Server.Get().Register();
	}
}

// Called on a server when a player disconnects from the server
function OnPlayerDisconnectedFromServer(player : NetworkPlayer)
{
	// Unregister the player with the server
	Server.Get().Unregister(player);
}

// Called on a client when the client is disconnected form the server
function OnDisconnectionFromServer(disconnectionMode : NetworkDisconnection)
{
	// Load the scene that shows the player why they can't connect
	ConnectionFailureSceneDirector.Initialize("Lost connection to server");
}

// Called after the player types something into the console
function OnConsoleUserCommand(cmd : String)
{
	var c : Color = consoleDirector.GetConsoleDefaultLogColor();
	if (IsCommand(cmd, "help") || IsCommand(cmd, "?")) {
		// Show all the console commands
		LogAllCommands();	
	}
	else if (IsCommand(cmd, "players"))
	{
		// List all the players
		ConsoleDirector.Log("Player List", c);
		for (var i=0; i < playerList.length; i++) {
			var e : PlayerListElement = playerList[i];
			var s : String = e.ID + " " + e.playerName;
			if (e.isSpectator) {
				s += " (spectator)";
			}
			ConsoleDirector.Log(s, e.cycleColor);
		}
	}
	else if (IsCommand(cmd, "restart") && inputDirector.IsHosting() &&
		inputDirector.IsNetworking() && "Game" == Application.loadedLevelName)
	{
		// Restart the current level. This does not do any formalities or score tabulating;
		// it's a straight restart.
		inputDirector.LoadScene("Game");
		ConsoleDirector.Log("Game restarted", c);
	}
	else if (IsCommand(cmd, "kick") && inputDirector.IsHosting() &&
		inputDirector.IsNetworking() && "Game" == Application.loadedLevelName)
	{	
		Server.Get().Kick(GetCommandData(cmd), false);
	}
	else if (IsCommand(cmd, "ban") && inputDirector.IsHosting() &&
		inputDirector.IsNetworking() && "Game" == Application.loadedLevelName)
	{	
		Server.Get().Kick(GetCommandData(cmd), true);
	}
	else if (IsCommand(cmd, "shutdown") && inputDirector.IsNetworking())
	{
		GameDirector.Get().SendMessage("OnShutdown");
	}
}

// Returns true if the console command is the expected value
private function IsCommand(cmd : String, expected : String) : boolean
{
	if (cmd.Length >= expected.Length) {
		if (cmd.Substring(0,expected.Length).ToLower() == expected.ToLower()) {
			return true;
		}
	}
	return false;
}

// Returns the data payload of a console command
private function GetCommandData(cmd : String) : String
{
	var firstWhiteSpace : int = cmd.IndexOf(' ');
	if (firstWhiteSpace < 0) { return ""; }
	else return cmd.Substring(firstWhiteSpace + 1);
}

// Logs all supported console commands
private function LogAllCommands()
{
	var c : Color = consoleDirector.GetConsoleDefaultLogColor();
	consoleDirector.Log("Global Commands", c);
	consoleDirector.Log("================", c);
	consoleDirector.Log("help or ? - Reports the command list", c);
	consoleDirector.Log("players - Reports the list of players", c);
	consoleDirector.Log("say - Broadcast a chat message", c);
	consoleDirector.Log("restart - Restarts a game (server only)", c);
	consoleDirector.Log("kick # - Kicks a player by ID (server only)", c);
	consoleDirector.Log("ban # - Kicks and bans by ID until you exit the program", c);	
	consoleDirector.Log("shutdown - Disconnects from, or unhosts a server", c);
}

// This message is sent from a server to a client if there is a version mismatch
@RPC
function OnServerRegistrationFailed(reason : String)
{
	// Disconnect
	inputDirector.DisconnectFromServer();
	// Now load the scene that shows the player why they can't connect
	ConnectionFailureSceneDirector.Initialize("Registration failed: " + reason);
}

// This message is sent from a server to either itself or a client after they've registered 
// with the server. This is not a buffered call, and it's a one-time call per game instance.
@RPC
function OnRegisteredWithServer(newID : String, newCycleGroupID : int, isSpectator : boolean)
{
	Debug.Log("OnRegisteredWithServer called. New player ID is " + newID);
	
	// Assign our new IDs
	selfID = newID;
	cycleGroupID = newCycleGroupID;
	
	// Now notify all players that we have successfully registered so that they know we exist.
	networkView.RPC("OnNewPlayerRegistered", RPCMode.AllBuffered,
		newID, ConfigurationDirector.GetPlayerName(), ConfigurationDirector.GetCycleHue(), isSpectator);
	
	// If this is the host, then we must enter the game now.
	if (inputDirector.IsHosting()) {
		inputDirector.LoadScene("Game");
	}
}

// This message is sent from a client or server to everyone to make their presence known to
// all in the game. This is a buffered call so that incoming players can seamlessly get the
// player list.
@RPC
function OnNewPlayerRegistered(ID : String, playerName : String, cycleHue : float, isSpectator : boolean)
{
	Debug.Log("OnNewPlayerRegistered called. Adding " + playerName + " to the list");

	// Add the player to our list
	AddPlayer(ID, playerName, cycleHue, isSpectator);
	
	// Log the connection
	ConsoleDirector.Log(playerName + " has joined the game.", ColorDirector.H2RGB(cycleHue));
	
	// Tell the game director that a player joined
	var gameDirector : GameDirector = GameDirector.Get();
	if (null != gameDirector) {
		gameDirector.SendMessage("OnNewPlayerRegistered", ID);
	}
}

// This will add a player to the player list. This should ONLY be called by the RPC function
// OnNewPlayerRegistered and by the GameDirector in a local game.
function AddPlayer(ID : String, playerName : String, cycleHue : float, isSpectator : boolean)
{
	var e : PlayerListElement = new PlayerListElement();
	e.ID = ID;
	e.playerName = playerName;
	e.cycleHue = cycleHue;
	e.cycleColor = ColorDirector.H2RGB(e.cycleHue);
	e.isSpectator = isSpectator;
	playerList.Add(e);
}

// This message is sent from the server to everyone to make it known that a player has left
// the game.
@RPC
function OnPlayerUnregistered(ID : String)
{
	// Remove the player from the list
	for (var i=0; i < playerList.length; i++) {
		var e : PlayerListElement = playerList[i];
		if (ID == e.ID) {
			ConsoleDirector.Log(e.playerName + " has left the game.", e.cycleColor);
			playerList.RemoveAt(i);
			break;
		}
	}
	
	// Tell the game director that a player left
	var gameDirector : GameDirector = GameDirector.Get();
	if (null != gameDirector) {
		gameDirector.SendMessage("OnPlayerUnregistered", ID);
	}	
}

////////////////////////////////////////////////////////////////
// In-game actions
////////////////////////////////////////////////////////////////

@RPC
function OnSpawnCycle(pos : Vector3)
{
	// Create the cycle and assign its name and color
	selfCycle = inputDirector.InstantiateObject(
		Resources.Load("Prefabs/HumanPlayer"), pos,	Quaternion.identity, cycleGroupID);
	selfCycle.networkView.RPC("OnSetCycleAttributes", RPCMode.AllBuffered,
		selfID,
		ConfigurationDirector.GetPlayerName(), 
		ConfigurationDirector.GetCycleHue());
		
	// Now attach our camera and controls to it. Note we only get the game director
	// now rather than in Awake, because in Awake we're in the main menu.
	var gameDirector : GameDirector = GameDirector.Get();
	gameDirector.playerCamera.SetCycle(selfCycle.transform);
	gameDirector.playerControls.SetCycle(selfCycle.GetComponent("Cycle"));	
}

@RPC
function OnLoadNetworkLevel(level : String, levelPrefix : int)
{
	// http://unity3d.com/support/documentation/Components/net-NetworkLevelLoad.html
	Debug.Log("In LoadNetworkLevel");

	// There is no reason to send any more data over the network on the default channel,
	// because we are about to load the level, thus all those objects will get deleted anyway
	Network.SetSendingEnabled(0, false);	

	// We need to stop receiving because first the level must be loaded first.
	// Once the level is loaded, rpc's and other state update attached to objects in the level are allowed to fire
	Network.isMessageQueueRunning = false;
	
	// All network views loaded from a level will get a prefix into their NetworkViewID.
	// This will prevent old updates from clients leaking into a newly created scene.
	Network.SetLevelPrefix(levelPrefix);
	Application.LoadLevel(level);
	yield;
	yield;
	
	// Allow receiving data again
	Network.isMessageQueueRunning = true;
	// Now the level has been loaded and we can start sending out data to clients
	Network.SetSendingEnabled(0, true);	

	// Notify all objects that the level was loaded
	for (var o in FindObjectsOfType(GameObject))
		o.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);		
}

// Broadcast by the server to all players right after OnLoadNetworkLevel to let the players
// know whether the game is "live" or whether there aren't enough players to actually start
// the game yet
@RPC
function OnSetGameMode(newMode : int)
{
	GameDirector.Get().SendMessage("OnSetGameMode", newMode);
}

// Broadcast from a client to all players when they've changed their Ready state in the
// "Waiting for players" screen
@RPC 
function OnGameChangeReadyState(ID : String, readyValue : boolean)
{
	if (readyValue) {
		GameDirector.Get().SendMessage("OnRemotePlayerReady", ID);
	} else {
		GameDirector.Get().SendMessage("OnRemotePlayerNotReady", ID);
	}
}

// This is a buffered message sent from the server to all clients to tell them what
// kind of game is being played. This must always be the first buffered RPC to be sent 
// after a level has been loaded so that the players know the "rules" of the game.
@RPC
function OnDefineGameRules(value : int)
{
	GameDirector.Get().SendMessage("OnDefineGameRules", value);
}

// This is a non-buffered message sent from a server to all clients to launch their
// cycles when a round of play begins.
@RPC
function OnAccelerateAndUnlockCycle(speed : float)
{
	if (!IsSelfSpectating())
	{
		selfCycle.SendMessage("OnAccelerateAndUnlock", speed);
	}
}

// This is a non-buffered message that shows a cycle exploding
@RPC
function OnShowCycleExplosion(pos : Vector3, r : float, g : float, b : float, a : float)
{
	var sphere : GameObject = Instantiate(Resources.Load("Prefabs/ExplosionSphere"), pos, Quaternion.identity);
	// Change the sphere color to match the player
	sphere.renderer.material.color = Color(r,g,b,a);
	// Instantiate the explosion particles
	var particleSystem : GameObject = Instantiate(Resources.Load("Prefabs/ExplosionParticles"), pos, Quaternion.identity);
	// Change the particle colors to match the player color
	var pa : ParticleAnimator = particleSystem.GetComponent("ParticleAnimator");
	var pc : Color[] = pa.colorAnimation;
	for (var i=0; i < 5; i++) {
		pc[i].r = r;
		pc[i].g = g;
		pc[i].b = b;
	}
	pa.colorAnimation = pc;
	// Play the explosion sound
	SFXDirector.Play(sndExplosion, pos, 0.75, 0.8 + Random.value * 0.4);
}


// TODO: I'm not a fan of passing in the player ID with any chat message. I need to confirm
// whether info.sender.ToString() is the same for all players, because I don't think it is.
@RPC
function OnGameChatMessage(playerID : String, chat : String, info : NetworkMessageInfo)
{
	Debug.Log("OnGameChatMessage [" + playerID.ToString() + "]");
	for (var i=0; i < GetPlayerCount(); i++) {
		var p : PlayerListElement = GetPlayerInfoByIndex(i);
		if (p.ID == playerID)
		{
			ConsoleDirector.Log(p.playerName + ": " + chat, p.cycleColor);
			return;
		}
	}
}