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

// This is the DM game rules broadcaster component. This component is responsible for
// letting servers broadcast score updates, and managing clients when they get them.
//
// This component must be attached to the input director.
//

// The game rules script we work for. gameRules persists in the GameDirector of the
// scene, and we persist in the ever-present-never-destroyed InputDirector. If this 
// is null, that means we're not in a game or we're not being properly utilized. The
// nice thing is, when the game shuts down, this will become null.
var gameRules : GameRules_DM;

private var inputDirector : InputDirector;
private var player : Player;

function Awake()
{
	inputDirector = gameObject.GetComponent("InputDirector");
	player = Player.GetSelf();
}

// Broadcasts a score update to all players. This is only called by a server in a
// network game.
function BroadcastScore(p : PlayerListElement)
{
	if (null != gameRules) {
		inputDirector.BroadcastCommand("OnGameRules_DM_BroadcastScore", p.ID, p.score);
	} else {
		// Ignore this message because without a game rules component, we're not valid.
	}
}

// This is received by all players in response to the server broadcasting a 
// OnGameRules_DM_BroadcastScore command. The score may be an integer, but we
// have an input director function that handles floats. Close enough.
@RPC
function OnGameRules_DM_BroadcastScore(playerID : String, score : int)
{
	var playerCount : int = player.GetPlayerCount();
	for (var i=0; i < playerCount; i++)
	{
		var p : PlayerListElement = player.GetPlayerInfoByIndex(i);
		if (p.ID == playerID) {
			p.score = score;
			player.SetPlayerInfoByIndex(i, p);
			return;
		}
	}
}

function BroadcastGameOver(winnerPlayerID : String)
{
	if (null != gameRules) {
		inputDirector.BroadcastCommand("OnGameRules_DM_BroadcastGameOver", winnerPlayerID);
	} else {
		// Ignore this message because without a game rules component, we're not valid.
	}
}

@RPC
function OnGameRules_DM_BroadcastGameOver(winnerPlayerID : String)
{
	var gameDirector : GameDirector = GameDirector.Get();
	if (null != gameDirector) {
		gameDirector.SendMessage("OnGameOver", winnerPlayerID);
	} else {
		// This should never happen
	}
}
