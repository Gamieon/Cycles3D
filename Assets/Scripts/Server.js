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

// When cycles create walls, we want all the ways for a single player to belong to
// a specific network group so that they can easily be cleared out of the RPC buffer.
private var firstCycleGroup : int = 10;
private var nextCycleGroupID : int = firstCycleGroup;
// Input director
private var inputDirector : InputDirector;
// Player maintains the master list of all players in the game
private var player : Player;
// The list of banned IP addresses
private var bannedIPAddresses : Array = new Array();

// Returns the one and only "self" server. This component is used by clients to register 
// with game servers, and used by game servers to track player lists. This component is
// always attached to the input director.
static function Get() : Server
{
	var o : GameObject = InputDirector.Get().gameObject;
	var s : Server = o.GetComponent("Server");
	if (null == s) {
		s = o.AddComponent("Server");
	}	
	return s;
}

function Awake()
{
	inputDirector = InputDirector.Get();
	player = Player.GetSelf();
}

private function IsBanned(IPAddress : String) : boolean
{
	for (var i=0; i < bannedIPAddresses.length; i++) {
		if (bannedIPAddresses[i] == IPAddress) {
			return true;
		}
	}
	return false;
}

// This is called by clients and servers alike to register with the master player
// list, and to get an updated list from the main server.
function Register()
{
	if (Network.isServer) {
		// If this is called by the server, then it must mean the game is just starting
		// and they are the only player in it. So, we need to clear the player list.
		player.ClearPlayerList();
		
		// Send a message to all components that we've registered ourself as a player.
		// This will make it so when new players come in, they will see that we exist
		// as a player.
		// ***		
		// SendMessage only allows for one parameter, so we'll have to do this the dirty way
		player.OnRegisteredWithServer(networkView.owner.ToString(), nextCycleGroupID++, inputDirector.IsDedicatedServer());
	}
	else
	{
		// If we're a client, send a message to the server that we want to register. We will get our
		// network view ID, as it is on the server, back in a response message.
		networkView.RPC("OnServerRegister", RPCMode.Server, VersionDirector.GetVersion());
	}
}

// This is called by the server when a player is disconnected and we want to
// unregister the player from the server list.
function Unregister(p : NetworkPlayer)
{
	// Tell everyone, including ourselves, that the client left. We don't need to
	// buffer this because when the client disconnected, we removed all its RPC
	// buffer entries. New players that come in later will never know that this
	// player existed.
	networkView.RPC("OnPlayerUnregistered", RPCMode.All, p.ToString());
}

// This is called by the server to kick a player
function Kick(ID : String, ban : boolean)
{
	if (inputDirector.IsHosting() && inputDirector.IsNetworking())
	{
		if (ID == player.GetSelf().GetSelfID()) {
			ConsoleDirector.Log("You can't kick yourself!");
		} else {
			var IPAddress : String = inputDirector.GetIPAddress(ID);
			inputDirector.DisconnectClientFromServer(ID);
			if (ban) {
				bannedIPAddresses.Add(IPAddress);
				ConsoleDirector.Log("Banned player " + ID + " with address " + IPAddress);
			} else {
				ConsoleDirector.Log("Kicked player " + ID);
			}
		}
	}
}

// This message is sent from a client to a server. This includes the version of the game
@RPC
function OnServerRegister(requestedVersion : String, info : NetworkMessageInfo)
{
	Debug.Log("OnServerRegister called from player " + info.sender.ToString() + " with version " + requestedVersion);
	// This is where games can do per-game authentication with players before
	// letting them actually play. Here, we:
	//
	// - Ensure the versions are consistent
	// - Ensure the player is not banned
	//
	// If all is well, reply to the player with their new ID; make them responsible
	// for broadcasting their presence to everyone so that it's their network
	// view ID that gets put into the RPC buffer.
	if (VersionDirector.GetVersion() != requestedVersion) {
		networkView.RPC("OnServerRegistrationFailed", info.sender, "Version mismatch");
	} else if (IsBanned(info.sender.ipAddress)) {
		networkView.RPC("OnServerRegistrationFailed", info.sender, "You are banned");
	} else {
		// Inform the sender that the registration was successful
		networkView.RPC("OnRegisteredWithServer", info.sender, info.sender.ToString(), nextCycleGroupID++, false);
	}
}

// This message is sent from the GameUI on a server, or from a client when all the players
// are ready to start the next round of the game.
@RPC
function OnAllPlayersReadyInWaitingArea()
{
	inputDirector.LoadScene("Game");
}
