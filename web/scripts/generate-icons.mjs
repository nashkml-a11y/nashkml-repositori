import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "..", "public");

const jobs = [
  { src: "icon-source.svg", out: "pwa-192.png", size: 192 },
  { src: "icon-source.svg", out: "pwa-512.png", size: 512 },
  { src: "icon-source.svg", out: "apple-touch-icon.png", size: 180 },
  { src: "icon-maskable.svg", out: "pwa-maskable-512.png", size: 512 },
];

for (const job of jobs) {
  await sharp(path.join(here, job.src))
    .resize(job.size, job.size)
    .png()
    .toFile(path.join(publicDir, job.out));
  console.log(`Generado ${job.out}`);
}
