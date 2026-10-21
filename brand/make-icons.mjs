// Renders the app icons used by the website (PWA) and the Android app from brand/leaf.svg.
// Run with: node brand/make-icons.mjs
import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";

const leaf = readFileSync(new URL("./leaf.svg", import.meta.url), "utf8");
const inner = leaf.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const GREEN = "#20593b";

// scale = how much of the canvas the leaf fills; round = rounded-square corners
function svg({ size, scale, round, background = GREEN }) {
  const s = (size * scale) / 512;
  const offset = (size - 512 * s) / 2;
  const bg = background ? `<rect width="${size}" height="${size}" rx="${round ? size * 0.22 : 0}" fill="${background}"/>` : "";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${bg}<g transform="translate(${offset} ${offset}) scale(${s})">${inner}</g></svg>`);
}

const out = (p) => new URL(`../${p}`, import.meta.url).pathname;
mkdirSync(out("public/icons"), { recursive: true });
mkdirSync(out("mobile/assets"), { recursive: true });

const jobs = [
  // Website / PWA
  ["public/icons/icon-192.png", svg({ size: 192, scale: 0.8, round: true })],
  ["public/icons/icon-512.png", svg({ size: 512, scale: 0.8, round: true })],
  ["public/icons/maskable-512.png", svg({ size: 512, scale: 0.6, round: false })],
  ["src/app/icon.png", svg({ size: 512, scale: 0.8, round: true })],
  ["src/app/apple-icon.png", svg({ size: 180, scale: 0.7, round: false })],
  // Android sources for @capacitor/assets
  ["mobile/assets/icon-only.png", svg({ size: 1024, scale: 0.62, round: false })],
  ["mobile/assets/icon-foreground.png", svg({ size: 1024, scale: 0.5, round: false, background: null })],
  ["mobile/assets/icon-background.png", Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${GREEN}"/></svg>`)],
  ["mobile/assets/splash.png", svg({ size: 2732, scale: 0.22, round: false })],
  ["mobile/assets/splash-dark.png", svg({ size: 2732, scale: 0.22, round: false, background: "#0b2117" })],
];
for (const [path, buf] of jobs) {
  await sharp(buf).png().toFile(out(path));
  console.log("wrote", path);
}
