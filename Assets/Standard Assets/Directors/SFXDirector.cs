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

// Utility file for playing sound effects

using UnityEngine;
using System.Collections;

public static class SFXDirector
{
	static public AudioSource Play(AudioClip clip)
	{
		return Play(clip, new Vector3(0,0,0), 1.0f, 1.0f);
	}
	
	static public AudioSource Play(AudioClip clip, float volume)
	{
		return Play(clip, new Vector3(0,0,0), volume, 1.0f);
	}
	
	static public AudioSource Play(AudioClip clip, Vector3 position, float volume)
	{
		return Play(clip, position, volume, 1.0f);
	}
	
	static public AudioSource Play(AudioClip clip, Vector3 position, float volume, float pitch)
	{
	    var go = new GameObject ("One shot audio");
	    go.transform.position = position;
	    AudioSource source = (AudioSource)go.AddComponent<AudioSource>();
	    source.clip = clip;
	    source.volume = volume * ConfigurationDirector.GetSFXVolume();
		source.pitch = pitch;
		source.rolloffMode = AudioRolloffMode.Linear;
		source.maxDistance = 1000.0f;
	    source.Play();
	    GameObject.Destroy(go, clip.length);
	    return source;
	}		
}
