using UnityEngine;
using System.Collections;
using System.Collections.Generic;

static public class CycleModelDirector
{	
	public static GameObject InstantiateSimpleCycle()
	{
		// Determine what model to load
		string modelFileName = ConfigurationDirector.GetCycleModelName();
		if (ConfigurationDirector.GetDefaultCycleModelName() == modelFileName)
		{
			// Default model
			return GameObject.Instantiate(Resources.Load("Prefabs/DefaultCycleModel")) as GameObject;
		}
		else
		{
			// Load it from the custom content director
			GameObject o = CustomContentDirector.LoadModel("CycleModels/" + modelFileName);
			// Add the colorizer script to it. Since we really don't know what to color, we'll
			// just color everything
			CycleColorizer c = o.AddComponent<CycleColorizer>();
			List<MeshRenderer> renderList = new List<MeshRenderer>();
			GetMeshRenderersRecurse(o.transform, ref renderList);
			c.diffuseColors = renderList.ToArray();
			return o;
		}
	}
	
	private static void GetMeshRenderersRecurse(Transform t, ref List<MeshRenderer> renderList)
	{
		MeshRenderer r = t.GetComponent<MeshRenderer>();
		if (null != r) {
			renderList.Add(r);	
		}
		foreach (Transform c in t) {
			GetMeshRenderersRecurse(c, ref renderList);
		}
	}
}