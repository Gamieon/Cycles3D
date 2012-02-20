
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

static public class ColorDirector {
	
	// Convert an HSL value into RGB. Inputs are in the range [0,1] and the 
	// return value is a Unity color object.
	// Source: http://www.geekymonkey.com/Programming/CSharp/RGB2HSL_HSL2RGB.htm
	public static Color HSL2RGB(double h, double sl, double l)
	{
        double v;
        double r,g,b;

        r = l;   // default to gray
        g = l;
        b = l;
        v = (l <= 0.5) ? (l * (1.0 + sl)) : (l + sl - l * sl);
        if (v > 0)
        {
              double m;
              double sv;
              int sextant;
              double fract, vsf, mid1, mid2;

              m = l + l - v;
              sv = (v - m ) / v;
              h *= 6.0;
              sextant = (int)h;
              fract = h - sextant;
              vsf = v * sv * fract;
              mid1 = m + vsf;
              mid2 = v - vsf;
              switch (sextant)
              {
                    case 0:
                          r = v;
                          g = mid1;
                          b = m;
                          break;
                    case 1:
                          r = mid2;
                          g = v;
                          b = m;
                          break;
                    case 2:
                          r = m;
                          g = v;
                          b = mid1;
                          break;
                    case 3:
                          r = m;
                          g = mid2;
                          b = v;
                          break;
                    case 4:
                          r = mid1;
                          g = m;
                          b = v;
                          break;
                    case 5:
                          r = v;
                          g = m;
                          b = mid2;
                          break;
              }
        }
        return new Color((float)r,(float)g,(float)b);
	}
	
	public static Color H2RGB(double h)
	{
		return HSL2RGB(h, 1, 0.5);
	}	
	
	
}
