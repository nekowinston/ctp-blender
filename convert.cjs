const fs = require("fs");
const DeltaE = require("delta-e");
const convert = require("xml-js");
const { variants } = require("@nekowinston/ctp-palette");

// convert RGB ([r,g,b]) -> LAB {L,A,B} for DeltaE comparison
const rgb2lab = (rgb) => {
  let r = rgb[0] / 255,
    g = rgb[1] / 255,
    b = rgb[2] / 255,
    x,
    y,
    z;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

  return {
    L: 116 * y - 16,
    A: 500 * (x - y),
    B: 200 * (y - z),
  };
};

// convert RGB hex string to [r,g,b]
const parseRGBHex = (hex) => {
  const [r, g, b] = hex.match(/[\da-f]{2}/gi).map((x) => parseInt(x, 16));
  return [r, g, b];
};

const generateTheme = ({ variant, source }) => {
  const colors = {};
  Object.keys(variants[variant]).map((color) => {
    const rgb = variants[variant][color].hex;
    const [r, g, b] = parseRGBHex(rgb);
    const lab = rgb2lab([r, g, b]);
    colors[color] = {
      rgb: rgb,
      lab: lab,
    };
  });

  const xml = fs.readFileSync(`./defaults/${source}.xml`, "utf8");
  const parsed = convert.xml2json(xml, {
    compact: false,
    attributeValueFn: (text) => {
      if (typeof text === "string") {
        if (text.match(/#[0-9a-fA-F]{6,8}/g)) {
          let transparency = "";
          if (text.length == 9) {
            transparency = text.substring(7, 9);
          }
          const [r, g, b] = parseRGBHex(text.substring(1, 7));
          const lab1 = rgb2lab([r, g, b]);

          let nearest = Infinity;
          let closest;
          for (const color in colors) {
            const lab2 = colors[color].lab;
            const delta = DeltaE.getDeltaE00(lab1, lab2);
            if (delta < nearest) {
              nearest = delta;
              closest = colors[color].rgb;
            }
          }
          // log(`${text} -> ${closest}`);
          value = `${closest}${transparency}`;
          return value;
        } else {
          return text;
        }
      } else {
        return text;
      }
    },
  });

  const result = convert.json2xml(parsed, { compact: false });
  fs.mkdirSync(`./dist`, { recursive: true });
  fs.writeFileSync(`./dist/Catppuccin_${variant}.xml`, result, "utf8");
};

const colorSchemes = [
  {
    variant: "mocha",
    source: "Dark",
  },
  {
    variant: "macchiato",
    source: "Dark",
  },
  {
    variant: "frappe",
    source: "Dark",
  },
  {
    variant: "latte",
    source: "Light",
  },
];

colorSchemes.map((mapping) => {
  generateTheme(mapping);
});
