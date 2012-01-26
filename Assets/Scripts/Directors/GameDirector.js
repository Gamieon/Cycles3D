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

enum GameDirectorMode { Invalid, WaitingForPlayers, Active };

var humanPlayerPrefab : GameObject;
var playerCamera : PlayerCamera;
var playerControls : PlayerControls;

// The one and only input director where all game commands go through
private var inputDirector : InputDirector;
// Ourself as a player
private var player : Player;
// The play mode for this scene. This is set in BeginGame and never changed again
// until the next round begins
private var gameMode : GameDirectorMode = GameDirectorMode.Invalid;

static function Get()
{
	var o : GameObject = GameObject.Find("GameDirector");
	if (null == o) { return null; }
	return o.GetComponent("GameDirector");
}

function GetGameMode() : GameDirectorMode
{
	return gameMode;
}

// This function is called when this session enters the game
function Start()
{
	// First off, get our input director and player. We need them for all game commmands and
	// communications.
	inputDirector = InputDirector.Get();
	player = Player.GetSelf();
	
	// Enable the console notification area on the lower left corner of the screen so that
	// we can see events as they happen without opening the console.
	ConsoleDirector.Get().SetNotificationAreaVisible(true);
	
	// If we're a dedicated server, don't render anything
	if (inputDirector.IsDedicatedServer()) {
		Camera.main.enabled = false;
		Destroy(playerCamera);
	}
	
	// Now start the game if we're playing alone
	if (!inputDirector.IsNetworking()) 
	{	
		BeginGame(ConfigurationDirector.GetGameRules());
	}
}

// This message is sent by the player object after the level has been loaded and all communications
// with the network game channels have been restored. This is code that should NOT be occurring in
// Start() because network communications would still be down at that time.
function OnNetworkLoadedLevel()
{
	// This is where you would expect all the cycles to be spawned. Well, you'd be right, but
	// the code to do that is actually in a GameRules component. To support different modes
	// of game play, all the work must be done in a component in the same object as the Game
	// Director, but not in the Game Director component.
	
	// In a network game, the server set up its instance of the rules, and starts its game here.
	// The client will wait from a buffered message from the server with the game rules enumeration.
	// Then it will start its game.
	if (inputDirector.IsHosting())
	{
		// Before we do anything, we must first see if there are enough players to actually
		// start a game.
		
		// Figure out how many actual cycles we're spawning
		var cycleCount : int = GetStartingCycleCount();
		// If there are less than two cycles, then we will be in "Waiting for players" mode
		if (cycleCount < 2)
		{
			Debug.Log("Waiting for players.");
			gameMode = GameDirectorMode.WaitingForPlayers;
			// Send out a message to all players (including self) that we're in "Waiting mode"
			inputDirector.BroadcastBufferedCommand("OnSetGameMode", GameDirectorMode.WaitingForPlayers);
		}
		else
		{
			// If there are two or more cycles, it's go time.
			Debug.Log("Game is hot.");
			var gameRules : GameRuleTypes = ConfigurationDirector.GetGameRules();
		
			// Inform the server and the clients of the game rules. It's important to do it now before 
			// any other buffered messages (like spawning AI cycles) happens, or else unpredictable things 
			// can happen.
			if (inputDirector.IsNetworking()) {
				inputDirector.BroadcastBufferedCommand("OnDefineGameRules", gameRules);
			}
		}
	}
}

// This message is sent from the Player component on clients. The originating message is a buffered
// RPC message from the server to all clients right after OnNetworkLoadedlevel for the purpose of
// informing clients what kind of game is being played.
function OnDefineGameRules(value : int)
{
	// Now begin the game on our instance
	BeginGame(value);
}

// Returns the number of cycles that will be in this round
private function GetStartingCycleCount() : int
{
	var playerCount : int = player.GetPlayerCount();
	var value : int = 0;
	for (var i=0; i < playerCount; i++) {
		var p : PlayerListElement = player.GetPlayerInfoByIndex(i);
		if (!p.isSpectating) {
			value++;
		}
	}

	// TODO: Support AI players
	
	return value;
}

// This is called directly from a solo game or one where you are hosting; and this is called on
// clients after the server tells them what the game rules are.
//
// This function will add a component to the game director which controls how the game is run.
// Without calling this, the playfield would be empty and nothing would ever happen.
private function BeginGame(value : GameRuleTypes)
{
	switch (value)
	{
	case GameRuleTypes.Deathmatch:
		gameObject.AddComponent("GameRules_DM");
		break;
	default:
		// This should never happen
		Debug.Log("Unhandled game rule type: " + value.ToString() + "!");
		break;
	}
	
	// Send a message to the rules component to begin the game. This is where the scores are
	// reset, cycles are spawned, etc.
	SendMessage("OnBeginGame");
}

// Sent from the Player component to this component when a message is received from the server
// with what the game mode is
function OnSetGameMode(newMode : int)
{
	gameMode = newMode;
}

// This message is sent to terminate a game in progress.
function OnShutdown()
{
	if (inputDirector.IsHosting()) {
		inputDirector.UnhostServer();
	} else {
		inputDirector.DisconnectFromServer();
	}
	// Return to the main menu
	Application.LoadLevel("Main");
	ConsoleDirector.Log("Game session terminated");
}

// Sent by a game rules component to launch all the cycles forward
function OnAccelerateAndUnlockCycles(speed : float)
{
	var cycles : GameObject[] = GameObject.FindGameObjectsWithTag("Cycle");
	if (!inputDirector.IsNetworking())
	{
		// If we're in a solo game, instruct every individual cycle to launch
		for (var c : GameObject in cycles)
		{
			c.SendMessage("OnAccelerateAndUnlock", speed);		
		}
	}	
	else if (inputDirector.IsHosting())
	{
		// If we're hosting a game, tell all the players, including ourselves,
		// to do this to their light cycles, and then do it to our own.
		inputDirector.BroadcastCommand("OnAccelerateAndUnlockCycle", speed);		
	}
}