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

enum CameraMode { CycleFaceForward = 0, CycleOrbit = 1, CycleTopDown = 2, Freeze = 3 };

static function GetAbsoluteMaxPlayerCount()
{
	// TODO: Increase this number after proving the engine can handle 16 players
	return 16;
}

static function GetGameRules() : GameRuleTypes
{
	return PlayerPrefs.GetInt("GameRules", 1);
}

// TODO: When we introduce new modes of player (Team DM, Soccer), we should
// be accessing this from the single player and network host setup menus.
static function SetGameRules(value : GameRuleTypes)
{
	PlayerPrefs.SetInt("GameRules", value);
}

static function GetCycleHue() : float
{
	return PlayerPrefs.GetFloat("CycleHue", 0.56);
}

static function GetCycleColor() : Color
{
	return ColorDirector.H2RGB(GetCycleHue());
}

static function SetCycleHue(value : float)
{
	PlayerPrefs.SetFloat("CycleHue", value);
}

static function GetPlayerName() : String
{
	return PlayerPrefs.GetString("PlayerName", "Player");
}

static function SetPlayerName(value : String)
{
	PlayerPrefs.SetString("PlayerName", value);
}

static function GetGameName() : String
{
	return PlayerPrefs.GetString("GameName", "Cycles3D Game");
}

static function SetGameName(value : String)
{
	PlayerPrefs.SetString("GameName", value);
}

static function GetGameDescription() : String
{
	return PlayerPrefs.GetString("GameDescription", "");
}

static function SetGameDescription(value : String)
{
	PlayerPrefs.SetString("GameDescription", value);
}

static function GetGamePort() : String
{
	return PlayerPrefs.GetString("GamePort", "19384");
}

static function SetGamePort(value : String)
{
	PlayerPrefs.SetString("GamePort", value);
}

static function GetGamePassword() : String
{
	return PlayerPrefs.GetString("GamePassword", "");
}

static function SetGamePassword(value : String)
{
	PlayerPrefs.SetString("GamePassword", value);
}

static function GetGameDedicatedServer() : boolean
{
	return (PlayerPrefs.GetInt("GameDedicatedServer", 0) == 0) ? false : true;
}

static function SetGameDedicatedServer(value : boolean)
{
	PlayerPrefs.SetInt("GameDedicatedServer", value ? 1 : 0);
}

static function GetGameMaxConnections() : int
{
	return PlayerPrefs.GetInt("GameMaxConnections", 2);
}

static function SetGameMaxConnections(value : int)
{
	PlayerPrefs.SetInt("GameMaxConnections", value);
}

static function GetGamePrivate() : boolean
{
	return (PlayerPrefs.GetInt("Private", 0) == 0) ? false : true;
}

static function SetGameLPrivate(value : boolean)
{
	PlayerPrefs.SetInt("Private", value ? 1 : 0);
}

static function GetJoinIPAddress() : String
{
	return PlayerPrefs.GetString("JoinIPAddress", "");
}

static function SetJoinIPAddress(value : String)
{
	PlayerPrefs.SetString("JoinIPAddress", value);
}

static function GetJoinPort() : String
{
	return PlayerPrefs.GetString("JoinPort", "19384");
}

static function SetJoinPort(value : String)
{
	PlayerPrefs.SetString("JoinPort", value);
}

static function GetCameraMode() : CameraMode
{
	return PlayerPrefs.GetInt("CameraMode", 0);
}

static function SetCameraMode(value : CameraMode)
{
	PlayerPrefs.SetInt("CameraMode", value);
}

static function GetEnemyCount() : int
{
	return PlayerPrefs.GetInt("EnemyCount", 5);
}

static function SetEnemyCount(value : int)
{
	PlayerPrefs.SetInt("EnemyCount", value);
}

static function GetSFXVolume() : float
{
	return PlayerPrefs.GetFloat("SFXVolume", 0.8);
}

static function SetSFXVolume(value : float)
{
	PlayerPrefs.SetFloat("SFXVolume", value);
}

static function GetCycleHumVolume() : float
{
	return PlayerPrefs.GetFloat("CycleHumVolume", 0.8);
}

static function SetCycleHumVolume(value : float)
{
	PlayerPrefs.SetFloat("CycleHumVolume", value);
}