using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Xml;
using System.IO;

public class CustomContentDirector : MonoBehaviour 
{
    class TriangleSet
    {
        public int[] indices;

        public TriangleSet()
        {
            indices = null;
        }

        public void AddIndices(int[] value)
        {
            int oldcount = (indices == null) ? 0 : indices.Length;
            int[] newindices = new int[oldcount + value.Length];
            for (int i = 0; i < oldcount; i++)
            {
                newindices[i] = indices[i];
            }
            for (int i = 0; i < value.Length; i++)
            {
                newindices[i + oldcount] = value[i];
            }
            indices = newindices;
        }
    }
    class IndexGroup
    {
        public int vertIndex;
        public int normIndex;
        public int texcoordIndex;

        public IndexGroup(int v, int n, int uv)
        {
            vertIndex = v;
            normIndex = n;
            texcoordIndex = uv;
        }
    }
	class IndexGroupList
    {
        IndexGroup[] _groups;

        public IndexGroupList()
        {
            _groups = null;
        }

        public int Count { get { if (null == _groups) { return 0; } else { return _groups.Length; } } }

        public int GetGroup(int vertIndex, int normIndex, int texcoordIndex)
        {
            if (null != _groups)
            {
                for (int i = 0; i < _groups.Length; i++)
                {
                    if (_groups[i].vertIndex == vertIndex &&
                        _groups[i].normIndex == normIndex &&
                        _groups[i].texcoordIndex == texcoordIndex)
                    {
                        return i;
                    }
                }
            }
            return Add(vertIndex, normIndex, texcoordIndex);
        }

        public IndexGroup GetGroup(int index)
        {
            return _groups[index];
        }

        public int Add(int vertIndex, int normIndex, int texcoordIndex)
        {
            IndexGroup[] newData = new IndexGroup[this.Count + 1];
            int idx = 0;
            if (null != _groups)
            {
                foreach (IndexGroup ig in _groups)
                {
                    newData[idx++] = ig;
                }
            }
            newData[idx] = new IndexGroup(vertIndex, normIndex, texcoordIndex);
            _groups = newData;
            return _groups.Length - 1;
        }
    }
	
	/// <summary>
	/// Cache of known models
	/// </summary>
	static Dictionary<string, GameObject> _cachedModels = new Dictionary<string, GameObject>();
	
	// Use this for initialization
	static public string GetApplicationDataPath() 
	{
    	string dataPath = "";
#if UNITY_IPHONE			
		string fileNameBase = Application.dataPath.Substring(0, Application.dataPath.LastIndexOf('/'));
		dataPath = fileNameBase.Substring(0, fileNameBase.LastIndexOf('/')) + "/Documents/";
#elif UNITY_ANDROID
		dataPath = Application.persistentDataPath + "/";
#else
		dataPath = Application.dataPath + "/";
#endif
		return dataPath;	
	}
	
	static public string[] GetFilesInFolder(string relFolder)
	{
		string fullPath = GetApplicationDataPath() + relFolder;
		Debug.Log("Searching " + fullPath + " for files...");
		string[] result = Directory.GetFiles(fullPath);
		
		// Strip the relative folder from the filenames
		for (int i=0; i < result.Length; i++)
		{
			result[i] = result[i].Substring(fullPath.Length + 1);	
		}
		
		// All done
		return result;
	}
	
	static public GameObject LoadModel(string fileName)
	{
		// If we get here, we're loading a custom model. If it's in the cache, return what's there.
		if (_cachedModels.ContainsKey(fileName))
		{
			return (GameObject)GameObject.Instantiate(_cachedModels[fileName]);
		}
		
		// If we get here, this is our first request for this filename. Load the mesh. 
		// (We currently only support the Collada format)
		string meshFileName = CustomContentDirector.GetApplicationDataPath() + fileName;
		GameObject o = new GameObject(); // This will be the return value
		Debug.Log("Loading custom model " + meshFileName + "...");	
		
		try
		{
			// Open a stream to the file
			using (FileStream fileStream = new FileStream(meshFileName, FileMode.Open))
			{
		        // Load the stream into an Xml document parser
		        XmlDocument doc = new XmlDocument();
				doc.Load(fileStream);
				
				// Now deserialize the document into a XmlCollada.XmlColladaSchema object. While
				// the naming could be better, this object allows easy access to all the components
				// in the Collada mesh.
				XmlCollada.XmlColladaSchema collada = new XmlCollada.XmlColladaSchema(doc);
		        XmlCollada.Scene scene = collada.Scene;
		        XmlCollada.Instance_Visual_Scene instanceVisualScene = scene.InstanceVisualScene;
		        XmlCollada.Visual_Scene visualScene = collada.LibraryVisualScenes.GetVisualScene(instanceVisualScene.URL.Trim('#'));
		        XmlCollada.XmlColladaList geometryNodeList = visualScene.GetInstanceGeometryNodes();
				// We don't support these; but when we decide to, these are here for us
		        //XmlCollada.XmlColladaList materialNodeList = collada.LibraryMaterials.Materials;
		        //XmlCollada.XmlColladaList imageNodeList = collada.LibraryImages.Images;
				
				
		        // Navigate through the schema to build all geometries
		        for (int i = 0; i < geometryNodeList.Count; i++)
		        {
		            XmlCollada.Node node = (XmlCollada.Node)geometryNodeList.GetAt(i);
		            XmlCollada.XmlColladaList transforms = node.Transforms;
		            XmlCollada.Instance_Geometry instanceGeometry = node.InstanceGeometry;
		            XmlCollada.Geometry geometry = collada.LibraryGeometries.GetGeometry(instanceGeometry.URL.Trim('#'));
		            XmlCollada.Mesh colladaMesh = geometry.Mesh;
		            XmlCollada.XmlColladaList xmlGeometries = colladaMesh.GetXmlGeometries();
						            
		            // Build a matrix based on all geometry transforms
		            for (int j = 0; j < transforms.Count; j++)
		            {
		                // TODO: Build a matrix based on the transforms
		            }
		
		            // Now load all the polygon lists
		            for (int j = 0; j < xmlGeometries.Count; j++)
		            {
		                XmlCollada.XmlGeometry xmlGeometry = (XmlCollada.XmlGeometry)xmlGeometries.GetAt(j);
		                XmlCollada.XmlColladaList inputs = xmlGeometry.GetInputs();
						TriangleSet triangleSet = new TriangleSet();
						
						// Create one Unity game object per polygon list
						GameObject unityNode = new GameObject();
						Mesh unityMesh = new Mesh();
						unityNode.AddComponent<MeshFilter>().mesh = unityMesh;
						unityNode.AddComponent<MeshRenderer>();
						unityNode.transform.parent = o.transform;
						unityNode.name = node.Name;
						
		                // Get the material (Currently unsuppoorted)
		                //string instanceMaterialTarget = node.InstanceGeometry.GetBoundMaterialTarget(xmlGeometry.Material);
		                //XmlCollada.Material material = collada.LibraryMaterials.GetMaterial(instanceMaterialTarget.Trim('#'));
			            //XmlCollada.Effect effect = collada.LibraryEffects.GetEffect(material._instanceEffect.URL.Trim('#'));
	            		//XmlCollada.XmlShaderElement shader = effect.ProfileCommon.Technique.Shader;
		
		                // Now load recognized input components for this polygon list
		                Vector3[] vertices = null;
		                Vector3[] normals = null;
		                Vector2[] texcoords = null;
		                int verticesPOffset = -1;
		                int normalsPOffset = -1;
		                int texcoordsPOffset = -1;
		                int maxInputOffset = 0;
		                for (int k = 0; k < inputs.Count; k++)
		                {
		                    XmlCollada.Input input = (XmlCollada.Input)inputs.GetAt(k);
		                    if (input.Offset > maxInputOffset)
		                    {
		                        maxInputOffset = input.Offset;
		                    }
		
		                    XmlCollada.Source source;
		                    if (input.Semantic == "VERTEX")
		                    {
		                        source = (XmlCollada.Source)colladaMesh.GetSource(colladaMesh.Vertices.Input.Source.Trim('#'));
		                    }
		                    else
		                    {
		                        source = (XmlCollada.Source)colladaMesh.GetSource(input.Source.Trim('#'));
		                    }
		                    XmlCollada.Float_Array floatArray = source.Float_Array;
		                    XmlCollada.Technique_Common techniqueCommon = (XmlCollada.Technique_Common)source.Technique_Common;
		                    XmlCollada.Accessor accessor = techniqueCommon.Accessor;
		                    XmlCollada.XmlColladaList paramsList = accessor.GetParamsList();
		
		                    // Calculate the number of named parameters
		                    int namedParamCount = 0;
		                    for (int l = 0; l < paramsList.Count; l++)
		                    {
		                        XmlCollada.Param param = (XmlCollada.Param)paramsList.GetAt(l);
		                        if (param.Name.Length > 0)
		                        {
		                            namedParamCount++;
		                        }
		                    }
		
		                    // Build the coordinate list from all the accessor elements
		                    float[] floatValues = new float[accessor.Count * namedParamCount];
		                    int curFloatValue = 0;
		                    for (int l = 0; l < accessor.Count; l++)
		                    {
		                        // Do for all parameters
		                        int m0 = accessor.Offset + l * accessor.Stride;
		                        for (int m = 0; m < paramsList.Count; m++)
		                        {
		                            XmlCollada.Param param = (XmlCollada.Param)paramsList.GetAt(m);
		                            if (param.Name.Length > 0)
		                            {
		                                floatValues[curFloatValue++] = floatArray.Values[m0 + m];
		                            }
		                        }
		                    }
		
		                    if (null == vertices && "VERTEX" == input.Semantic.ToUpper())
		                    {
		                        vertices = new Vector3[accessor.Count];
		                        for (int l = 0; l < accessor.Count; l++)
		                        {
		                            vertices[l] = new Vector3();
		                            vertices[l].x = floatValues[l * namedParamCount];
		                            if (namedParamCount > 1) { vertices[l].y = floatValues[l * namedParamCount + 1]; }
		                            if (namedParamCount > 2) { vertices[l].z = floatValues[l * namedParamCount + 2]; }
		                        }
		                        verticesPOffset = input.Offset;
		                    }
		                    else if (null == normals && "NORMAL" == input.Semantic.ToUpper())
		                    {
		                        normals = new Vector3[accessor.Count];
		                        for (int l = 0; l < accessor.Count; l++)
		                        {
		                            normals[l] = new Vector3();
		                            normals[l].x = floatValues[l * namedParamCount];
		                            if (namedParamCount > 1) { normals[l].y = floatValues[l * namedParamCount + 1]; }
		                            if (namedParamCount > 2) { normals[l].z = floatValues[l * namedParamCount + 2]; }
		                        }
		                        normalsPOffset = input.Offset;
		                    }
		                    else if (null == texcoords && "TEXCOORD" == input.Semantic.ToUpper())
		                    {
		                        texcoords = new Vector2[accessor.Count];
		                        for (int l = 0; l < accessor.Count; l++)
		                        {
		                            texcoords[l] = new Vector2();
		                            texcoords[l].x = floatValues[l * namedParamCount];
		                            if (namedParamCount > 1) { texcoords[l].y = floatValues[l * namedParamCount + 1]; }
		                        }
		                        texcoordsPOffset = input.Offset;
		                    }
		                } // for (int k = 0; k < inputs.Count; k++)
		
		                // Now that all the input components (vertex lists) have been loaded, we load the actual face
		                // and index information. Loading is different for polygons and triangles.
		                if (xmlGeometry.root == "polylist" || xmlGeometry.root == "triangles")
		                {
		                    // Make a first pass at reading in the polygons. Because there can be a different
		                    // number of vertex indices than normal indices than UV indices, we have to create
		                    // our own index group based on the unique pairs of those elements.
		                    //
		                    // Note: The stride of <p> is equal to one more than the highest input offset.
		                    //
		                    IndexGroupList indexGroupList = new IndexGroupList();
		                    int[] vcounts = xmlGeometry.GetVCount();
		                    int[] p = xmlGeometry.GetP();
		                    int pIndex = 0;
		
		                    // A triangle list is no different than a polygon list where the vcount is undefined. We'll make
		                    // it up here and assign three vertices per triangle.
		                    if (xmlGeometry.root == "triangles")
		                    {
		                        vcounts = new int[xmlGeometry.Count];
		                        for (int k=0; k < xmlGeometry.Count; k++) {
		                            vcounts[k] = 3;
		                        }
		                    }
		
		                    // Do for all elements in vcount (one element is one polygon)
		                    for (int k = 0; k < vcounts.Length; k++)
		                    {
		                        int vertexCount = vcounts[k];
		                        int[] polyVertIndices = new int[vertexCount];
		                        int[] polyNormIndices = (normalsPOffset >= 0) ? new int[vertexCount] : null;
		                        int[] polyTexIndices = (texcoordsPOffset >= 0) ? new int[vertexCount] : null;
		
		                        // Do for all vertices for this polygon
		                        for (int l = 0; l < vertexCount; l++)
		                        {
		                            polyVertIndices[l] = p[pIndex + verticesPOffset];
		                            if (normalsPOffset >= 0) { polyNormIndices[l] = p[pIndex + normalsPOffset]; }
		                            if (texcoordsPOffset >= 0) { polyTexIndices[l] = p[pIndex + texcoordsPOffset]; }
		                            pIndex += maxInputOffset + 1;
		                        }
		
		                        // At this point we have all our indices; however we still have to deal with the disjointed
		                        // nature of the indices (e.g. 8 vertex indices, 24 normal vertices). This is where our index
		                        // group list comes in. Add every unique combination of vertex, normal, and uv indices into
		                        // a single array, and build our triangle list while we're at it.
		                        int[] triangleIndices = new int[(vertexCount - 2) * 3];
		                        for (int l = 0; l < vertexCount - 2; l++)
		                        {
		                            triangleIndices[l * 3] = indexGroupList.GetGroup(polyVertIndices[0], ((polyNormIndices != null) ? polyNormIndices[0] : -1), ((polyTexIndices != null) ? polyTexIndices[0] : -1));
		                            triangleIndices[l * 3 + 1] = indexGroupList.GetGroup(polyVertIndices[l + 1], ((polyNormIndices != null) ? polyNormIndices[l + 1] : -1), ((polyTexIndices != null) ? polyTexIndices[l + 1] : -1));
		                            triangleIndices[l * 3 + 2] = indexGroupList.GetGroup(polyVertIndices[l + 2], ((polyNormIndices != null) ? polyNormIndices[l + 2] : -1), ((polyTexIndices != null) ? polyTexIndices[l + 2] : -1));
		                        }
		
		                        // Add the triangles to the generic mesh
		                        triangleSet.AddIndices(triangleIndices);
		                    }
							
		                    // Now we need to assign all the accumulated vertices, normals, and texcoords to the generic mesh
		                    Vector3[] v = new Vector3[indexGroupList.Count];
							Vector3[] n = (null != normals) ? new Vector3[indexGroupList.Count] : null;
							Vector2[] uv = (null != texcoords) ? new Vector2[indexGroupList.Count] : null;
		                    for (int k = 0; k < indexGroupList.Count; k++)
		                    {
		                        IndexGroup group = indexGroupList.GetGroup(k);
								v[k] = vertices[group.vertIndex];
		                        if (null != normals && group.normIndex >= 0) { n[k] = normals[group.normIndex]; }
		                        if (null != texcoords && group.texcoordIndex >= 0) { uv[k] = texcoords[group.texcoordIndex]; }
		                    }
							
							unityMesh.vertices = v;
							unityMesh.normals = n;
							unityMesh.uv = uv;
							unityMesh.triangles = triangleSet.indices;
							
							// Assign a default material
							unityNode.renderer.material = new Material(Shader.Find ("Diffuse"));
							unityNode.renderer.material.color = new Color(0.3f,0.3f,0.3f,1);
		
		                    // Now add the triangle set to the geometry
		                    //genericMeshGeometry.AddTriangleSet(triangleSet);
		
		                } // if (xmlGeometry.root == "polylist" || xmlGeometry.root == "triangles")
		  
		                //genericMesh.AddGeometry(genericMeshGeometry);
					}
	
				} // for (int i = 0; i < geometryNodeList.Count; i++)
				
			}
			
			// Now add the mesh to our cache and return it
			o.name = "prefab_" + fileName;
			o.SetActiveRecursively(false);
			DontDestroyOnLoad(o);
			_cachedModels.Add(fileName, o);
		}
		catch (Exception e)
		{
			Debug.LogError(e.ToString());
		}
		return (GameObject)GameObject.Instantiate(o);
	}
}
