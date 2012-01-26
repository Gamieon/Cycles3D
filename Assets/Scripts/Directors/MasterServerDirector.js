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

// This is a thin wrapper around the master server object for fetching
// game lists.

class FoundGame
{
	var host : HostData;
	var ipAddress : String;
	var isDedicated : boolean;
	var playerCount : int;
	var maxPlayerCount : int;
	var ping : Ping;
}

private var foundGames : Array = new Array();

// When hosting a game, we need to include special data in the comment to find things
// like whether the game is a dedicated server or not. This function, given the user
// input comment, will return the data formatted comment to give to the master server
// director.
static function FormatGameComment(comment : String, dedicatedServer : boolean) : String
{
	return (dedicatedServer ? "D" : "H") + comment;
}

// When hosting a game, we need to include special data in the comment to find things
// like whether the game is a dedicated server or not. This function, given a comment
// from a game search result from the master server director, will give us the comment
// to display to the user.
static function UnformatGameComment(comment : String) : String
{
	return comment.Substring(1,comment.length-1);
}

// Returns true if the game behing hosted is a dedicated server
static function IsDedicatedServerByComment(comment : String) : boolean
{
	return (comment.length > 0 && comment[0] == 'D') ? true : false;
}

static function IPFromStringArray(value : String[]) : String
{
	var result : String = "";
	for (var i : int = 0; i < value.Length; i++) {
        result = value[i] + " ";
	}		
	return result;
}

// Registers our game with Unity's master game server list
function RegisterHost(gameTypeName : String, gameName : String, comment : String, dedicatedServer : boolean)
{
	MasterServer.RegisterHost(gameTypeName, gameName, FormatGameComment(comment, dedicatedServer));
}

// Removes our game from Unity's master game server list
function UnregisterHost()
{
	MasterServer.UnregisterHost();
}

// Requests the master game server listing from Unity
function RequestHostList()
{
	MasterServer.ClearHostList();
	foundGames = new Array(); // Clear our known list
	MasterServer.RequestHostList(VersionDirector.GetGameTypeName());
}

function OnFailedToConnectToMasterServer(error : NetworkConnectionError)
{
	Debug.Log("Failed to connect to the master server! " + error.ToString());
}

function OnMasterServerEvent(msEvent : MasterServerEvent)
{
	Debug.Log("In OnMasterServerEvent: " + msEvent.ToString());
}

function Update()
{
	var hostData : HostData[] = MasterServer.PollHostList();
	if (hostData.length > 0)
	{
		for (var host : HostData in hostData)
		{
			var foundGame : FoundGame = new FoundGame();
			foundGame.host = host;
			foundGame.ipAddress = IPFromStringArray(host.ip);
			if (IsDedicatedServerByComment(host.comment)) {
				foundGame.isDedicated = true;
				foundGame.playerCount = host.connectedPlayers - 1;
				foundGame.maxPlayerCount = host.playerLimit - 1;
			} else {
				foundGame.isDedicated = false;
				foundGame.playerCount = host.connectedPlayers;
				foundGame.maxPlayerCount = host.playerLimit;
			}			
			foundGame.ping = Ping(foundGame.ipAddress);
			foundGames.Add(foundGame);
		}
	
		MasterServer.ClearHostList();
	}
}

function GetGameCount() : int
{
	return foundGames.length;
}

function GetGameByIndex(index : int) : FoundGame
{
	return foundGames[index];
}

