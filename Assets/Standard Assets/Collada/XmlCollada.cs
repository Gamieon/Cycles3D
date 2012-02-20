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

using System;
using System.IO;
using System.Xml;
using System.Xml.XPath;

/// <summary>
/// This class is used to serialize and deserialize a Collada XML document
/// into a collection of objects which can be used to build a mesh.
/// </summary>
public class XmlCollada
{
    public class XmlColladaList
    {
        object[] _data;

        public XmlColladaList()
        {
            _data = null;
        }

        public int Count { get { if (_data == null) { return 0; } else { return _data.Length; } } }

        public object GetAt(int index)
        {
            return _data[index];
        }

        public void Add(object obj)
        {
            object[] newData = new object[this.Count + 1];
            int idx = 0;
            if (null != _data)
            {
                foreach (object o in _data)
                {
                    newData[idx++] = o;
                }
            }
            newData[idx] = obj;
            _data = newData;
        }
    }

    public class XmlColor
    {
        public const string root = "color";

        public float R;
        public float G;
        public float B;
        public float A;

        public override string ToString()
        {
            return R.ToString() + "," + G.ToString() + "," + B.ToString() + "," + A.ToString();
        }

        public XmlColor(float r, float g, float b, float a)
        {
            R = r;
            G = g;
            B = b;
            A = a;
        }

        public XmlColor(XPathNodeIterator iterator)
        {
            string value = iterator.Current.Value;
            string[] valueArray = value.Split(' ');
            if (valueArray.Length == 4)
            {
                float[] f = new float[4];
                int idx = 0;
                foreach (string s in valueArray)
                {
                    f[idx++] = Convert.ToSingle(s);
                }
                R = f[0];
                G = f[1];
                B = f[2];
                A = f[3];
            }
        }

        public void Save(XmlTextWriter writer)
        {
            string value = R.ToString() + " " + G.ToString() + " " + B.ToString() + " " + A.ToString();
            writer.WriteElementString(root, value);
        }
    }

    public class XmlFloat
    {
        public const string root = "float";

        float _value;
        public float Value { get { return _value; } }

        public override string ToString()
        {
            return Value.ToString();
        }

        public XmlFloat(XPathNodeIterator iterator)
        {
            _value = Convert.ToSingle(iterator.Current.Value);
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteElementString(root, _value.ToString());
        }
    }

    public abstract class XmlShaderElement
    {
        public XmlColladaList _fxList;

        public abstract string root { get; }

        public XmlShaderElement(XmlColladaList fxList)
        {
            _fxList = fxList;
        }

        public XmlShaderElement(XPathNodeIterator iterator, string uri)
        {
            _fxList = new XmlColladaList();

            XPathNodeIterator childNodesIterator = iterator.Current.SelectChildren(XPathNodeType.Element);
            while (childNodesIterator.MoveNext())
            {
                Fx_common_color_or_texture_type fx = new Fx_common_color_or_texture_type(childNodesIterator, uri);
                _fxList.Add(fx);
            }
        }

        public Fx_common_color_or_texture_type GetFX(string root)
        {
            for (int i = 0; i < _fxList.Count; i++)
            {
                Fx_common_color_or_texture_type fx = (Fx_common_color_or_texture_type)_fxList.GetAt(i);
                if (fx.Root == root)
                {
                    return fx;
                }
            }
            return null;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            for (int i = 0; i < _fxList.Count; i++)
            {
                Fx_common_color_or_texture_type fx = (Fx_common_color_or_texture_type)_fxList.GetAt(i);
                fx.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    public abstract class XmlGeometry
    {
        public const string count = "count";
        public const string material = "material";
        public const string vcount = "vcount";
        public const string p = "p";

        /// <summary>
        /// The number of polygon primitives. Required.
        /// </summary>
        protected int _count;
        public int Count { get { return _count; } }

        /// <summary>
        /// Declares a symbol for a material. This symbol is bound to a material at the time of
        /// instantiation; see <instance_geometry> and <bind_material>. Optional. If
        /// not specified then the lighting and shading results are application defined.
        /// </summary>
        protected string _material;
        public string Material { get { return _material; } }

        protected XmlColladaList _inputs;
        protected int[] _vcount;
        protected int[] _p;

        public XmlColladaList GetInputs() { return _inputs; }
        public int[] GetVCount() { return _vcount; }
        public int[] GetP() { return _p; }

        public abstract string root { get; }

        public XmlGeometry(int count, string material, XmlColladaList inputs, int[] vcount, int[] p)
        {
            _count = count;
            _material = material;
            _inputs = inputs;
            if (null == _inputs)
            {
                _inputs = new XmlColladaList();
            }
            _vcount = vcount;
            _p = p;
        }

        public XmlGeometry(XPathNodeIterator iterator, string uri)
        {
            _count = 0;

            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.PolyList.count);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _count = Convert.ToInt32(attributeIterator.Current.Value);
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.PolyList.material);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _material = attributeIterator.Current.Value;
            }

            _inputs = new XmlColladaList();
            XPathNodeIterator inputNodesIterator = iterator.Current.SelectChildren(XmlCollada.Input.root, uri);
            while (inputNodesIterator.MoveNext())
            {
                _inputs.Add(new Input(inputNodesIterator, uri));
            }

            XPathNodeIterator vcountIterator = iterator.Current.SelectChildren(XmlCollada.PolyList.vcount, uri);
            if (vcountIterator.Count > 0)
            {
                vcountIterator.MoveNext();
                string value = vcountIterator.Current.Value;
                string[] valueArray = value.Split(' ');
                if (valueArray.Length > 0)
                {
                    _vcount = new int[valueArray.Length];
                    int idx = 0;
                    foreach (string s in valueArray)
                    {
                        _vcount[idx++] = Convert.ToInt32(s);
                    }
                }
            }

            XPathNodeIterator pIterator = iterator.Current.SelectChildren(XmlCollada.PolyList.p, uri);
            if (pIterator.Count > 0)
            {
                pIterator.MoveNext();
                string value = pIterator.Current.Value;
                string[] valueArray = value.Split(' ');
                if (valueArray.Length > 0)
                {
                    _p = new int[valueArray.Length];
                    int idx = 0;
                    foreach (string s in valueArray)
                    {
                        _p[idx++] = Convert.ToInt32(s);
                    }
                }
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            writer.WriteAttributeString(count, _count.ToString());
            if (null != _material) { writer.WriteAttributeString(material, _material); }
            for (int i = 0; i < _inputs.Count; i++)
            {
                Input input = (Input)_inputs.GetAt(i);
                input.Save(writer);
            }
            if (null != _vcount) 
            {
                string vcountString = "";
                for (int i = 0; i < _vcount.Length; i++)
                {
                    vcountString += _vcount[i].ToString() + " ";
                }
                vcountString = vcountString.TrimEnd();
                writer.WriteElementString(vcount, vcountString);
            }
            if (null != p) 
            {
                string pString = "";
                for (int i = 0; i < _p.Length; i++)
                {
                    pString += _p[i].ToString() + " ";
                }
                pString = pString.TrimEnd();
                writer.WriteElementString(p, pString);
            }
            writer.WriteEndElement();
        }
    }

    public abstract class XmlTransform
    {
        public const string sid = "sid";

        protected string _sid;
        public string SID { get { return _sid; } }

        public XmlTransform(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Rotate.sid);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _sid = attributeIterator.Current.Value;
            }
        }

        public abstract void Save(XmlTextWriter writer);
    }

    /// <summary>
    /// Rotations change the orientation of objects in a coordinate system without any translation. Computer
    /// graphics techniques apply a rotational transformation in order to orient or otherwise move values with
    /// respect to a coordinate system. Conversely, rotation can mean the translation of the coordinate axes about
    /// the local origin.
    /// This element contains an angle and a mathematical vector that represents the axis of rotation.
    /// </summary>
    public class Rotate : XmlTransform
    {
        public const string root = "rotate";

        float X;
        float Y;
        float Z;
        float Angle;

        public Rotate(XPathNodeIterator iterator, string uri)
            : base(iterator, uri)
        {
            X = 0;
            Y = 0;
            Z = 0;
            Angle = 0;

            string value = iterator.Current.Value;
            string[] valueArray = value.Split(' ');
            if (valueArray.Length == 4)
            {
                float[] f = new float[4];
                int idx = 0;
                foreach (string s in valueArray)
                {
                    f[idx++] = Convert.ToSingle(s);
                }
                X = f[0];
                Y = f[1];
                Z = f[2];
                Angle = f[3];
            }
        }

        public override void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _sid) { writer.WriteAttributeString(sid, _sid); }
            writer.WriteString(X.ToString() + " " + Y.ToString() + " " + Z.ToString() + " " + Angle.ToString());
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// This element contains a mathematical vector that represents the distance along the x, y, and z axes.
    /// Computer graphics techniques apply a translation transformation to position or move values with respect to
    /// a coordinate system.
    /// </summary>
    public class Translate : XmlTransform
    {
        public const string root = "translate";

        float X;
        float Y;
        float Z;

        public Translate(XPathNodeIterator iterator, string uri)
            : base(iterator, uri)
        {
            X = 0;
            Y = 0;
            Z = 0;

            string value = iterator.Current.Value;
            string[] valueArray = value.Split(' ');
            if (valueArray.Length == 3)
            {
                float[] f = new float[3];
                int idx = 0;
                foreach (string s in valueArray)
                {
                    f[idx++] = Convert.ToSingle(s);
                }
                X = f[0];
                Y = f[1];
                Z = f[2];
            }
        }

        public override void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _sid) { writer.WriteAttributeString(sid, _sid); }
            writer.WriteString(X.ToString() + " " + Y.ToString() + " " + Z.ToString());
            writer.WriteEndElement();
        }
    }

    public class XmlColladaSchema
    {
        public string root = "COLLADA";
        public string version = "version";
        public string xmlns = "xmlns";

        public Asset _asset;
        public Library_Geometries _geometries;
        public Library_Effects _effects;
        public Library_Materials _materials;
        public Library_Visual_Scenes _visualScenes;
        public Library_Images _images;
        public Scene _scene;

        public Scene Scene { get { return _scene; } }
        public Library_Visual_Scenes LibraryVisualScenes { get { return _visualScenes; } }
        public Library_Geometries LibraryGeometries { get { return _geometries; } }
        public Library_Materials LibraryMaterials { get { return _materials; } }
        public Library_Effects LibraryEffects { get { return _effects; } }
        public Library_Images LibraryImages { get { return _images; } }

        public XmlColladaSchema(Asset asset, Library_Geometries geometries, Library_Effects effects,
            Library_Materials materials, Library_Visual_Scenes visualScenes,
            Library_Images images, Scene scene)
        {
            _asset = asset;
            _geometries = geometries;
            _effects = effects;
            _materials = materials;
            _visualScenes = visualScenes;
            _images = images;
            _scene = scene;
        }

        public XmlColladaSchema(XmlDocument doc)
        {
            XPathNavigator navigator = doc.CreateNavigator();

            // Move to the first child element of the document. This will be the root element.
            //navigator.MoveToChild(XPathNodeType.Element);
            navigator.MoveToFirstChild();
            string uri = string.Empty;
            if (navigator.HasAttributes == true)
            {
                uri = navigator.NamespaceURI;
            }

            // Handle asset data
            XPathNodeIterator nodesIterator;
            nodesIterator = navigator.SelectChildren(XmlCollada.Library_Geometries.root, uri);
            if (nodesIterator.MoveNext())
            {
                _asset = new XmlCollada.Asset(nodesIterator, uri);
            }

            // Handle geometry library data
            nodesIterator = navigator.SelectChildren(XmlCollada.Library_Geometries.root, uri);
            if (nodesIterator.MoveNext())
            {
                _geometries = new XmlCollada.Library_Geometries(nodesIterator, uri);
            }

            // Handle effects data
            nodesIterator = navigator.SelectChildren(XmlCollada.Library_Effects.root, uri);
            if (nodesIterator.MoveNext())
            {
                _effects = new XmlCollada.Library_Effects(nodesIterator, uri);
            }

            // Handle material data
            nodesIterator = navigator.SelectChildren(XmlCollada.Library_Materials.root, uri);
            if (nodesIterator.MoveNext())
            {
                _materials = new XmlCollada.Library_Materials(nodesIterator, uri);
            }

            // Handle visual scene data
            nodesIterator = navigator.SelectChildren(XmlCollada.Library_Visual_Scenes.root, uri);
            if (nodesIterator.MoveNext())
            {
                _visualScenes = new XmlCollada.Library_Visual_Scenes(nodesIterator, uri);
            }

            // Handle image data
            nodesIterator = navigator.SelectChildren(XmlCollada.Library_Images.root, uri);
            if (nodesIterator.MoveNext())
            {
                _images = new XmlCollada.Library_Images(nodesIterator, uri);
            }

            // Handle the scene
            nodesIterator = navigator.SelectChildren(XmlCollada.Scene.root, uri);
            if (nodesIterator.MoveNext())
            {
                _scene = new XmlCollada.Scene(nodesIterator, uri);
            }
        }

        public void Save(FileStream stream)
        {
            XmlTextWriter writer = new XmlTextWriter(stream, System.Text.Encoding.ASCII);
            writer.WriteStartDocument();
            Save(writer);
            writer.WriteEndDocument();
            writer.Close();
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            writer.WriteAttributeString(xmlns, "http://www.collada.org/2005/11/COLLADASchema");
            writer.WriteAttributeString(version, "1.4.1");
            if (null != _asset) { _asset.Save(writer); }
            if (null != _images) { _images.Save(writer); }
            if (null != _materials) { _materials.Save(writer); }
            if (null != _effects) { _effects.Save(writer); }
            if (null != _geometries) { _geometries.Save(writer); }
            if (null != _visualScenes) { _visualScenes.Save(writer); }
            if (null != _scene) { _scene.Save(writer); }
            writer.WriteEndElement();
        }
    }

    public class MinFilter
    {
        public string root = "minfilter";

        string _value;
        public string Value { get { return _value; } }

        public MinFilter(string value)
        {
            _value = value;
        }
        public MinFilter(XPathNodeIterator iterator, string uri)
        {
            _value = iterator.Current.Value;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (_value != null) { writer.WriteString(_value); }
            writer.WriteEndElement();
        }
    }

    public class MagFilter
    {
        public string root = "magfilter";

        string _value;
        public string Value { get { return _value; } }

        public MagFilter(string value)
        {
            _value = value;
        }
        public MagFilter(XPathNodeIterator iterator, string uri)
        {
            _value = iterator.Current.Value;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (_value != null) { writer.WriteString(_value); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// A type that describes the sampling states of the <sampler*> elements.
    /// This type describes the attributes and related elements of the following elements:
    /// • <sampler1D>
    /// • <sampler2D>
    /// • <sampler3D>
    /// • <samplerCUBE>
    /// • <samplerDEPTH>
    /// • <samplerRECT>
    /// • <samplerStates>
    /// The schema type that inherits from this provides the final details of how these states will be used for
    /// sampling.
    /// </summary>
    public abstract class Fx_sampler_common
    {
        public abstract string root { get; }
        public const string source = "source";
        public const string minfilter = "minfilter";
        public const string magfilter = "magfilter";

        Source _source;
        public Source Source { get { return _source; } }

        MinFilter _minfilter;
        public MinFilter MinFilter { get { return _minfilter; } }

        MagFilter _magfilter;
        public MagFilter MagFilter { get { return _magfilter; } }

        public Fx_sampler_common(Source source, MinFilter minfilter, MagFilter magfilter)
        {
            _source = source;
            _minfilter = minfilter;
            _magfilter = magfilter;
        }

        public Fx_sampler_common(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator nodeIterator;

            nodeIterator = iterator.Current.SelectChildren(XmlCollada.Fx_sampler_common.source, uri);
            if (nodeIterator.MoveNext())
            {
                _source = new Source(nodeIterator, uri);
            }
            nodeIterator = iterator.Current.SelectChildren(XmlCollada.Fx_sampler_common.minfilter, uri);
            if (nodeIterator.MoveNext())
            {
                _minfilter = new MinFilter(nodeIterator, uri);
            }
            nodeIterator = iterator.Current.SelectChildren(XmlCollada.Fx_sampler_common.magfilter, uri);
            if (nodeIterator.MoveNext())
            {
                _magfilter = new MagFilter(nodeIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (_source != null) { _source.Save(writer); }
            if (_minfilter != null) { _minfilter.Save(writer); }
            if (_magfilter != null) { _magfilter.Save(writer); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// A type that describes color attributes of fixed-function shader elements inside <profile_COMMON> effects.
    /// </summary>
    public class Fx_common_color_or_texture_type
    {
        public string _root;
        public string Root { get { return _root; } }

        public const string xmlcolor = "color";
        public const string xmlfloat = "float";
        public const string xmltexture = "texture";

        XmlColor _color;
        public XmlColor Color { get { return _color; } }

        XmlFloat _float;
        public float Float { get { return _float.Value; } }

        /// <summary>
        /// The value is specified by a reference to a previously
        /// defined <sampler2D> object. The texcoord
        /// attribute provides a semantic token, which will be
        /// referenced within <bind_material> to bind an
        /// array of texcoords from a <geometry> instance to
        /// the sampler.
        /// Both attributes are required and are of type
        /// xs:NCName. The <extra> child element can
        /// appear 0 or more times. See its main entry in Core.
        /// </summary>
        Texture _texture;
        public Texture Texture { get { return _texture; } }

        public Fx_common_color_or_texture_type(string root, XmlColor color, XmlFloat floatValue, Texture texture)
        {
            _root = root;
            _color = color;
            _float = floatValue;
            _texture = texture;
        }

        public Fx_common_color_or_texture_type(XPathNodeIterator iterator, string uri)
        {
            _root = iterator.Current.Name;

            XPathNodeIterator nodeIterator;

            nodeIterator = iterator.Current.SelectChildren(XmlCollada.XmlColor.root, uri);
            if (nodeIterator.MoveNext())
            {
                _color = new XmlColor(nodeIterator);
            }

            nodeIterator = iterator.Current.SelectChildren(XmlCollada.XmlFloat.root, uri);
            if (nodeIterator.MoveNext())
            {
                _float = new XmlFloat(nodeIterator);
            }

            nodeIterator = iterator.Current.SelectChildren(XmlCollada.Texture.root, uri);
            if (nodeIterator.MoveNext())
            {
                _texture = new Texture(nodeIterator, uri);
            }

        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(_root);
            if (null != _color)
            {
                _color.Save(writer);
            }
            if (null != _float)
            {
                _float.Save(writer);
            }
            if (null != _texture)
            {
                _texture.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// A child element of Fx_common_color_or_texture_type.
    /// </summary>
    public class Texture
    {
        public const string root = "texture";
        public const string texture = "texture";
        public const string texcoord = "texcoord";

        string _texture;
        public string TextureValue { get { return _texture; } }

        string _texcoord;
        public string Texcoord { get { return _texcoord; } }

        public Texture(string texture, string texcoord)
        {
            _texture = texture;
            _texcoord = texcoord;
        }

        public Texture(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Texture.texture);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _texture = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Texture.texcoord);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _texcoord = attributeIterator.Current.Value;
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (_texture != null) { writer.WriteAttributeString(texture, _texture); }
            if (_texcoord != null) { writer.WriteAttributeString(texcoord, _texcoord); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// Defines the attributes of a surface. With <origin> and <orient>, the surface can be positioned to its
    /// correct location.
    /// In a B-rep, unlimited surfaces and curves are used to describe the geometry (except NURBS and NURBS
    /// surfaces). The limitation is done by the topology.
    /// </summary>
    public class Surface
    {
        public const string root = "surface";
        public const string type = "type";
        public const string format = "format";

        string _type;
        public string Type { get { return _type; } }

        Init_From _initFrom;
        public Init_From InitFrom { get { return _initFrom; } }

        Format _format;
        public Format Format { get { return _format; } }

        public Surface(string type, Init_From initFrom, Format format)
        {
            _type = type;
            _initFrom = initFrom;
            _format = format;
        }

        public Surface(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Surface.type);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _type = attributeIterator.Current.Value;
            }

            XPathNodeIterator nodesIterator = iterator.Current.SelectChildren(XmlCollada.Init_From.root, uri);
            if (nodesIterator.Count > 0)
            {
                nodesIterator.MoveNext();
                _initFrom = new Init_From(nodesIterator, uri);
            }

            nodesIterator = iterator.Current.SelectChildren(XmlCollada.Format.root, uri);
            if (nodesIterator.Count > 0)
            {
                nodesIterator.MoveNext();
                _format = new Format(nodesIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _type) { writer.WriteAttributeString(type, _type); }
            if (null != _initFrom) { _initFrom.Save(writer); }
            if (null != _format) { _format.Save(writer); }
            writer.WriteEndElement();
        }
    }

    public class Format
    {
        public const string root = "format";

        string _value;
        public string Value { get { return _value; } }

        public Format(string value)
        {
            _value = value;
        }

        public Format(XPathNodeIterator iterator, string uri)
        {
            _value = iterator.Current.Value;
        }

        public void Save(XmlTextWriter writer)
        {
            if (_value != null) { writer.WriteElementString(root, _value); }
        }
    }

    public class Unit
    {
        public const string root = "unit";
        public const string meter = "meter";
        public const string name = "name";

        string _meter;
        public string Meter { get { return _meter; } }
        string _name;
        public string Name { get { return _name; } }

        public Unit(string meter, string name)
        {
            _meter = meter;
            _name = name;
        }

        public Unit(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Unit.meter);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _meter = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Unit.name);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _name = attributeIterator.Current.Value;
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _meter) { writer.WriteAttributeString(meter, _meter); }
            if (null != _name) { writer.WriteAttributeString(name, _name); }
            writer.WriteEndElement();
        }
    }

    public class Up_Axis
    {
        public const string root = "up_axis";

        string _value;
        public string Value { get { return _value; } }

        public Up_Axis(string value)
        {
            _value = value;
        }

        public Up_Axis(XPathNodeIterator iterator, string uri)
        {
            _value = iterator.Current.Value;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _value) { writer.WriteString(_value); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// Computers store vast amounts of information. An asset is a set of information that is organized into a
    /// distinct collection and managed as a unit. A wide range of attributes describes assets so that the
    /// information can be maintained and understood both by software tools and by humans. Asset information is
    /// often hierarchical, where the parts of a large asset are divided into smaller pieces that are managed as
    /// distinct assets themselves.
    /// </summary>
    public class Asset
    {
        public const string root = "asset";

        Unit _unit;
        Up_Axis _upAxis;

        public Asset(Unit unit, Up_Axis upAxis)
        {
            _unit = unit;
            _upAxis = upAxis;
        }

        public Asset(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator nodesIterator = iterator.Current.SelectChildren(XmlCollada.Unit.root, uri);
            if (nodesIterator.MoveNext())
            {
                _unit = new Unit(nodesIterator, uri);
            }
            nodesIterator = iterator.Current.SelectChildren(XmlCollada.Up_Axis.root, uri);
            if (nodesIterator.MoveNext())
            {
                _upAxis = new Up_Axis(nodesIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _unit)
            {
                _unit.Save(writer);
            }
            if (null != _upAxis)
            {
                _upAxis.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// As data sets become larger and more complex, they become harder to manipulate within a single
    /// container. One approach to managing this complexity is to divide the data into smaller pieces organized by
    /// some criteria. These modular pieces can then be stored in separate resources as libraries.
    /// </summary>
    public class Library_Geometries
    {
        public const string root = "library_geometries";
        public const string geometry = "geometry";
        XmlColladaList _geometries;

        public Library_Geometries(XmlColladaList geometries)
        {
            _geometries = geometries;
            if (null == _geometries)
            {
                _geometries = new XmlColladaList();
            }
        }

        public Library_Geometries(XPathNodeIterator iterator, string uri)
        {
            _geometries = new XmlColladaList();
            XPathNodeIterator geometryNodeIterator = iterator.Current.SelectChildren(XmlCollada.Geometry.root, uri);
            while (geometryNodeIterator.MoveNext())
            {
                _geometries.Add(new Geometry(geometryNodeIterator, uri));
            }
        }

        public Geometry GetGeometry(string key)
        {
            for (int i = 0; i < _geometries.Count; i++)
            {
                Geometry g = (Geometry)_geometries.GetAt(i);
                if (g.ID == key)
                {
                    return g;
                }
            }
            return null;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            for (int i = 0; i < _geometries.Count; i++)
            {
                Geometry g = (Geometry)_geometries.GetAt(i);
                g.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// As data sets become larger and more complex, they become harder to manipulate within a single
    /// container. One approach to managing this complexity is to divide the data into smaller pieces organized by
    /// some criteria. These modular pieces can then be stored in separate resources as libraries.
    /// </summary>
    public class Library_Effects
    {
        public const string root = "library_effects";
        public const string effect = "effect";

        XmlColladaList _effects;

        public Library_Effects(XmlColladaList effects)
        {
            _effects = effects;
        }

        public Library_Effects(XPathNodeIterator iterator, string uri)
        {
            _effects = new XmlColladaList();
            XPathNodeIterator effectNodeIterator = iterator.Current.SelectChildren(XmlCollada.Effect.root, uri);
            while (effectNodeIterator.MoveNext())
            {
                _effects.Add(new Effect(effectNodeIterator, uri));
            }
        }

        public Effect GetEffect(string key)
        {
            for (int i = 0; i < _effects.Count; i++)
            {
                Effect e = (Effect)_effects.GetAt(i);
                if (e.ID == key)
                {
                    return e;
                }
            }
            return null;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            for (int i = 0; i < _effects.Count; i++)
            {
                Effect e = (Effect)_effects.GetAt(i);
                e.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// As data sets become larger and more complex, they become harder to manipulate within a single
    /// container. One approach to managing this complexity is to divide the data into smaller pieces organized by
    /// some criteria. These modular pieces can then be stored in separate resources as libraries.
    /// </summary>
    public class Library_Materials
    {
        public const string root = "library_materials";
        public const string material = "material";

        XmlColladaList _materials;
        public XmlColladaList Materials { get { return _materials; } }

        public Library_Materials(XmlColladaList materials)
        {
            _materials = materials;
        }

        public Library_Materials(XPathNodeIterator iterator, string uri)
        {
            _materials = new XmlColladaList();
            XPathNodeIterator materialNodeIterator = iterator.Current.SelectChildren(XmlCollada.Material.root, uri);
            while (materialNodeIterator.MoveNext())
            {
                _materials.Add(new Material(materialNodeIterator, uri));
            }
        }

        public Material GetMaterial(string key)
        {
            for (int i = 0; i < _materials.Count; i++)
            {
                Material m = (Material)_materials.GetAt(i);
                if (m.ID == key)
                {
                    return m;
                }
            }
            return null;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            for (int i = 0; i < _materials.Count; i++)
            {
                Material m = (Material)_materials.GetAt(i);
                m.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// As data sets become larger and more complex, they become harder to manipulate within a single
    /// container. One approach to managing this complexity is to divide the data into smaller pieces organized by
    /// some criteria. These modular pieces can then be stored in separate resources as libraries.
    /// </summary>
    public class Library_Visual_Scenes
    {
        public const string root = "library_visual_scenes";

        XmlColladaList _visualScenes;

        public Library_Visual_Scenes(XmlColladaList visualScenes)
        {
            _visualScenes = visualScenes;
            if (null == _visualScenes)
            {
                _visualScenes = new XmlColladaList();
            }
        }

        public Library_Visual_Scenes(XPathNodeIterator iterator, string uri)
        {
            _visualScenes = new XmlColladaList();
            XPathNodeIterator visualSceneNodeIterator = iterator.Current.SelectChildren(XmlCollada.Visual_Scene.root, uri);
            while (visualSceneNodeIterator.MoveNext())
            {
                _visualScenes.Add(new Visual_Scene(visualSceneNodeIterator, uri));
            }
        }

        public Visual_Scene GetVisualScene(string key)
        {
            for (int i = 0; i < _visualScenes.Count; i++)
            {
                Visual_Scene vs = (Visual_Scene)_visualScenes.GetAt(i);
                if (vs.ID == key)
                {
                    return vs;
                }
            }
            return null;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            for (int i = 0; i < _visualScenes.Count; i++)
            {
                Visual_Scene vs = (Visual_Scene)_visualScenes.GetAt(i);
                vs.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// The <image> element represents either a picture’s data or renderable objects that will receive their data
    /// later.
    /// As data sets become larger and more complex, they become harder to manipulate within a single
    /// container. One approach to managing this complexity is to divide the data into smaller pieces organized by
    /// some criteria. These modular pieces can then be stored in separate resources as libraries.
    /// </summary>
    public class Library_Images
    {
        public const string root = "library_images";

        XmlColladaList _images;
        public XmlColladaList Images { get { return _images; } }

        public Library_Images(XmlColladaList images)
        {
            _images = images;
        }

        public Library_Images(XPathNodeIterator iterator, string uri)
        {
            _images = new XmlColladaList();
            XPathNodeIterator imageNodeIterator = iterator.Current.SelectChildren(XmlCollada.Image.root, uri);
            while (imageNodeIterator.MoveNext())
            {
                _images.Add(new Image(imageNodeIterator, uri));
            }
        }

        public Image GetImage(string id)
        {
            for (int i = 0; i < _images.Count; i++)
            {
                Image image = (Image)_images.GetAt(i);
                if (image.ID == id)
                {
                    return image;
                }
            }
            return null;
        }

        public void Save(XmlTextWriter writer)
        {
            if (_images.Count > 0)
            {
                writer.WriteStartElement(root);
                for (int i = 0; i < _images.Count; i++)
                {
                    Image m = (Image)_images.GetAt(i);
                    m.Save(writer);
                }
                writer.WriteEndElement();
            }
        }
    }

    /// <summary>
    /// Digital imagery comes in three main forms of data: raster, vector, and hybrid. Raster imagery comprises a
    /// sequence of brightness or color values, called picture elements (pixels), that together form the complete
    /// picture. Vector imagery uses mathematical formulae for curves, lines, and shapes to describe a picture or
    /// drawing. Hybrid imagery combines both raster and vector information, leveraging their respective strengths,
    /// to describe the picture.
    /// The <image> element best describes raster image data, but can conceivably handle other forms of
    /// imagery. Raster imagery data is typically organized in n-dimensional arrays. This array organization can be
    /// leveraged by texture look-up functions to access noncolor values such as displacement, normal, or height
    /// field values.
    /// </summary>
    public class Image
    {
        public const string root = "image";
        public const string id = "id";
        public const string name = "name";

        string _id;
        public string ID { get { return _id; } }

        string _name;
        public string Name { get { return _name; } }

        Init_From _initFrom;
        public Init_From InitFrom { get { return _initFrom; } }

        public Image(string id, string name, Init_From initFrom)
        {
            _id = id;
            _name = name;
            _initFrom = initFrom;
        }

        public Image(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Image.id);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _id = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Image.name);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _name = attributeIterator.Current.Value;
            }

            XPathNodeIterator nodesIterator = iterator.Current.SelectChildren(XmlCollada.Init_From.root, uri);
            if (nodesIterator.Count > 0)
            {
                nodesIterator.MoveNext();
                _initFrom = new Init_From(nodesIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _id) { writer.WriteAttributeString(id, _id); }
            if (null != _name) { writer.WriteAttributeString(name, _name); }
            if (null != _initFrom) { _initFrom.Save(writer); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// Initializes an entire image or portions of an image from referenced or embedded data.
    /// </summary>
    public class Init_From
    {
        public const string root = "init_from";

        string _value;
        public string Value { get { return _value; } }

        public Init_From(string value)
        {
            _value = value;
        }

        public Init_From(XPathNodeIterator iterator, string uri)
        {
            _value = iterator.Current.Value;            
        }

        public void Save(XmlTextWriter writer)
        {
            if (_value != null) { writer.WriteElementString(root, _value); }
        }
    }

    /// <summary>
    /// The hierarchical structure of the visual_scene is organized into a scene graph. A scene graph is a
    /// directed acyclic graph (DAG) or tree data structure that contains nodes of visual information and related
    /// data. The structure of the scene graph contributes to optimal processing and rendering of the data and is
    /// therefore widely used in the computer graphics domain.
    /// </summary>
    public class Visual_Scene
    {
        public const string root = "visual_scene";
        public const string id = "id";
        public const string name = "name";

        string _id;
        public string ID { get { return _id; } }

        string _name;
        public string Name { get { return _name; } }

        XmlColladaList _nodes;

        public Visual_Scene(string id, string name, XmlColladaList nodes)
        {
            _id = id;
            _name = name;
            _nodes = nodes;
            if (null == _nodes)
            {
                _nodes = new XmlColladaList();
            }
        }

        public Visual_Scene(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Material.id);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _id = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Material.name);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _name = attributeIterator.Current.Value;
            }

            _nodes = new XmlColladaList();
            XPathNodeIterator nodeIterator = iterator.Current.SelectChildren(XmlCollada.Node.root, uri);
            while (nodeIterator.MoveNext())
            {
                _nodes.Add(new Node(nodeIterator, uri));
            }
        }

        public XmlColladaList GetInstanceGeometryNodes()
        {
            XmlColladaList result = new XmlColladaList();
            for (int i = 0; i < _nodes.Count; i++)
            {
                Node node = (Node)_nodes.GetAt(i);
                if (null != node.InstanceGeometry)
                {
                    result.Add(node);
                }                    
            }
            return result;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _id) { writer.WriteAttributeString(id, _id); }
            if (null != _name) { writer.WriteAttributeString(name, _name); }
            for (int i = 0; i < _nodes.Count; i++)
            {
                Node node = (Node)_nodes.GetAt(i);
                node.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// Each COLLADA document can contain, at most, one <scene> element.
    /// The <scene> element declares the base of the scene hierarchy or scene graph. The scene contains
    /// elements that provide much of the visual and transformational information content as created by the
    /// authoring tools.
    /// The hierarchical structure of the scene is organized into a scene graph. A scene graph is a directed acyclic
    /// graph (DAG) or tree data structure that contains nodes of visual information and related data. The structure
    /// of the scene graph contributes to optimal processing and rendering of the data and is therefore widely
    /// used in the computer graphics domain.
    /// </summary>
    public class Scene
    {
        public const string root = "scene";

        Instance_Visual_Scene _instanceVisualScene;

        public Instance_Visual_Scene InstanceVisualScene { get { return _instanceVisualScene; } }

        public Scene(Instance_Visual_Scene instanceVisualScene)
        {
            _instanceVisualScene = instanceVisualScene;
        }

        public Scene(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator nodeIterator = iterator.Current.SelectChildren(XmlCollada.Instance_Visual_Scene.root, uri);
            if (nodeIterator.MoveNext())
            {
                _instanceVisualScene = new Instance_Visual_Scene(nodeIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _instanceVisualScene) { _instanceVisualScene.Save(writer); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// An <instance_visual_scene> instantiates the visual aspects of a scene. The <scene> element can
    /// contain, at most, one <instance_visual_scene> element. This constraint creates a one-to-one
    /// relationship between the document, the top-level scene, and its visual description. This provides
    /// applications and tools, especially those that support only one scene, an indication of the primary scene to
    /// load.
    /// </summary>
    public class Instance_Visual_Scene
    {
        public const string root = "instance_visual_scene";
        public const string url = "url";

        string _url;
        public string URL { get { return _url; } }

        public Instance_Visual_Scene(string url)
        {
            _url = url;
        }

        public Instance_Visual_Scene(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Instance_Visual_Scene.url);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _url = attributeIterator.Current.Value;
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _url) { writer.WriteAttributeString(url, _url); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// The <node> element embodies the hierarchical relationship of elements in a scene.by declaring a point of
    /// interest in a scene. A node denotes one point on a branch of the scene graph. The <node> element is
    /// essentially the root of a subgraph of the entire scene graph.
    /// Within the scene graph abstraction, there are arcs and nodes. Nodes are points of information within the
    /// graph. Arcs connect nodes to other nodes. Nodes are further distinguished as interior (branch) nodes and
    /// exterior (leaf) nodes. COLLADA uses the term node to denote interior nodes. Arcs are also called paths.
    /// </summary>
    public class Node
    {
        public const string root = "node";
        public const string id = "id";
        public const string name = "name";

        string _id;
        public string ID { get { return _id; } }

        string _name;
        public string Name { get { return _name; } }

        XmlColladaList _transforms;
        Instance_Geometry _instanceGeometry;

        public XmlColladaList Transforms { get { return _transforms; } }
        public Instance_Geometry InstanceGeometry { get { return _instanceGeometry; } }

        public Node(string id, string name, XmlColladaList transforms, Instance_Geometry instanceGeometry)
        {
            _transforms = transforms;
            if (null == _transforms) {
                _transforms = new XmlColladaList();
            }
            _id = id;
            _name = name;
            _instanceGeometry = instanceGeometry;
        }

        public Node(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Node.id);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _id = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Node.name);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _name = attributeIterator.Current.Value;
            }

            XPathNodeIterator nodeIterator;
            _transforms = new XmlColladaList();
            nodeIterator = iterator.Current.SelectChildren(XmlCollada.Rotate.root, uri);
            while (nodeIterator.MoveNext())
            {
                _transforms.Add(new Rotate(nodeIterator, uri));
            }

            nodeIterator = iterator.Current.SelectChildren(XmlCollada.Translate.root, uri);
            while (nodeIterator.MoveNext())
            {
                _transforms.Add(new Translate(nodeIterator, uri));
            }

            nodeIterator = iterator.Current.SelectChildren(XmlCollada.Instance_Geometry.root, uri);
            if (nodeIterator.MoveNext())
            {
                _instanceGeometry = new Instance_Geometry(nodeIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _id) { writer.WriteAttributeString(id, _id); }
            if (null != _name) { writer.WriteAttributeString(name, _name); }
            for (int i = 0; i < _transforms.Count; i++)
            {
                XmlTransform transform = (XmlTransform)_transforms.GetAt(i);
                transform.Save(writer);
            }
            if (null != _instanceGeometry) { _instanceGeometry.Save(writer); }

            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// The <instance_geometry> element instantiates an object described by a <geometry> element. A
    /// geometry object is instantiated within the local coordinate system of its parent <node> or <shape> and
    /// that determines its position, orientation, and scale. COLLADA supports convex mesh, mesh, and spline
    /// primitives.
    /// For details about instance elements in COLLADA, see “Instantiation and External Referencing” in
    /// Chapter 3: Schema Concepts.
    /// </summary>
    public class Instance_Geometry
    {
        public const string root = "instance_geometry";
        public const string url = "url";

        string _url;
        public string URL { get { return _url; } }

        XmlColladaList _bindMaterials;

        public Instance_Geometry(string url, XmlColladaList bindMaterials)
        {
            _url = url;
            _bindMaterials = bindMaterials;
            if (null == _bindMaterials) 
            {
                _bindMaterials = new XmlColladaList();
            }
        }

        public Instance_Geometry(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Instance_Geometry.url);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _url = attributeIterator.Current.Value;
            }

            _bindMaterials = new XmlColladaList();
            XPathNodeIterator nodeIterator = iterator.Current.SelectChildren(XmlCollada.Bind_Material.root, uri);
            while (nodeIterator.MoveNext())
            {
                _bindMaterials.Add(new Bind_Material(nodeIterator, uri));
            }
        }

        public string GetBoundMaterialTarget(string symbol)
        {
            for (int i = 0; i < _bindMaterials.Count; i++)
            {
                Bind_Material bindMaterial = (Bind_Material)_bindMaterials.GetAt(i);
                if (null != bindMaterial.TechniqueCommon.Instance_Material &&
                    bindMaterial.TechniqueCommon.Instance_Material.Symbol == symbol)
                {
                    return bindMaterial.TechniqueCommon.Instance_Material.Target;
                }
            }
            return null;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _url) { writer.WriteAttributeString(url, _url); }
            for (int i = 0; i < _bindMaterials.Count; i++)
            {
                Bind_Material bindMaterial = (Bind_Material)_bindMaterials.GetAt(i);
                bindMaterial.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// When a piece of geometry is declared, it can request that the geometry have a particular material, for
    /// example,
    /// <polygons name="leftarm" count="2445" material="bluePaint">
    /// This abstract symbol needs to be bound to a particular material instance. The application does the
    /// instantiation when processing the <instance_geometry> elements within the <bind_material>
    /// elements. The application scans the geometry for material attributes and binds actual material objects to
    /// them as indicated by the <instance_material> (geometry) symbol attributes. See “Example” below.
    /// While a material is bound, shader parameters might also need to be resolved. For example, if an effect
    /// requires two light source positions as inputs but the scene contains eight unique light sources, which two
    /// light sources will be used on the material? If an effect requires one set of texture coordinates on an object,
    /// but the geometry defined two sets of texcoords, which set will be used for this effect? <bind_material>
    /// is the mechanism for disambiguating inputs in the scene graph.
    /// Inputs are bound to the scene graph by naming the semantic attached to the parameters and connecting
    /// them by COLLADA URL syntax to individual elements of nodes in the scene graph, right down to the
    /// individual elements of vectors.
    /// </summary>
    public class Bind_Material
    {
        public const string root = "bind_material";

        public Technique_Common _techniqueCommon;
        public Technique_Common TechniqueCommon { get { return _techniqueCommon; } }

        public Bind_Material(Technique_Common techniqueCommon)
        {
            _techniqueCommon = techniqueCommon;
        }

        public Bind_Material(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator techniqueCommonIterator = iterator.Current.SelectChildren(XmlCollada.Technique_Common.root, uri);
            if (techniqueCommonIterator.MoveNext())
            {
                _techniqueCommon = new Technique_Common(techniqueCommonIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _techniqueCommon) { _techniqueCommon.Save(writer); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// A material instantiates an effect, fills its parameters with values, and selects a technique. It describes the
    /// appearance of a geometric object or may perform screen-space processing to create camera-lens-like
    /// effects such as blurs, blooms, or color filters.
    /// In computer graphics, geometric objects can have many parameters that describe their material properties.
    /// These material properties are the parameters for the rendering computations that produce the visual
    /// appearance of the object in the final output. Likewise, screen-space processing and compositing may also
    /// require many parameters for performing computation.
    /// The specific set of material parameters depend upon the graphics rendering system employed. Fixed
    /// function, graphics pipelines require parameters to solve a predefined illumination model, such as Phong
    /// illumination. These parameters include terms for ambient, diffuse and specular reflectance, for example.
    /// In programmable graphics pipelines, the programmer defines the set of material parameters. These
    /// parameters satisfy the rendering algorithm defined in the vertex and pixel programs.
    /// </summary>
    public class Material
    {
        public const string root = "material";
        public const string id = "id";
        public const string name = "name";

        string _id;
        public string ID { get { return _id; } }

        string _name;
        public string Name { get { return _name; } }

        public Instance_Effect _instanceEffect;

        public Material(string id, string name, Instance_Effect instanceEffect)
        {
            _id = id;
            _name = name;
            _instanceEffect = instanceEffect;
        }

        public Material(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Material.id);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _id = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Material.name);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _name = attributeIterator.Current.Value;
            }

            XPathNodeIterator instanceEffectNodesIterator = iterator.Current.SelectChildren(XmlCollada.Instance_Effect.root, uri);
            if (instanceEffectNodesIterator.Count > 0)
            {
                instanceEffectNodesIterator.MoveNext();
                _instanceEffect = new Instance_Effect(instanceEffectNodesIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (_id != null) { writer.WriteAttributeString(id, _id); }
            if (_name != null) { writer.WriteAttributeString(name, _name); }
            if (null != _instanceEffect)
            {
                _instanceEffect.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// An effect defines the equations necessary for the visual appearance of geometry and screen-space image
    /// processing.
    /// For details about instance elements in COLLADA, see “Instantiation and External Referencing” in
    /// Chapter 3: Schema Concepts.
    /// <instance_effect> instantiates an effect definition from the <library_effects> and customizes its
    /// parameters.
    /// The url attribute references the effect.
    /// <setparam>s assign values to specific effect and profile parameters that are unique to the instance.
    /// <technique_hint>s indicate the desired or last-used technique inside an effect profile. This allows the
    /// user to maintain the same look-and-feel of the effect instance as the last time that the user used it. Some
    /// runtime render engines may choose new techniques on the fly, but it is important for some effects and for
    /// digital-content-creation consistency to maintain the same visual appearance during authoring.
    /// </summary>
    public class Instance_Effect
    {
        public const string root = "instance_effect";
        public const string url = "url";

        string _url;
        public string URL { get { return _url; } }

        public Instance_Effect(string url)
        {
            _url = url;
        }

        public Instance_Effect(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Instance_Effect.url);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _url = attributeIterator.Current.Value;
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (_url != null) { writer.WriteAttributeString(url, _url); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// An effect defines the equations necessary for the visual appearance of geometry and screen-space image
    /// processing.
    /// Programmable pipelines allow stages of the 3D pipeline to be programmed using high-level languages.
    /// These shaders often require very specific data to be passed to them and require the rest of the 3D pipeline
    /// to be set up in a particular way in order to function. Shader Effects is a way of describing not only shaders,
    /// but also the environment in which they will execute. The environment requires description of images,
    /// samplers, shaders, input and output parameters, uniform parameters, and render-state settings.
    /// Additionally, some algorithms require several passes to render the effect. This is supported by breaking
    /// pipeline descriptions into an ordered collection of <pass> objects. These are grouped into
    /// <technique>s that describe one of several ways of generating an effect.
    /// Elements inside the <effect> declaration assume the use of an underlying library of code that handles
    /// the creation, use, and management of shaders, source code, parameters, etc. We shall refer to this
    /// underlying library as the “FX Runtime”.
    /// Parameters declared inside the <effect> element but outside of any <profile_*> element are said to
    /// be in “<effect> scope”. Parameters inside <effect> scope can be drawn only from a constrained list
    /// of basic data types and, after declaration, are available to <shader>s and declarations across all profiles.
    /// <effect> scope provides a handy way to parameterize many profiles and techniques with a single
    /// parameter.
    /// </summary>
    public class Effect
    {
        public const string root = "effect";
        public const string id = "id";
        public const string name = "name";

        /// <summary>
        /// Global identifier for this object. Required.
        /// </summary>
        string _id;
        public string ID { get { return _id; } }

        /// <summary>
        /// Pretty-print name for this effect. Optional.
        /// </summary>
        string _name;
        public string Name { get { return _name; } }

        Profile_COMMON _profileCommon;
        public Profile_COMMON ProfileCommon { get { return _profileCommon; } }

        public Effect(string id, string name, Profile_COMMON profileCommon)
        {
            _id = id;
            _name = name;
            _profileCommon = profileCommon;
        }

        public Effect(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Effect.id);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _id = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Effect.name);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _name = attributeIterator.Current.Value;
            }

            XPathNodeIterator profileCommonNodesIterator = iterator.Current.SelectChildren(XmlCollada.Profile_COMMON.root, uri);
            if (profileCommonNodesIterator.Count > 0)
            {
                profileCommonNodesIterator.MoveNext();
                _profileCommon = new Profile_COMMON(profileCommonNodesIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (_id != null) { writer.WriteAttributeString(id, _id); }
            if (_name != null) { writer.WriteAttributeString(name, _name); }
            if (_profileCommon != null) { _profileCommon.Save(writer); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// The <profile_COMMON> elements encapsulate all the values and declarations for a platform-independent
    /// fixed-function shader. All platforms are required to support <profile_COMMON>. <profile_COMMON>
    /// effects are designed to be used as the reliable fallback when no other profile is recognized by the current
    /// effects runtime.
    /// For more information, see “Using Profiles for Platform-Specific Effects” in Chapter 7: Getting Started with
    /// FX.
    /// </summary>
    public class Profile_COMMON
    {
        public const string root = "profile_COMMON";

        Technique _technique;
        public Technique Technique { get { return _technique; } }

        XmlColladaList _newParamList;

        public Profile_COMMON(Technique technique, XmlColladaList newParamList)
        {
            _technique = technique;
            _newParamList = newParamList;
            if (null == _newParamList)
            {
                _newParamList = new XmlColladaList();
            }
        }

        public Profile_COMMON(XPathNodeIterator iterator, string uri)
        {
            _newParamList = new XmlColladaList();

            XPathNodeIterator nodesIterator = iterator.Current.SelectChildren(XmlCollada.Technique.root, uri);
            if (nodesIterator.Count > 0)
            {
                nodesIterator.MoveNext();
                _technique = new Technique(nodesIterator, uri);
            }

            nodesIterator = iterator.Current.SelectChildren(XmlCollada.NewParam.root, uri);
            while (nodesIterator.MoveNext())
            {
                _newParamList.Add(new NewParam(nodesIterator, uri));
            }
        }

        public NewParam GetNewParam(string sid)
        {
            for (int i=0; i < _newParamList.Count; i++)
            {
                NewParam np = (NewParam)_newParamList.GetAt(i);
                if (np.SID == sid) {
                    return np;
                }
            }
            return null;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            for (int i = 0; i < _newParamList.Count; i++)
            {
                NewParam np = (NewParam)_newParamList.GetAt(i);
                np.Save(writer);
            }
            if (_technique != null) { _technique.Save(writer); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// Parameters are typed data objects that are available to compilers and functions at run time.
    /// In FX, the parameter is created in the FX runtime and can have additional attributes assigned at declaration
    /// time.
    /// In Kinematics, a parameter provide saccess to specific properties of instantiated kinematics objects.
    /// </summary>
    public class NewParam
    {
        public const string root = "newparam";
        public const string sid = "sid";
        public const string sampler2D = "sampler2D";
        public const string surface = "surface";

        Sampler2D _sampler2D;
        public Sampler2D Sampler2D { get { return _sampler2D; } }

        Surface _surface;
        public Surface Surface { get { return _surface; } }

        /// <summary>
        /// Identifier for this parameter (that is, the variable name). Required. For details, see
        /// “Address Syntax” in Chapter 3: Schema Concepts.
        /// </summary>
        string _sid;
        public string SID { get { return _sid; } }

        public NewParam(Sampler2D sampler2D, Surface surface, string sid)
        {
            _sampler2D = sampler2D;
            _surface = surface;
            _sid = sid;
        }

        public NewParam(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.NewParam.sid);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _sid = attributeIterator.Current.Value;
            }

            XPathNodeIterator nodesIterator = iterator.Current.SelectChildren(XmlCollada.NewParam.sampler2D, uri);
            if (nodesIterator.MoveNext())
            {
                _sampler2D = new Sampler2D(nodesIterator, uri);
            }

            nodesIterator = iterator.Current.SelectChildren(XmlCollada.NewParam.surface, uri);
            if (nodesIterator.MoveNext())
            {
                _surface = new Surface(nodesIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (_sid != null) { writer.WriteAttributeString(sid, _sid); }
            if (null != _surface) { _surface.Save(writer); }
            if (null != _sampler2D) { _sampler2D.Save(writer); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// Declares a two-dimensional texture sampler.
    /// </summary>
    public class Sampler2D : Fx_sampler_common
    {
        public override string root { get { return "sampler2D"; } }
        
        public Sampler2D(Source source, MinFilter minfilter, MagFilter magfilter) : base(source, minfilter, magfilter)
        {
        }

        public Sampler2D(XPathNodeIterator iterator, string uri) : base(iterator, uri)
        {

        }
    }

    /// <summary>
    /// A technique describes information needed by a specific platform or program. The platform or program is
    /// specified with the profile attribute. Each technique conforms to an associated profile. Two things define
    /// the context for a technique: its profile and its parent element in the instance document.
    /// Techniques generally act as a “switch”. If more than one is present for a particular portion of content on
    /// import, one or the other is picked, but usually not both. Selection should be based on which profile the
    /// importing application can support.
    /// Techniques contain application data and programs, making them assets that can be managed as a unit.
    /// </summary>
    public class Technique
    {
        public const string root = "technique";
        public const string phong = "phong";
        public const string lambert = "lambert";
        public const string blinn = "blinn";
        public const string sid = "sid";

        string _sid;
        public string SID { get { return _sid; } }

        XmlShaderElement _shader = null;
        public XmlShaderElement Shader { get { return _shader; } }

        public Technique(string sid, XmlShaderElement shader)
        {
            _sid = sid;
            _shader = shader;
        }

        public Technique(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Technique.sid);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _sid = attributeIterator.Current.Value;
            }

            XPathNodeIterator shaderElementIterator = iterator.Current.SelectChildren(phong, uri);
            if (null == _shader) 
            {
                if (shaderElementIterator.Count > 0)
                {
                    shaderElementIterator.MoveNext();
                    _shader = new Phong(shaderElementIterator, uri);
                }
            }
            if (null == _shader)
            {
                shaderElementIterator = iterator.Current.SelectChildren(lambert, uri);
                if (shaderElementIterator.Count > 0)
                {
                    shaderElementIterator.MoveNext();
                    _shader = new Lambert(shaderElementIterator, uri);
                }
            }
            if (null == _shader)
            {
                shaderElementIterator = iterator.Current.SelectChildren(blinn, uri);
                if (shaderElementIterator.Count > 0)
                {
                    shaderElementIterator.MoveNext();
                    _shader = new Blinn(shaderElementIterator, uri);
                }
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _sid) { writer.WriteAttributeString(sid, _sid); }
            if (null != _shader) { _shader.Save(writer); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// Used inside a <profile_COMMON> effect, declares a fixed-function pipeline that produces a specularly
    /// shaded surface that reflects ambient, diffuse, and specular reflection, where the specular reflection is
    /// shaded according the Phong BRDF approximation.
    /// The <phong> shader uses the common Phong shading equation, that is:
    /// where:
    /// • al – A constant amount of ambient light contribution coming from the scene. In the COMMON
    /// profile, this is the sum of all the <light><technique_common><ambient><color> values in
    /// the <visual_scene>.
    /// • N – Normal vector
    /// • L – Light vector
    /// • I – Eye vector
    /// • R – Perfect reflection vector (reflect (L around N))
    /// </summary>
    public class Phong : XmlShaderElement
    {
        public override string root { get { return "phong"; } }

        public Phong(XmlColladaList fxList) : base(fxList)
        {
        }

        public Phong(XPathNodeIterator iterator, string uri) : base(iterator, uri)
        {
        }
    }

    /// <summary>
    /// Used inside a <profile_COMMON> effect, declares a fixed-function pipeline that produces a diffuse
    /// shaded surface that is independent of lighting.
    /// The result is based on Lambert’s Law, which states that when light hits a rough surface, the light is
    /// reflected in all directions equally. The reflected color is calculated simply as:
    /// where:
    /// • al – A constant amount of ambient light contribution coming from the scene. In the COMMON
    /// profile, this is the sum of all the <light><technique_common><ambient><color> values in
    /// the <visual_scene>.
    /// • N – Normal vector
    /// • L – Light vector
    /// </summary>
    public class Lambert : XmlShaderElement
    {
        public override string root { get { return "lambert"; } }

        public Lambert(XmlColladaList fxList) : base(fxList)
        {
        }

        public Lambert(XPathNodeIterator iterator, string uri) : base(iterator, uri)
        {

        }
    }

    /// <summary>
    /// Used inside a <profile_COMMON> effect, <blinn> declares a fixed-function pipeline that produces a 
    /// shaded surface according to the Blinn-Torrance-Sparrow lighting model or a close approximation.
    /// </summary>
    public class Blinn : XmlShaderElement
    {
        public override string root { get { return "blinn"; } }

        public Blinn(XmlColladaList fxList) : base(fxList)
        {
        }

        public Blinn(XPathNodeIterator iterator, string uri)
            : base(iterator, uri)
        {

        }
    }

    /// <summary>
    /// The <geometry> element categorizes the declaration of geometric information. Geometry is a branch of
    /// mathematics that deals with the measurement, properties, and relationships of points, lines, angles,
    /// surfaces, and solids. The <geometry> element contains a declaration of a mesh, convex mesh, or spline.
    /// There are many forms of geometric description. Computer graphics hardware has been normalized,
    /// primarily, to accept vertex position information with varying degrees of attribution (color, normals, etc.).
    /// Geometric descriptions provide this vertex data with relative directness or efficiency. Some of the more
    /// common forms of geometry are:
    /// • B-Spline
    /// • Bézier
    /// • Mesh
    /// • NURBS
    /// • Patch
    /// This is by no means an exhaustive list. Currently, COLLADA supports only polygonal meshes and splines.
    /// </summary>
    public class Geometry
    {
        public const string root = "geometry";
        public const string mesh = "mesh";
        public const string name = "name";
        public const string id = "id";

        /// <summary>
        /// A text string containing the unique identifier of the <geometry> element. This
        /// value must be unique within the instance document. Optional.
        /// </summary>
        string _id;
        public string ID { get { return _id; } }

        /// <summary>
        /// A text string containing the name of this element. Optional.
        /// </summary>
        string _name;
        public string Name { get { return _name; } }

        Mesh _mesh;

        public Mesh Mesh { get { return _mesh; } }

        public Geometry(string id, string name, Mesh mesh)
        {
            _id = id;
            _name = name;
            _mesh = mesh;
        }

        public Geometry(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Geometry.id);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _id = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Geometry.name);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _name = attributeIterator.Current.Value;
            }

            XPathNodeIterator meshNodesIterator = iterator.Current.SelectChildren(XmlCollada.Mesh.root, uri);
            if (meshNodesIterator.MoveNext())
            {
                _mesh = new Mesh(meshNodesIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _id) { writer.WriteAttributeString(id, _id); }
            if (null != _name) { writer.WriteAttributeString(name, _name); }
            if (null != _mesh) { _mesh.Save(writer); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// Meshes embody a general form of geometric description that primarily includes vertex and primitive
    /// information.
    /// Vertex information is the set of attributes associated with a point on the surface of the mesh. Each vertex
    /// includes data for attributes such as:
    /// • Vertex position
    /// • Vertex color
    /// • Vertex normal
    /// • Vertex texture coordinate
    /// The mesh also includes a description of how the vertices are organized to form the geometric shape of the
    /// mesh. The mesh vertices are collated into geometric primitives such as polygons, triangles, or lines.
    /// </summary>
    public class Mesh
    {
        public const string root = "mesh";
        public const string source = "source";
        public const string vertices = "vertices";
        public const string polylist = "polylist";
        public const string triangles = "triangles";

        XmlColladaList _sources;
        Vertices _vertices;
        XmlColladaList _geometries;

        public Vertices Vertices { get { return _vertices; } }
        public XmlColladaList GetXmlGeometries() { return _geometries; }

        public Mesh(XmlColladaList sources, Vertices vertices, XmlColladaList geometries)
        {
            _sources = sources;
            if (null == _sources)
            {
                _sources = new XmlColladaList();
            }
            _vertices = vertices;
            _geometries = geometries;
            if (null == _geometries)
            {
                _geometries = new XmlColladaList();
            }
        }

        public Mesh(XPathNodeIterator iterator, string uri)
        {
            _sources = new XmlColladaList();
            XPathNodeIterator sourceNodesIterator = iterator.Current.SelectChildren(XmlCollada.Source.root, uri);
            while (sourceNodesIterator.MoveNext())
            {
                _sources.Add(new Source(sourceNodesIterator, uri));
            }

            XPathNodeIterator verticesNodesIterator = iterator.Current.SelectChildren(XmlCollada.Vertices.root, uri);
            if (verticesNodesIterator.MoveNext())
            {
                _vertices = new Vertices(verticesNodesIterator, uri);
            }

            _geometries = new XmlColladaList();
            XPathNodeIterator polylistsNodesIterator = iterator.Current.SelectChildren(polylist, uri);
            while (polylistsNodesIterator.MoveNext())
            {
                _geometries.Add(new PolyList(polylistsNodesIterator, uri));
            }

            XPathNodeIterator trianglesNodesIterator = iterator.Current.SelectChildren(triangles, uri);
            while (trianglesNodesIterator.MoveNext())
            {
                _geometries.Add(new Triangles(trianglesNodesIterator, uri));
            }
        }

        /// <summary>
        /// Returns a source given the source's ID
        /// </summary>
        /// <param name="sourceID">The source's ID</param>
        /// <returns>The source object</returns>
        public XmlCollada.Source GetSource(string sourceID)
        {
            for (int i = 0; i < _sources.Count; i++)
            {
                XmlCollada.Source source = (XmlCollada.Source)_sources.GetAt(i);
                if (source.ID == sourceID)
                {
                    return source;
                }
            }
            return null;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            for (int i = 0; i < _sources.Count; i++)
            {
                XmlCollada.Source source = (XmlCollada.Source)_sources.GetAt(i);
                source.Save(writer);
            }
            if (null != _vertices) { _vertices.Save(writer); }
            for (int i = 0; i < _geometries.Count; i++)
            {
                XmlCollada.XmlGeometry geometry = (XmlCollada.XmlGeometry)_geometries.GetAt(i);
                geometry.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// A data source is a well-known source of information that can be accessed through an established
    /// communication channel.
    /// The data source provides access methods to the information. These access methods implement various
    /// techniques according to the representation of the information. The information may be stored locally as an
    /// array of data or a program that generates the data.
    /// </summary>
    public class Source
    {
        public const string root = "source";
        public const string id = "id";
        public const string name = "name";

        /// <summary>
        /// A text string containing the unique identifier of the element. This value must be unique
        /// within the instance document. Required.
        /// </summary>
        string _id;
        public string ID { get { return _id; } }

        /// <summary>
        /// The text string name of this element. Optional.
        /// </summary>
        string _name;
        public string Name { get { return _name; } }

        Technique_Common _techniqueCommon;
        public Technique_Common Technique_Common { get { return _techniqueCommon; } }

        Float_Array _floatArray;
        public Float_Array Float_Array { get { return _floatArray; } }

        string _value;
        public string Value { get { return _value; } }

        public Source(string id, string name, Technique_Common techniqueCommon, Float_Array floatArray, string value)
        {
            _id = id;
            _name = name;
            _techniqueCommon = techniqueCommon;
            _floatArray = floatArray;
            _value = value;
        }

        public Source(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Source.id);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _id = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Source.name);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _name = attributeIterator.Current.Value;
            }

            XPathNodeIterator float_arrayNodesIterator = iterator.Current.SelectChildren(XmlCollada.Float_Array.root, uri);
            if (float_arrayNodesIterator.MoveNext())
            {
                _floatArray = new Float_Array(float_arrayNodesIterator, uri);
            }

            XPathNodeIterator technique_commonNodesIterator = iterator.Current.SelectChildren(XmlCollada.Technique_Common.root, uri);
            if (technique_commonNodesIterator.MoveNext())
            {
                _techniqueCommon = new Technique_Common(technique_commonNodesIterator, uri);
            }

            _value = iterator.Current.Value;
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _id) { writer.WriteAttributeString(id, _id); }
            if (null != _name) { writer.WriteAttributeString(name, _name); }
            if (null != _floatArray) { _floatArray.Save(writer); }
            if (null != _techniqueCommon) { _techniqueCommon.Save(writer); }
            if (null != _value) { writer.WriteString(_value); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// The <float_array> element stores the data values for generic use within the COLLADA schema. The
    /// arrays themselves are strongly typed but without semantics. They simply describe a sequence of floatingpoint
    /// values.
    /// </summary>
    public class Float_Array
    {
        public const string root = "float_array";
        public const string id = "id";
        public const string count = "count";

        /// <summary>
        /// A text string containing the unique identifier of this element. This value must be
        /// unique within the instance document. Optional.
        /// </summary>
        string _id;
        public string ID { get { return _id; } }

        /// <summary>
        /// The number of values in the array. Required.
        /// </summary>
        int _count;
        public int Count { get { return _count; } }

        float[] _values;
        public float[] Values { get { return _values; } }

        public Float_Array(string id, int count, float[] values)
        {
            _id = id;
            _count = count;
            _values = values;
        }

        public Float_Array(XPathNodeIterator iterator, string uri)
        {
            _count = 0;

            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Float_Array.id);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _id = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Float_Array.count);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _count = Convert.ToInt32(attributeIterator.Current.Value);
            }
            if (this.Count > 0)
            {
                string value = iterator.Current.Value;
                string[] valueArray = value.Split(' ');
                if (valueArray.Length == this.Count) 
                {
                    _values = new float[this.Count];
                    int idx = 0;
                    foreach (string s in valueArray)
                    {
                        Values[idx++] = Convert.ToSingle(s);
                    }
                }
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _id) { writer.WriteAttributeString(id, _id); }
            writer.WriteAttributeString(count, _count.ToString());
            string valueString = "";
            for (int i = 0; i < _values.Length; i++)
            {
                valueString += _values[i] + " ";
            }
            valueString = valueString.TrimEnd();
            writer.WriteString(valueString);
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// Specifies technique information that consuming applications can use if no technique specific to the
    /// application is provided in the COLLADA document.
    /// In other words, if an element has <technique> child elements for one or more specific profiles,
    /// applications reading the COLLADA document should use the technique most appropriate for the
    /// application. If none of the specific <technique>s is appropriate, the application must use the element’s
    /// <technique_common> instead, if one is specified.
    /// Each element’s <technique_common> attributes and children are unique. Refer to each parent element
    /// for details.
    /// </summary>
    public class Technique_Common
    {
        public const string root = "technique_common";

        Instance_Material _instanceMaterial;
        public Instance_Material Instance_Material { get { return _instanceMaterial; } }

        Accessor _accessor;
        public Accessor Accessor { get { return _accessor; } }

        public Technique_Common(Instance_Material instanceMaterial, Accessor accessor)
        {
            _instanceMaterial = instanceMaterial;
            _accessor = accessor;
        }

        public Technique_Common(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator accessorNodesIterator = iterator.Current.SelectChildren(XmlCollada.Accessor.root, uri);
            if (accessorNodesIterator.MoveNext())
            {
                _accessor = new Accessor(accessorNodesIterator, uri);
            }

            XPathNodeIterator instanceMaterialNodesIterator = iterator.Current.SelectChildren(XmlCollada.Instance_Material.root, uri);
            if (instanceMaterialNodesIterator.MoveNext())
            {
                _instanceMaterial = new Instance_Material(instanceMaterialNodesIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _instanceMaterial) { _instanceMaterial.Save(writer); }
            if (null != _accessor) { _accessor.Save(writer); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// An effect defines the equations necessary for the visual appearance of geometry and screen-space image
    /// processing. A material instantiates an effect, fills its parameters with values, and selects a technique. A
    /// material instance connects the material to geometry or scene items.
    /// For details about instance elements in COLLADA, see “Instantiation and External Referencing” in
    /// Chapter 3: Schema Concepts.
    /// To use a material, it is instantiated and attached to the geometry. The symbol attribute of
    /// <instance_material> indicates to which geometry the material is attached and the target attribute
    /// references the material that it is instantiating.
    /// In addition to identifying the section of the geometry to attach to (symbol), this element also defines how
    /// the vertex stream is remapped and how scene objects are bound to material effect parameters. These are
    /// the connections that can be done only very late and that depend on the scene geometry to which it is
    /// being connected.
    /// <bind> connects a parameter in the material’s effect by semantic to a target in the scene.
    /// <bind_vertex_input> connects a vertex shader’s vertex stream semantics (for example, TEXCOORD2)
    /// to the geometry’s vertex input stream specified by the input_semantic and input_set attributes.
    /// </summary>
    public class Instance_Material
    {
        public const string root = "instance_material";
        public const string target = "target";
        public const string symbol = "symbol";

        /// <summary>
        /// The URI of the location of the <material> element to instantiate. Required. Can
        /// refer to a local instance or external reference.
        /// For a local instance, this is a relative URI fragment identifier that begins with the “#”
        /// character. The fragment identifier is an XPointer shorthand pointer that consists of the
        /// ID of the element to instantiate.
        /// For an external reference, this is an absolute or relative URL.
        /// </summary>
        string _target;
        public string Target { get { return _target; } }

        /// <summary>
        /// Which symbol defined from within the geometry this material binds to. Required.
        /// </summary>
        string _symbol;
        public string Symbol { get { return _symbol; } }

        public Instance_Material(string target, string symbol)
        {
            _target = target;
            _symbol = symbol;
        }

        public Instance_Material(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Instance_Material.symbol);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _symbol = attributeIterator.Current.Value;
            }

            attributeIterator = iterator.Current.Select("@" + XmlCollada.Instance_Material.target);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _target = attributeIterator.Current.Value;
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _target) { writer.WriteAttributeString(target, _target); }
            if (null != _symbol) { writer.WriteAttributeString(symbol, _symbol); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// The <accessor> element declares an access pattern into one of the array elements <float_array>,
    /// <int_array>, <Name_array>, <bool_array>, and <IDREF_array> or into an external array
    /// source. The arrays can be organized in either an interleaved or noninterleaved manner, depending on the
    /// offset and stride attributes.
    /// The output of the accessor is described by its child <param> elements.
    /// </summary>
    public class Accessor
    {
        public const string root = "accessor";
        public const string count = "count";
        public const string offset = "offset";
        public const string source = "source";
        public const string stride = "stride";

        /// <summary>
        /// The number of times the array is accessed. Required.
        /// </summary>
        int _count;
        public int Count { get { return _count; } }

        /// <summary>
        /// The index of the first value to be read from the array. The default is 0. Optional.
        /// </summary>
        int _offset;
        public int Offset { get { return _offset; } }

        /// <summary>
        /// The location of the array to access using a URI expression. Required. This element may
        /// refer to a COLLADA array element or to an array data source outside the scope of the
        /// instance document; the source does not need to be a COLLADA document.
        /// </summary>
        string _source;
        public string Source { get { return _source; } }

        /// <summary>
        /// The number of values that are to be considered a unit during each access to the array.
        /// The default is 1, indicating that a single value is accessed. Optional
        /// </summary>
        int _stride;
        public int Stride { get { return _stride; } }

        XmlColladaList _paramsList;
        public XmlColladaList GetParamsList() { return _paramsList; }

        public Accessor(int count, int offset, string source, int stride, XmlColladaList paramsList)
        {
            _count = count;
            _offset = offset;
            _source = source;
            _stride = stride;
            _paramsList = paramsList;
            if (null == _paramsList)
            {
                _paramsList = new XmlColladaList();
            }
        }

        public Accessor(XPathNodeIterator iterator, string uri)
        {
            _count = 0;
            _offset = 0;
            _stride = 1;

            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Accessor.count);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _count = Convert.ToInt32(attributeIterator.Current.Value);
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Accessor.offset);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _offset = Convert.ToInt32(attributeIterator.Current.Value);
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Accessor.source);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _source = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Accessor.stride);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _stride = Convert.ToInt32(attributeIterator.Current.Value);
            }

            _paramsList = new XmlColladaList();
            XPathNodeIterator paramsNodesIterator = iterator.Current.SelectChildren(XmlCollada.Param.root, uri);
            while (paramsNodesIterator.MoveNext())
            {
                _paramsList.Add(new Param(paramsNodesIterator, uri));
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            writer.WriteAttributeString(count, _count.ToString()); 
            writer.WriteAttributeString(offset, _offset.ToString());
            if (null != _source) { writer.WriteAttributeString(source, _source); }
            writer.WriteAttributeString(stride, _stride.ToString());

            for (int i = 0; i < _paramsList.Count; i++)
            {
                Param param = (Param)_paramsList.GetAt(i);
                param.Save(writer);
            }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// A functional or programmatical format requires a means for users to specify parametric information. This
    /// information represents function parameter (argument) data.
    /// Material shader programs may contain code representing vertex or pixel programs. These programs require
    /// parameters as part of their state information.
    /// The basic declaration of a parameter describes the name, data type, and value data of the parameter. That
    /// parameter name identifies it to the function or program. The parameter type indicates the encoding of its
    /// value. The <param> element contains information of type xs:string, which is the parameter’s actual
    /// value.
    /// </summary>
    public class Param
    {
        public const string root = "param";
        public const string name = "name";
        public const string type = "type";
        public const string semantic = "semantic";

        /// <summary>
        /// The text string name of this element. Optional.
        /// </summary>
        string _name;
        public string Name { get { return _name; } }

        /// <summary>
        /// The type of the value data. This text string must be understood by the application. Required.
        /// </summary>
        string _type;
        public string Type { get { return _type; } }

        /// <summary>
        /// The user-defined meaning of the parameter. Optional.
        /// </summary>
        string _semantic;
        public string Semantic { get { return _semantic; } }

        public Param(string name, string type, string semantic)
        {
            _name = name;
            _type = type;
            _semantic = semantic;
        }

        public Param(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Param.name);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _name = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Param.type);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _type = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Param.semantic);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _semantic = attributeIterator.Current.Value;
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _name) { writer.WriteAttributeString(name, _name); }
            if (null != _type) { writer.WriteAttributeString(type, _type); }
            if (null != _semantic) { writer.WriteAttributeString(semantic, _semantic); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// The <vertices> element describes mesh-vertices in a mesh. The mesh-vertices represent the position
    /// (identity) of the vertices comprising the mesh and other vertex attributes that are invariant to tessellation.
    /// </summary>
    public class Vertices
    {
        public const string root = "vertices";
        public const string id = "id";

        /// <summary>
        /// A text string containing the unique identifier of the element. This value must be unique
        /// within the instance document. Required.
        /// </summary>
        string _id;
        public string ID { get { return _id; } }

        XmlCollada.Input _input;
        public XmlCollada.Input Input { get { return _input; } }

        public Vertices(string id, Input input)
        {
            _id = id;
            _input = input;
        }

        public Vertices(XPathNodeIterator iterator, string uri)
        {
            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Vertices.id);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _id = attributeIterator.Current.Value;
            }

            XPathNodeIterator inputNodesIterator = iterator.Current.SelectChildren(XmlCollada.Input.root, uri);
            if (inputNodesIterator.MoveNext())
            {
                _input = new Input(inputNodesIterator, uri);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            if (null != _id) { writer.WriteAttributeString(id, _id); }
            if (null != _input) { _input.Save(writer); }
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// The <input> element declares the input connections to a data source that a consumer requires. A data
    /// source is a container of raw data that lacks semantic meaning so that the data can be reused within the
    /// document. To use the data, a consumer declares a connection to it with the desired semantic information.
    /// The <source> and <input> elements are part of the COLLADA dataflow model. This model is also
    /// known as stream processing, pipe, or producer-consumer. An input connection is the dataflow path from a
    /// <source> to a sink (the dataflow consumers, which are <input>’s parents, such as <polylist>).
    /// In COLLADA, all inputs are driven by index values. A consumer samples an input by supplying an index
    /// value to an input. Some consumers have multiple inputs that can share the same index values. Inputs that
    /// have the same offset attribute value are driven by the same index value from the consumer. This is an
    /// optimization that reduces the total number of indexes that the consumer must store. These inputs are
    /// described in this section as shared inputs but otherwise operate in the same manner as unshared inputs.
    /// </summary>
    public class Input
    {
        public const string root = "input";
        public const string offset = "offset";
        public const string semantic = "semantic";
        public const string source = "source";
        public const string set = "set";

        /// <summary>
        /// The offset into the list of indices defined by the parent element’s <p> or
        /// <v> subelement. If two <input> elements share the same offset, they are
        /// indexed the same. This is a simple form of compression for the list of
        /// indices and also defines the order in which the inputs are used. Required
        /// </summary>
        int _offset;
        public int Offset { get { return _offset; } }

        /// <summary>
        /// The user-defined meaning of the input connection. Required. See “Details”
        /// for the list of common <input> semantic attribute values enumerated in
        /// the COLLADA schema.
        /// </summary>
        string _semantic;
        public string Semantic { get { return _semantic; } }

        /// <summary>
        /// The location of the data source. Required.
        /// </summary>
        string _source;
        public string Source { get { return _source; } }

        /// <summary>
        /// Which inputs to group as a single set. This is helpful when multiple inputs
        /// share the same semantics. Optional.
        /// </summary>
        int _set;
        public int Set { get { return _set; } }

        public Input(int offset, string semantic, string source, int set)
        {
            _offset = offset;
            _semantic = semantic;
            _source = source;
            _set = set;
        }

        public Input(XPathNodeIterator iterator, string uri)
        {
            _offset = 0;
            _set = 0;

            XPathNodeIterator attributeIterator;
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Input.offset);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _offset = Convert.ToInt32(attributeIterator.Current.Value);
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Input.semantic);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _semantic = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Input.source);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _source = attributeIterator.Current.Value;
            }
            attributeIterator = iterator.Current.Select("@" + XmlCollada.Input.set);
            if (attributeIterator.Count > 0)
            {
                attributeIterator.MoveNext();
                _set = Convert.ToInt32(attributeIterator.Current.Value);
            }
        }

        public void Save(XmlTextWriter writer)
        {
            writer.WriteStartElement(root);
            writer.WriteAttributeString(offset, _offset.ToString());
            if (null != _semantic) { writer.WriteAttributeString(semantic, _semantic); }
            if (null != _source) { writer.WriteAttributeString(source, _source); }
            writer.WriteAttributeString(set, _set.ToString());
            writer.WriteEndElement();
        }
    }

    /// <summary>
    /// The <polylist> element declares the binding of geometric primitives and vertex attributes for a <mesh>
    /// element.
    /// The vertex array information is supplied in distinct attribute arrays of the <mesh> element that are then
    /// indexed by the <polylist> element.
    /// The polygons described in <polylist> can contain an arbitrary numbers of vertices. Polylist primitives
    /// that contain four or more vertices may be nonplanar as well.
    /// Many operations need an exact orientation of a surface point. The normal vector partially defines this
    /// orientation, but it is still leaves the “rotation” about the normal itself ambiguous. One way to “lock down”
    /// this extra rotation is to also specify the surface tangent at the same point.
    /// Assuming that the type of the coordinate system is known (for example, right-handed), this fully specifies
    /// the orientation of the surface, meaning that we can define a 3x3 matrix to transforms between objectspace
    /// and surface space.
    /// The tangent and the normal specify two axes of the surface coordinate system (two columns of the matrix)
    /// and the third one, called binormal may be computed as the cross-product of the tangent and the normal.
    /// COLLADA supports two different types of tangents, because they have different applications and different
    /// logical placements in a document:
    /// • Texture-space tangents: specified with the TEXTANGENT and TEXBINORMAL semantics and the
    /// set attribute on the <input> (shared) elements
    /// • Standard (geometric) tangents: specified with the TANGENT and BINORMAL semantics on the
    /// <input> (shared) elements.
    /// </summary>
    public class PolyList : XmlGeometry
    {
        public override string root { get { return "polylist"; } }

        public PolyList(XPathNodeIterator iterator, string uri) : base(iterator, uri)
        {
        }
    }

    /// <summary>
    /// The <triangles> element declares the binding of geometric primitives and vertex attributes for a
    /// <mesh> element.
    /// The vertex array information is supplied in distinct attribute arrays that are then indexed by the
    /// <triangles> element.
    /// Each triangle described by the mesh has three vertices. The first triangle is formed from the first, second,
    /// and third vertices. The second triangle is formed from the fourth, fifth, and sixth vertices, and so on.
    /// </summary>
    public class Triangles : XmlGeometry
    {
        public override string root { get { return "triangles"; } }

        public Triangles(int count, string material, XmlColladaList inputs, int[] p)
            : base(count, material, inputs, null, p)
        {
        }

        public Triangles(XPathNodeIterator iterator, string uri) : base(iterator, uri)
        {
        }

    }
}


