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

// This component defines the rules for a game where players try to get other
// players to run into their wall trails. The DM stands for Deathmatch.

// Score list style
private var playerListHeaderStyle : GUIStyle;
private var playerListItemStyle : GUIStyle;
private var winnerStyle : GUIStyle;
// The one and only input director where all game commands go through
private var inputDirector : InputDirector;
// The game director
private var gameDirector : GameDirector;
// Ourself as a player
private var player : Player;
// The CPU player prefab
private var cpuPlayerPrefab : GameObject;
// True if we're rendering the player list
private var isRenderingPlayerList : boolean;
// The scores broadcaster component
private var scoreBroadcaster : GameRules_DM_ScoreBroadcaster;
// True if the game is over
private var gameOver : boolean = false;
// The game winner name
private var winningPlayerName : String;
// The game winner color
private var winningPlayerColor : Color;

function Awake()
{
	// Standard initialization for all game rules scripts
	inputDirector = InputDirector.Get();
	gameDirector = GameDirector.Get();
	player = Player.GetSelf();
	cpuPlayerPrefab = Resources.Load("Prefabs/CPUPlayer");
	playerListHeaderStyle = new GUIStyle();
	playerListHeaderStyle.font = Resources.Load("Fonts/GOODTIME 48");
	playerListHeaderStyle.normal.textColor = Color(1,1,1,1);
	playerListHeaderStyle.alignment = TextAnchor.MiddleCenter;
	playerListItemStyle = new GUIStyle();
	playerListItemStyle.font = Resources.Load("Fonts/GOODTIME 16");
	playerListItemStyle.normal.textColor = Color(1,1,1,1);
	playerListItemStyle.alignment = TextAnchor.MiddleLeft;
	winnerStyle = new GUIStyle();
	winnerStyle.font = Resources.Load("Fonts/GOODTIME 48");
	winnerStyle.normal.textColor = Color(1,1,1,1);
	winnerStyle.alignment = TextAnchor.MiddleCenter;
	// Create our broadcaster. All players must do this.
	scoreBroadcaster = inputDirector.GetComponent("GameRules_DM_ScoreBroadcaster");
	if (null == scoreBroadcaster) {
		scoreBroadcaster = inputDirector.gameObject.AddComponent("GameRules_DM_ScoreBroadcaster");
	}
	// Ensure it is aware of our presence. We need to do this after every round because
	// we only persist for a round at a time.
	scoreBroadcaster.gameRules = this;	
}

// This message is sent by the GameDirector component to begin a game. This is where
// the cycles need to spawn, dynamic obstacles get set up, etc.
function OnBeginGame() 
{
	// If we're playing offline, then we need to do single-player setup stuff here.		
	if (!inputDirector.IsNetworking()) 
	{
		var enemyCount : int = ConfigurationDirector.GetEnemyCount();
		var i : int;
		
		// Spawn our own cycle. Don't use Player.OnSpawnCycle because it does networking stuff.
		var selfCycle : GameObject = inputDirector.InstantiateObject(
			Resources.Load("Prefabs/HumanPlayer"), GetRandomSpawnLocation(), Quaternion.identity, 0);
		var c : Cycle = selfCycle.GetComponent("Cycle");
		c.OnSetCycleAttributes("0", "Player", ConfigurationDirector.GetCycleHue());
		
		// Now attach our camera and controls to it
		gameDirector.playerCamera.SetCycle(selfCycle.transform);
		gameDirector.playerControls.SetCycle(selfCycle.GetComponent("Cycle"));	
		
		// Now spawn AI players
		for (i=0; i < enemyCount; i++)
		{
			var o : GameObject = Instantiate(cpuPlayerPrefab,
				GetRandomSpawnLocation(),
				Quaternion.identity); // TODO: Random direction
				
			// Assign the cycle color
			c = o.GetComponent("Cycle");
			var e : PlayerListElement = player.GetPlayerInfoByIndex(i+1);
			c.OnSetCycleAttributes((i+1).ToString(), e.playerName, e.cycleHue);
		}
	}
	// If we're hosting a network game, then we need to decide now where all
	// the players are going to spawn and spawn them.
	else if (inputDirector.IsHosting()) 
	{
		gameMode = GameDirectorMode.Active;
		inputDirector.BroadcastBufferedCommand("OnSetGameMode", GameDirectorMode.Active);
		
		// First, spawn our own cycle. Don't test the dedicated server flag; test
		// the spectator flag because we may eventually let players, ourselves included,
		// just go idle.
		if (!player.IsSelfSpectating()) {
			player.SendMessage("OnSpawnCycle", GetRandomSpawnLocation());
		}
		
		// TODO: Spawn AI players
		
		// Now send a message to all registered non-AI players to create their own cycles.
		// This is NOT a buffered command. The act of a cycle being created from each client
		// later on, however, is itself buffered.
		if (inputDirector.IsNetworking()) {
			var playerCount : int = player.GetPlayerCount();
			var selfID : String = player.GetSelfID();
			for (i=0; i < playerCount; i++) {
				e = player.GetPlayerInfoByIndex(i);
				if (selfID != e.ID && !e.isSpectating) {
					inputDirector.SendCommand(e.ID, "OnSpawnCycle", GetRandomSpawnLocation());
				}
			}
		}			
	}
	else	
	{
		// If we get here, we're a client. We don't need to do anything. Just sit tight
		// until the server tells us in a non-buffered RPC that we can spawn our cycle
		// or until the server says we're waiting to start a game in OnSetGameMode.
	}	
	
	// Start the three "slow" second game countdown
	SendMessage("OnStartCountdown", 3);
}

private function GetRandomSpawnLocation() : Vector3
{
	// TODO: Ensure all spawning locations are unique	
	return Vector3(Random.value * 16000.0 - 8000.0, 0, Random.value * 16000.0 - 8000.0);
}

// This message is received by the GameUI when the countdown has expired at the onset of a
// new round.
function OnStartCountdownExpired()
{
	if (inputDirector.IsHosting()) 
	{
		// The GameDirector will handle this message. In a solo game, all cycles will
		// immediately accelerate to a speed of 800 and relenquish control to all players.
		// In a network game, the server will just do it to their own and send a
		// non-buffered RPC call to all players to accelerate and relenquish their controls
		// as well. It's a rather specialized function but it gets the job done in one message.
		SendMessage("OnAccelerateAndUnlockCycles", 800);
	}
}

// This message is sent from the game UI to toggle the player list visibility
function OnRenderPlayerList(enabled : boolean)
{
	isRenderingPlayerList = enabled;
}


function OnGUI()
{
	// Render the game over screen if it's a draw
	if (gameOver)
	{
		var text : String = (null != winningPlayerName) ? (winningPlayerName + "\n\nwins") : "It's a draw";
		if (null != winningPlayerName)
		{
			for (var i=0; i < 5; i++) {
				GUI.color = Color.Lerp( winningPlayerColor, Color(1,1,1,1), i * 0.2 );
				GUI.Label(Rect(-i,-i,Screen.width,Screen.height), text, winnerStyle);
			}			
		}
	}

	// Renders the player list if visible
	if (isRenderingPlayerList)
	{
		var sx : float = Screen.width;
		var sy : float = Screen.height;
		var w : float = sx * 0.8;
		var h : float = sy * 0.9;
		GUI.BeginGroup(Rect(sx*0.1,sy*0.05,w,h));
			GUI.color = Color(1,1,1,1);
			GUI.Box(Rect(0,0,w,h),"");
			GUI.Box(Rect(0,0,w,h),"");
			GUI.Box(Rect(0,0,w,h),"");
			
			GUI.Label(Rect(0,25,w,50), "Players", playerListHeaderStyle);
	
			var playerCount : int = player.GetPlayerCount();
			var lineHeight : float = h * 0.08;
			var y : float = h * 0.15;
			for (i=0; i < playerCount; i++) {
				var p : PlayerListElement = player.GetPlayerInfoByIndex(i);
				if (!p.isSpectator) 
				{
					// Set the player color
					GUI.color = p.cycleColor;
					
					// Show the player name
					GUI.Label(Rect(w*0.05, y, w,20), p.playerName, playerListItemStyle);
					
					// And the score
					GUI.Label(Rect(w*0.9, y, w,20), (null == p.score) ? "0" : p.score.ToString(), playerListItemStyle);
				}
				y += lineHeight;
			}
		GUI.EndGroup();		
	}
}

// This message is sent by CycleCollider when a cycle is crashing with a wall or another cycle.
// This is only received and processed by the game host.
function OnCycleDestroying(cycles : Cycle[])
{
	// The input has two elements: The cycle being destroyed, and the cycle that caused it (or
	// null if it was a non-cycle-or-wall-related obstruction)
	var cDoomed : Cycle = cycles[0];
	var cResp : Cycle = cycles[1];

	// Update player scores	
	var playerCount : int = player.GetPlayerCount();
	for (var i=0; i < playerCount; i++) {
		var e : PlayerListElement = player.GetPlayerInfoByIndex(i);
		
		// Reset any nulls to zero here
		if (null == e.score) {				
			e.score = 0;
		}
		
		// If this is the doomed player
		if (e.ID == cDoomed.playerID) 
		{
			// If the player killed themselves, or the environment killed them (like they ran 
			// into the playfield border), then they lose a point.
			if (cDoomed == cResp || null == cResp)
			{
				e.score = e.score - 1;
			}	
			
			// If this is a networked game and this is the host (we should always be the host
			// if we get here but just do an extra check), then we need to tell everyone about
			// the score change
			if (inputDirector.IsHosting() && inputDirector.IsNetworking()) {
				scoreBroadcaster.BroadcastScore(e);
			}
		}
		else if (null != cResp && e.ID == cResp.playerID)
		{
			// If this is the player that killed the doomed player, and 
			// they didn't kill themselves, then they get the major award
			// (Hint: it's not a lamp that looks like a leg)
			e.score = e.score + 1;		
			
			// If this is a networked game and this is the host (we should always be the host
			// if we get here but just do an extra check), then we need to tell everyone about
			// the score change
			if (inputDirector.IsHosting() && inputDirector.IsNetworking()) {
				scoreBroadcaster.BroadcastScore(e);
			}
		}
		
		// Save our changes if we made any
		player.SetPlayerInfoByIndex(i, e);
	}	
}

// This message is sent by CycleCollider after a cycle has been destroyed. This is where we
// need to detect whether the game is over.
function OnCycleDestroyed()
{
	if (!gameOver)
	{
		var cycles : GameObject[] = GameObject.FindGameObjectsWithTag("Cycle");
		if (cycles.length < 2) 
		{
			// Tell everyone the game is over
			var winner : String = null;
			if (null != cycles[0]) {
				var c : Cycle = cycles[0].GetComponent("Cycle");
				winner = c.playerID;
			}
			// We should always be hosting here, but do an extra check anyway.
			if (inputDirector.IsHosting() && inputDirector.IsNetworking()) {
				scoreBroadcaster.BroadcastGameOver(winner);
			} else {
				SendMessage("OnGameOver", winner);
			}
			
			// Start a timer to begin the next round (again we should always be hosting)
			if (inputDirector.IsHosting())
			{
				InvokeRepeating("OnBeginNextRoundTimerExpired", 5.0, 1.0);
			}
						
			// We don't need to do anything with the camera. It will seek to the next
			// living cycle by itself, or stay put if none.
		}
	}
}

// Sent by a server to itself, or if we're a client, received from the server from
// an RPC when a game is over.
function OnGameOver(winningPlayerID : String)
{
	// Set the game over flag
	gameOver = true;
	
	// Determine the name of the winner, or null if it's a draw
	if (null == winningPlayerID) {
		winningPlayerName = null;
		winningPlayerColor = Color(1,1,1,1);
	} else {
	
		var playerCount : int = player.GetPlayerCount();
		for (var i=0; i < playerCount; i++) {
			var e : PlayerListElement = player.GetPlayerInfoByIndex(i);
			if (e.ID == winningPlayerID) {
				winningPlayerName = e.playerName;
				winningPlayerColor = e.cycleColor;
				break;
			}
		}
	}
}

// This is invoked when the "next round" timer is up. We need to advance the game
// to the next round.
function OnBeginNextRoundTimerExpired()
{
	CancelInvoke("OnBeginNextRoundTimerExpired");
	// Go to the next round
	inputDirector.LoadScene("Game");
}


