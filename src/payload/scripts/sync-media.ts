/**
 * Copies media uploaded while S3 wasn't configured (saved to ./media, which
 * the live site can't see) into Supabase Storage. Each media record is
 * re-saved with its local file, so the storage plugin uploads it and its
 * image sizes; record ids stay the same, so products keep their photos.
 * Records whose file isn't in ./media are skipped. Safe to run again.
 *
 *   pnpm media:sync
 *
 * Needs the S3_* env vars (the same ones as on Vercel) in .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import { getPayload } from "payload";
import config from "../../payload.config";
import { s3Storage } from "../env";

if (!s3Storage) {
  console.error(
    "S3 storage isn't configured. Add the five S3_* values from Vercel to .env.local, then run this again.",
  );
  process.exit(1);
}

const payload = await getPayload({ config });
const dir = path.resolve(process.cwd(), "media");

const { docs } = await payload.find({
  collection: "media",
  limit: 0,
  pagination: false,
  depth: 0,
});

let uploaded = 0;
let skipped = 0;
for (const doc of docs) {
  const filePath = doc.filename ? path.join(dir, doc.filename) : null;
  if (!filePath || !fs.existsSync(filePath)) {
    skipped++;
    continue;
  }
  await payload.update({
    collection: "media",
    id: doc.id,
    data: {},
    filePath,
    overwriteExistingFiles: true,
  });
  uploaded++;
  console.log(`Uploaded ${doc.filename}`);
}

console.log(
  `Done: ${uploaded} uploaded to "${s3Storage.bucket}", ${skipped} skipped (not in ./media).`,
);
process.exit(0);
