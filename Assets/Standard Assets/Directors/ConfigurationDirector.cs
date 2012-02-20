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

using UnityEngine;
using System.Collections;

public enum CameraMode { CycleFaceForward = 0, CycleOrbit = 1, CycleTopDown = 2, Freeze = 3 };

static public class ConfigurationDirector
{
	static public int GetAbsoluteMaxPlayerCount()
	{
		// TODO: Increase this number after proving the engine can handle 16 players
		return 16;
	}
	
	static public GameRuleTypes GetGameRules()
	{
		return (GameRuleTypes)PlayerPrefs.GetInt("GameRules", 1);
	}
	
	// TODO: When we introduce new modes of player (Team DM, Soccer), we should
	// be accessing this from the single player and network host setup menus.
	static public void SetGameRules(GameRuleTypes value)
	{
		PlayerPrefs.SetInt("GameRules", (int)value);
	}
	
	static public float GetCycleHue()
	{
		return PlayerPrefs.GetFloat("CycleHue", 0.56f);
	}
	
	static public Color GetCycleColor()
	{
		return ColorDirector.H2RGB(GetCycleHue());
	}
	
	static public void SetCycleHue(float value)
	{
		PlayerPrefs.SetFloat("CycleHue", value);
	}
	
	static public string GetPlayerName()
	{
		return PlayerPrefs.GetString("PlayerName", "Player");
	}
	
	static public void SetPlayerName(string value)
	{
		PlayerPrefs.SetString("PlayerName", value);
	}
	
	static public string GetGameName()
	{
		return PlayerPrefs.GetString("GameName", "Cycles3D Game");
	}
	
	static public void SetGameName(string value)
	{
		PlayerPrefs.SetString("GameName", value);
	}
	
	static public string GetGameDescription()
	{
		return PlayerPrefs.GetString("GameDescription", "");
	}
	
	static public void SetGameDescription(string value)
	{
		PlayerPrefs.SetString("GameDescription", value);
	}
	
	static public string GetGamePort()
	{
		return PlayerPrefs.GetString("GamePort", "19384");
	}
	
	static public void SetGamePort(string value)
	{
		PlayerPrefs.SetString("GamePort", value);
	}
	
	static public string GetGamePassword()
	{
		return PlayerPrefs.GetString("GamePassword", "");
	}
	
	static public void SetGamePassword(string value)
	{
		PlayerPrefs.SetString("GamePassword", value);
	}
	
	static public bool GetGameDedicatedServer()
	{
		return (PlayerPrefs.GetInt("GameDedicatedServer", 0) == 0) ? false : true;
	}
	
	static public void SetGameDedicatedServer(bool value)
	{
		PlayerPrefs.SetInt("GameDedicatedServer", value ? 1 : 0);
	}
	
	static public int GetGameMaxConnections()
	{
		return PlayerPrefs.GetInt("GameMaxConnections", 2);
	}
	
	static public void SetGameMaxConnections(int value)
	{
		PlayerPrefs.SetInt("GameMaxConnections", value);
	}
	
	static public bool GetGamePrivate()
	{
		return (PlayerPrefs.GetInt("Private", 0) == 0) ? false : true;
	}
	
	static public void SetGamePrivate(bool value)
	{
		PlayerPrefs.SetInt("Private", value ? 1 : 0);
	}
	
	static public string GetJoinIPAddress()
	{
		return PlayerPrefs.GetString("JoinIPAddress", "");
	}
	
	static public void SetJoinIPAddress(string value)
	{
		PlayerPrefs.SetString("JoinIPAddress", value);
	}
	
	static public string GetJoinPort()
	{
		return PlayerPrefs.GetString("JoinPort", "19384");
	}
	
	static public void SetJoinPort(string value)
	{
		PlayerPrefs.SetString("JoinPort", value);
	}
	
	static public CameraMode GetCameraMode()
	{
		return (CameraMode)PlayerPrefs.GetInt("CameraMode", 0);
	}
	
	static public void SetCameraMode(CameraMode value)
	{
		PlayerPrefs.SetInt("CameraMode", (int)value);
	}
	
	static public int GetEnemyCount()
	{
		return PlayerPrefs.GetInt("EnemyCount", 5);
	}
	
	static public void SetEnemyCount(int value)
	{
		PlayerPrefs.SetInt("EnemyCount", value);
	}
	
	static public float GetSFXVolume()
	{
		return PlayerPrefs.GetFloat("SFXVolume", 0.8f);
	}
	
	static public void SetSFXVolume(float value)
	{
		PlayerPrefs.SetFloat("SFXVolume", value);
	}
	
	static public float GetCycleHumVolume()
	{
		return PlayerPrefs.GetFloat("CycleHumVolume", 0.8f);
	}
	
	static public void SetCycleHumVolume(float value)
	{
		PlayerPrefs.SetFloat("CycleHumVolume", value);
	}
	
	static public string GetCycleModelName()
	{
		return PlayerPrefs.GetString("CycleModelName", GetDefaultCycleModelName());
	}
	
	static public void SetCycleModelName(string value)
	{
		PlayerPrefs.SetString("CycleModelName", value);
	}
	
	static public string GetDefaultCycleModelName()
	{
		return "{Default}";
	}
}
