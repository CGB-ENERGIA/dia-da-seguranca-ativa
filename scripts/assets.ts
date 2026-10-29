/** Gera logo branco (para fundos escuros / carimbo) e ícones do PWA a partir de public/logo-cgb.png */
import sharp from "sharp";

const src = "public/logo-cgb.png";
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const branco = Buffer.from(data);
for (let i = 0; i < branco.length; i += 4) {
  const [r, g, b] = [branco[i], branco[i + 1], branco[i + 2]];
  const cinza = Math.abs(r - g) < 12 && Math.abs(g - b) < 12; // texto "CGB" (cinza) -> branco; losango segue colorido
  if (cinza) { branco[i] = branco[i + 1] = branco[i + 2] = 255; }
}
await sharp(branco, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile("public/logo-cgb-branco.png");

// ícone: losango sobre fundo vinho
const rombo = await sharp(src).extract({ left: 0, top: 0, width: 400, height: 596 }).trim().toBuffer();
for (const s of [192, 512]) {
  const inner = Math.round(s * 0.56);
  const m = await sharp(rombo).resize({ width: inner, height: inner, fit: "inside" }).toBuffer();
  await sharp({ create: { width: s, height: s, channels: 4, background: "#4a0f1d" } })
    .composite([{ input: m, gravity: "center" }]).png().toFile(`public/icon-${s}.png`);
}
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#4a0f1d" } })
  .composite([{ input: await sharp(rombo).resize({ width: 300, height: 300, fit: "inside" }).toBuffer(), gravity: "center" }])
  .png().toFile("public/icon-maskable-512.png");
console.log("assets ok");
