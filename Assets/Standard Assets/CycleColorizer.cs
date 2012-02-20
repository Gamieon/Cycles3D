using UnityEngine;
using System.Collections;

public class CycleColorizer : MonoBehaviour {

	// The array of renderers that have diffuse colors that we need to
	// sync with the player's color
	public MeshRenderer[] diffuseColors;
	// The array of renderers in the Mirrored cycle that we need to sync
	// with the player's color
	public MeshRenderer[] diffuseMirroredColors;
	// The array of renderers that have emissive colors that we need to
	// sync with the player's color.
	public MeshRenderer[] emissiveColors;
	
	/// <summary>
	/// This function makes the bike mesh colors uniform with the player's color
	/// </summary>
	public void OnUpdateCycleColors(Color c)
	{
		// Update diffuse colors
		if (null != diffuseColors)
		{
			foreach (MeshRenderer r in diffuseColors)
			{
				// Special case for the multi-material body
				if (r.materials.Length == 2) {
					r.materials[1].color = c;
				} else {
					r.material.color = c;
				}
			}
		}
		
		// Update diffuse colors in the Mirror image
		if (null != diffuseMirroredColors)
		{
			foreach (MeshRenderer r in diffuseMirroredColors)
			{
				// Special case for the multi-material body
				if (r.materials.Length == 2) {
					r.materials[1].color = c * 0.2f;
				} else {
					r.material.color = c * 0.2f;
				}		
			}
		}
		
		// Update emissive colors
		if (null != emissiveColors)
		{
			foreach (MeshRenderer r in emissiveColors)
			{
				r.material.color = new Color(0,0,0,1);
				if (r.transform.parent.name == "MirroredWalls") {			
					r.material.SetColor("_Emission", c * 0.2f);
				} else {
					r.material.SetColor("_Emission", c);
				}
			}
		}
	}
}
