module.exports = {
  rgbToHsl: function (color) {
    !color && (color = {r: 0, g: 0, b: 0});

    var
      r = color.r / 255,
      g = color.g / 255,
      b = color.b / 255,
      max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      h, s, l = (max + min) / 2;

    if (max == min){
        h = s = 0; // achromatic
    }
    else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  },

  rgbToHsv: function rgb2hsv (color) {
    var r = color.r;
    var g = color.g;
    var b = color.b;

    var computedH = 0;
    var computedS = 0;
    var computedV = 0;

    //remove spaces from input RGB values, convert to int
    var r = parseInt( r,10 );
    var g = parseInt( g,10 );
    var b = parseInt( b,10 );

    if ( r==null || g==null || b==null ||
        isNaN(r) || isNaN(g)|| isNaN(b) ) {
      return;
    }
    if (r<0 || g<0 || b<0 || r>255 || g>255 || b>255) {
      return;
    }
    r=r/255; g=g/255; b=b/255;
    var minRGB = Math.min(r,Math.min(g,b));
    var maxRGB = Math.max(r,Math.max(g,b));

    // Black-gray-white
    if (minRGB==maxRGB) {
     computedV = minRGB;
     return [0,0,computedV];
    }

    // Colors other than black-gray-white:
    var d = (r==minRGB) ? g-b : ((b==minRGB) ? r-g : b-r);
    var h = (r==minRGB) ? 3 : ((b==minRGB) ? 1 : 5);
    computedH = 60*(h - d/(maxRGB - minRGB));
    computedS = (maxRGB - minRGB)/maxRGB;
    computedV = maxRGB;
    return {h:parseInt(computedH,10),s:parseInt(computedS * 100,10),v:parseInt(computedV * 100,10)};
   }
};
