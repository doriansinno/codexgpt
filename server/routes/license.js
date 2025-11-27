const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

// ADMIN SCHUTZ
function checkAdmin(req, res) {
  if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
    res.status(403).json({ error: "Keine Berechtigung" });
    return false;
  }
  return true;
}

const LICENSE_FILE = path.join(__dirname, "../data/licenses.txt");
const USERS_FILE = path.join(__dirname, "../data/users.txt");

// VARIANTE B FORMAT:
// key;createdAt;expiresAt;active;used;ownerName;activatedAt
function parseLicense(line) {
  const parts = line.trim().split(";");
  if (!parts[0]) return null;

  const [key, createdAt, expiresAt, active, used, ownerName, activatedAt] = [
    parts[0],
    parts[1],
    parts[2],
    parts[3],
    parts[4] ?? "false",
    parts[5] ?? "",
    parts[6] ?? ""
  ];

  return {
    key,
    createdAt,
    expiresAt,
    active: active === "true",
    used: used === "true",
    ownerName,
    activatedAt
  };
}

function serializeLicense(license) {
  return [
    license.key,
    license.createdAt,
    license.expiresAt,
    license.active,
    license.used ? "true" : "false",
    license.ownerName || "",
    license.activatedAt || ""
  ].join(";");
}

async function readLicenses() {
  try {
    const content = await fs.readFile(LICENSE_FILE, "utf8");
    return content
      .split("\n")
      .map(parseLicense)
      .filter(Boolean);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeLicenses(list) {
  const content = list.map(serializeLicense).join("\n");
  await fs.writeFile(LICENSE_FILE, content, "utf8");
}

function generateKey() {
  return crypto.randomBytes(8).toString("hex").match(/.{1,4}/g).join("-");
}

function isExpired(expiresAt) {
  return new Date(expiresAt).getTime() < Date.now();
}

// 🔑 Nur prüfen, ob Lizenz gültig ist – NICHT mehr wegen "used" ablehnen
async function validateLicenseKey(key) {
  const licenses = await readLicenses();
  const lic = licenses.find((l) => l.key === key);

  if (!lic) return { valid: false, message: "Lizenz nicht gefunden" };
  if (!lic.active) return { valid: false, message: "Lizenz deaktiviert" };
  if (isExpired(lic.expiresAt)) return { valid: false, message: "Lizenz abgelaufen" };

  // used bleibt nur Info, NICHT Grund zum Ablehnen
  return { valid: true, license: lic };
}

// ------------------------ ROUTES ------------------------

// Validate – wird von der Extension benutzt, ändert nichts mehr an der Lizenz
router.post("/validate", async (req, res) => {
  try {
    const { key } = req.body;
    const result = await validateLicenseKey(key);
    res.json(result);
  } catch (error) {
    console.error("Validate error", error);
    res.status(500).json({ valid: false, message: "Serverfehler" });
  }
});

// Create (Admin)
router.post("/create", async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const { ownerName } = req.body;
    const durationDays = Number(req.body?.durationDays) || 30;
    const now = new Date();
    const expires = new Date(now.getTime() + durationDays * 86400000);

    const licenses = await readLicenses();
    const newLicense = {
      key: generateKey(),
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      active: true,
      used: false,
      ownerName: ownerName || "",
      activatedAt: ""
    };

    licenses.push(newLicense);
    await writeLicenses(licenses);

    res.json({ message: "Lizenz erstellt", license: newLicense });
  } catch (error) {
    console.error("Create error", error);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// Deactivate (Admin)
router.post("/deactivate", async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const { key } = req.body;
    const licenses = await readLicenses();
    const lic = licenses.find((l) => l.key === key);

    if (!lic) return res.status(404).json({ message: "Lizenz nicht gefunden" });

    lic.active = false;
    await writeLicenses(licenses);

    res.json({ message: "Lizenz deaktiviert" });
  } catch (error) {
    console.error("Deactivate error", error);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// List all (Admin)
router.get("/all", async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const licenses = await readLicenses();
    res.json({ licenses });
  } catch (error) {
    console.error("List error", error);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// Delete (Admin)
router.delete("/:key", async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const { key } = req.params;
    const licenses = await readLicenses();
    const filtered = licenses.filter((l) => l.key !== key);

    if (filtered.length === licenses.length) {
      return res.status(404).json({ message: "Lizenz nicht gefunden" });
    }

    await writeLicenses(filtered);
    res.json({ message: "Lizenz gelöscht" });
  } catch (error) {
    console.error("Delete error", error);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// Users (Admin – optional)
router.get("/users/all", async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const data = await fs.readFile(USERS_FILE, "utf8");
    res.type("text/plain").send(data || "Keine Benutzer gespeichert.");
  } catch (err) {
    console.error("users/all error", err);
    res.status(500).send("Fehler beim Lesen der users.txt");
  }
});

module.exports = { router, validateLicenseKey, readLicenses, writeLicenses };
