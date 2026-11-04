// Makes a new admin key. The key goes to .admin-key (only on this computer); the game gets only its SHA-256 hash, through
// .env.local (VITE_ADMIN_HASH). Open the game once with ?admin=<key> on a device to make it the admin's device.
// Both files are git-ignored. Run again to replace the key (devices that used the old key lose admin).
import { randomBytes, createHash } from "node:crypto";
import { writeFileSync, chmodSync } from "node:fs";
const ABC = "abcdefghjkmnpqrstuvwxyz23456789";
const key = [...randomBytes(20)].map((b) => ABC[b % ABC.length]).join("");
writeFileSync(".admin-key", key + "\n"); chmodSync(".admin-key", 0o600);
writeFileSync(".env.local", `VITE_ADMIN_HASH=${createHash("sha256").update(key).digest("hex")}\n`);
console.log("New admin key saved in .admin-key; the hash is in .env.local. Restart npm run dev (or rebuild) to use it.");
