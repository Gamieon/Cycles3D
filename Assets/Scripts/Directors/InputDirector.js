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

/* This component is used to handle all commands performed within a game. It hides
callers from the abstraction of how commands are dispatched to every instance of
the game. All commands in a game which affect player states not internally driven
by Unity must go through this component.

This component should persist throughout the lifetime of the game.

We expect that the game will add other components to this same game object. Those
components would have game-specific player registration and handling of events.


	Major version history
	=====================
	2012-01-06 - c.haag - Initial implementation

*/

// Possible input director states
//
// Idle - Nothing is going on. This is true when we're in the main menu
// Local - A local instance of the game is in progress
// Server - This instance of the game is acting as the host
// Connecting - This instance of the game is connecting to a host
// Client - This instance of the game is connected to a host
enum InputTransportMode { Idle, Local, Server, Connecting, Client }

// The master server director which is responsible for acquiring online game listings
private var masterServerDirector : MasterServerDirector;
// The current state of the input director
private var mode : InputTransportMode = InputTransportMode.Idle;
// The prefix for the next level to load (prevents network messages from one 
// level trickling into another)
private var nextLevelPrefix : int = 0; 

// True if our input transport mode is Server and we're not actually engaging in the game
// (but we still need to run it)
private var isDedicatedServer : boolean; 
// True if this game will NOT be listed on the master server
private var isPrivate : boolean;
private var gameTypeName : String; // Host property
private var gameName : String; // Host property
private var gameComment : String; // Host property

// Returns the input director in the scene. If it does not exist, it is created.
// The input director object persists through all scenes.
static function Get() : InputDirector
{
	var o : GameObject = GameObject.Find("InputDirector");
	if (null == o) {
		o = new GameObject();
		o.name = "InputDirector";
		o.AddComponent("InputDirector");
		o.AddComponent("MasterServerDirector");
		// Ensure this object is never destroyed
		DontDestroyOnLoad(o);
	}
	return o.GetComponent("InputDirector");
}

private function SetModeInternal(value : InputTransportMode)
{
	mode = value;
	Debug.Log("InputDirector mode is now " + value.ToString());
}

function Start()
{
	masterServerDirector = GetComponent("MasterServerDirector");
	networkView.stateSynchronization = NetworkStateSynchronization.Off;
}

// Returns true if this instance of the game is the host
function IsHosting() : boolean
{
	var result : boolean = false;
	if (InputTransportMode.Local == mode || InputTransportMode.Server == mode)
	{
		result = true;
	}
	return result;
}

function IsNetworking() : boolean
{
	var result : boolean = true;
	if (InputTransportMode.Local == mode)
	{
		result = false;
	}
	return result;
}

// Returns true if this game object belongs to us for controlling. This only
// applies to objects with networkView components being used.
function IsOurs(o : GameObject)
{
	if (IsNetworking()) {
		return o.networkView.isMine;
	} else {
		return true;
	}
}

// Returns true if we are actively running a dedicated server
function IsDedicatedServer() : boolean
{
	if (InputTransportMode.Server == mode) {
		return isDedicatedServer;
	} else {
		// If we're not a server, we're not dedicated, period.
		return false;
	}
}

// This function returns our current mode
function GetMode() : InputTransportMode
{
	return mode;
}

// This function changes the mode of the input director
function SetMode(value : InputTransportMode)
{
	// Unhost if we're currently hosting but the input mode is changing
	if (InputTransportMode.Server == mode && value != mode) {
		UnhostServer();
	}

	// TODO: Check the existing mode and throw exceptions if not supported
	SetModeInternal(value);
}

// This function gets the IP address from a given client ID
function GetIPAddress(ID : String) : String
{
	for (var i=0; i < Network.connections.length; i++) {
		if (Network.connections[i].ToString() == ID) {
			return Network.connections[i].ipAddress;
		}
	}
	return "";
}

// This function will host a server. The caller specifies the max number of players
// and the listening port. This will notify the notification object when the game is
// hosted.
function HostServer(connections : int, listenPort : int, dedicatedServer : boolean, 
	password : String, gamePrivate : boolean, typeName : String, name : String, comment : String)
{
	if (InputTransportMode.Idle == mode) 
	{
		var useNat : boolean = !Network.HavePublicAddress();
		isDedicatedServer = dedicatedServer;
		isPrivate = gamePrivate; 
		gameTypeName = typeName;
		gameName = name;
		gameComment = comment;
		Network.InitializeSecurity();
		SetModeInternal(InputTransportMode.Connecting);
		Network.incomingPassword = password;
		var result : NetworkConnectionError = Network.InitializeServer(connections, listenPort, useNat);
		if (NetworkConnectionError.NoError == result)
		{
			// This might not mean the server is initialized; it could mean it's initializing. We want
			// to wait for a OnServerInitialized message.
			Debug.Log("Network.InitializeServer was successful");
		}
		else {
			// Unity doesn't send messages for failing to initialize the server, so we'll send one.
			SendMessage("OnHostServerComplete", result);
			// TODO: Throw an exception?
		}
	}
	else {
		// TODO: Throw an exception
	}
}

// This function will unhost a server
function UnhostServer()
{
	if (InputTransportMode.Server == mode) {
		// Remove from the Unity master server game list
		masterServerDirector.UnregisterHost();	
		// Now disconnect
		Network.Disconnect();
		// Update our mode
		SetModeInternal(InputTransportMode.Idle);
	}
	else {
		// TODO: Throw an exception
	}	
}

// This function will have the game instance attempt to connect to a server
function ConnectToServer(IP : String, remotePort : int, password : String, self : GameObject)
{
	if (InputTransportMode.Idle == mode) 
	{
		selfPlayerObject = self;
		SetModeInternal(InputTransportMode.Connecting);
		var result : NetworkConnectionError = Network.Connect(IP, remotePort, password);
		if (NetworkConnectionError.NoError == result)
		{
			// This might not mean the connection is established; it could mean it's initializing. We want
			// to wait for a OnConnectedToServer message.
			Debug.Log("Network.Connect was successful.");
		}
		else {
			// TODO: Throw an exception?
		}		
	}
	else {
		// TODO: Throw an exception
	}	
}

// This function will disconnect us from the server if we're still connected
function DisconnectFromServer()
{
	if (InputTransportMode.Connecting == mode || InputTransportMode.Client == mode) {
		Network.Disconnect();
	    // Update our mode
	    SetModeInternal(InputTransportMode.Idle);
	}
}

// This function is called by the server to disconnect a client
function DisconnectClientFromServer(ID : String)
{
	for (var i=0; i < Network.connections.Length; i++) {
		if (Network.connections[i].ToString() == ID) {
			Network.CloseConnection(Network.connections[i],true);
			return;
		}
	}
}

function OnServerInitialized()
{
    Debug.Log("Server initialized.");
    // Update our mode
    SetModeInternal(InputTransportMode.Server);
    // Register the game on Unity's master server
    if (!isPrivate) {
   		masterServerDirector.RegisterHost(gameTypeName, gameName, gameComment, isDedicatedServer);
   	}
    // Let all components know the server is initialized
    SendMessage("OnHostServerComplete", NetworkConnectionError.NoError);
}

// This is called by Unity when a player connects to a server. Only servers get this message.
function OnPlayerConnected(player : NetworkPlayer)
{
	// player.ToString() is the unique ID of the player. When printing NetworkPlayer.ToString()
	// you will see a number, but we should not assume it will always be a number.
    Debug.Log("Player " + player.ToString() + " connected from " + player.ipAddress + ":" + player.port + ".");
    // TODO: Anything else?
}

// This is called by Unity when a player disconnects from a server. Only servers get this message.
function OnPlayerDisconnected(player : NetworkPlayer)
{
	// player.ToString() is the unique ID of the player. When printing NetworkPlayer.ToString()
	// you will see a number, but we should not assume it will always be a number.
    Debug.Log("Player " + player.ToString() + " disconnected.");
    
    // Delete all player objects and RPC buffer entries
    Network.RemoveRPCs(player);
    Network.DestroyPlayerObjects(player);
    
    // TODO: Anything else?
    
	// Let all components know what happened
	SendMessage("OnPlayerDisconnectedFromServer", player);    
}

// This is called by Unity when we, a client, failed to connect to a remote server.
function OnFailedToConnect(error : NetworkConnectionError)
{
	Debug.Log("Failed to connect to server!");
	SetModeInternal(InputTransportMode.Idle);
	// Shut down our connection
	DisconnectFromServer();
	// Let all components know what happened
	SendMessage("OnConnectToServerComplete", error);
}

// This is called by Unity when we, a client, connected to the remote server.
function OnConnectedToServer()
{
	// Update our mode
	SetModeInternal(InputTransportMode.Client);
	// Let all components know what happened. We don't need to do anything here.
	SendMessage("OnConnectToServerComplete", NetworkConnectionError.NoError);	
}
 
// This is called by Unity when we, a client, were disconnected from the remote server.
// It can also be called when a server is shut down.
function OnDisconnectedFromServer(disconnectionMode : NetworkDisconnection)
{
	Debug.Log("Disconnected from the server.");
	SetModeInternal(InputTransportMode.Idle);
    // TODO: Better handling per
    // http://unity3d.com/support/documentation/ScriptReference/Network.OnDisconnectedFromServer.html
    // Let all components know what happened
    SendMessage("OnDisconnectionFromServer", disconnectionMode);
}

// This function will create a new object in the game based on a prefab
function InstantiateObject(prefab : GameObject, position : Vector3, rotation : Quaternion, group : int) : GameObject
{
	var result : GameObject = null;
	switch (mode) {
		case InputTransportMode.Local:
			// Regular instantiation
			result = GameObject.Instantiate(prefab, position, rotation);
			break;
		case InputTransportMode.Server:
		case InputTransportMode.Client:
			// Network instantiation
			result = Network.Instantiate(prefab, position, rotation, group);
			break;
		default:
			// Not supported
			// TODO: Throw an exception
			break;
	}
	return result;
}

// This function will destroy a game object
function DestroyObject(doomedObject : GameObject)
{
	switch (mode) {
		case InputTransportMode.Local:
			// Regular destruction
			Destroy(doomedObject);
			break;
		case InputTransportMode.Server:
		case InputTransportMode.Client:
			// Network destruction
			// TODO: Figure out why When when destroying client objects do we still get messages
			// like "View ID AllocatedID: 50 not found during lookup. Strange behaviour may occur"?
			// Probably because I pulled the rug from right under the client's feet and they're trying
			// to send state information. I tried sending an RPC first, but Destroy seems to have a higher
			// priority and completes before my RPC gets out. Need to confirm the right way to destroy
			// objects that were instantiated by other players.
			Network.Destroy(doomedObject);
			break;
		default:
			// Not supported
			// TODO: Throw an exception
			break;
	}
}

// This function is called by a server to change the current level during a network game
function LoadScene(level : String)
{
	if (InputTransportMode.Local == mode) {
		Application.LoadLevel(level);
	} else if (InputTransportMode.Server == mode) {
		networkView.RPC("OnLoadNetworkLevel", RPCMode.AllBuffered, level, nextLevelPrefix++);
	} else {
		// TODO: Throw an exception?
	}
}

// This function will send a non-buffered command to the server
function SendCommandToServer(command : String)
{
	switch (mode) {
		case InputTransportMode.Client:
			networkView.RPC(command, RPCMode.Server);
			break;
		default:
			// TODO: Throw an exception?
			break;
	}
}

// This function will send a non-buffered command with a Vector3 parameter to a single player
function SendCommand(networkPlayerID : String, command : String, param : Vector3)
{
	switch (mode) {
		case InputTransportMode.Server:
			for (var p : NetworkPlayer in Network.connections) {
				if (p.ToString() == networkPlayerID) {
					networkView.RPC(command, p, param);
					return;
				}
			}
			// TODO: Throw an exception?			
			break;
		default:
			break;
	}
}

// This function will send a buffered command to an object. In a local game, a message
// will be sent. In a network game, an RPC call will be made. In a network game,
// the object should have been created with InputDirector.InstantiateObject()
function SendBufferedCommand(receiver : GameObject, command : String)
{
	switch (mode) {
		case InputTransportMode.Local:
			// Process the command locally. The receiver is required to handle the message.
			receiver.SendMessage(command);
			break;
		case InputTransportMode.Server:
		case InputTransportMode.Client:
			// Use an RPC command. This requires that the receiver has a network view.
			receiver.networkView.RPC(command, RPCMode.AllBuffered);
			break;
		default:
			// Not supported
			// TODO: Throw an exception
			break;
	}
}

// This function will broadcast a non-buffered command with a single float to all clients
// TODO: How do we use args so we don't need all these BroadcastCommand overloads?
function BroadcastCommand(command : String, f1 : float)
{
	switch (mode) {
		case InputTransportMode.Server:
		case InputTransportMode.Client:
			networkView.RPC(command, RPCMode.All, f1);
			break;
		default:
			// Not supported
			break;			
	}
}

// This function will broadcast a non-buffered command with a single string to all clients
function BroadcastCommand(command : String, s1 : String)
{
	switch (mode) {
		case InputTransportMode.Server:
		case InputTransportMode.Client:
			networkView.RPC(command, RPCMode.All, s1);
			break;
		default:
			// Not supported
			break;			
	}
}


// This function will broadcast a non-buffered command with a string and int to all clients
function BroadcastCommand(command : String, s1 : String, i1 : int)
{
	switch (mode) {
		case InputTransportMode.Server:
		case InputTransportMode.Client:
			networkView.RPC(command, RPCMode.All, s1, i1);
			break;
		default:
			// Not supported
			break;			
	}
}

// This function will broadcast a non-buffered command with a single vector and color
// parameter to all clients and the originator.
function BroadcastCommand(command : String, pos : Vector3, color : Color)
{
	switch (mode) {
		case InputTransportMode.Server:
		case InputTransportMode.Client:
			networkView.RPC(command, RPCMode.All, pos, color.r, color.g, color.b, color.a);
			break;
		default:
			// Not supported
			break;			
	}
}

// This function will broadcast a non-buffered command with two string
// parameters to all clients and the originator.
function BroadcastCommand(command : String, s1 : String, s2 : String)
{
	switch (mode) {
		case InputTransportMode.Server:
		case InputTransportMode.Client:
			networkView.RPC(command, RPCMode.All, s1, s2);
			break;
		default:
			// Not supported
			break;			
	}
}

// This function will broadcast a non-buffered command with a string and
// a booelan parameter to all clients and the originator.
function BroadcastCommand(command : String, s1 : String, b2 : boolean)
{
	switch (mode) {
		case InputTransportMode.Server:
		case InputTransportMode.Client:
			networkView.RPC(command, RPCMode.All, s1, b2);
			break;
		default:
			// Not supported
			break;			
	}
}

// This function will broadcast a buffered command with an integer
// parameter to all clients and the originator.
function BroadcastBufferedCommand(command : String, i1 : int)
{
	switch (mode) {
		case InputTransportMode.Server:
		case InputTransportMode.Client:
			networkView.RPC(command, RPCMode.AllBuffered, i1);
			break;
		default:
			// Not supported
			break;			
	}
}

@script RequireComponent(NetworkView)
