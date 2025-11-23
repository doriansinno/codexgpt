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



function parseLicense(line) {
  const [key, createdAt, expiresAt, active] = line.trim().split(";");


  if (!key) return null;
  return { key, createdAt, expiresAt, active: active === "true" };
}

function serializeLicense(license) {
  return `${license.key};${license.createdAt};${license.expiresAt};${license.active}`;
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

async function validateLicenseKey(key) {
  const licenses = await readLicenses();
  const license = licenses.find((l) => l.key === key);
  if (!license) return { valid: false, message: "Lizenz nicht gefunden" };
  if (!license.active) return { valid: false, message: "Lizenz deaktiviert" };
  if (isExpired(license.expiresAt)) return { valid: false, message: "Lizenz abgelaufen" };
  return { valid: true, license };
}

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

router.post("/create", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const durationDays = Number(req.body?.durationDays) || 30;
    const now = new Date();
    const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const licenses = await readLicenses();
    const newLicense = {
      key: generateKey(),
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      active: true
    };
    licenses.push(newLicense);
    await writeLicenses(licenses);
    res.json({ message: "Lizenz erstellt", license: newLicense });
  } catch (error) {
    console.error("Create error", error);
    res.status(500).json({ message: "Serverfehler" });
  }
});



router.post("/deactivate", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const { key } = req.body;
    const licenses = await readLicenses();
    const target = licenses.find((l) => l.key === key);
    if (!target) return res.status(404).json({ message: "Lizenz nicht gefunden" });
    target.active = false;
    await writeLicenses(licenses);
    res.json({ message: "Lizenz deaktiviert" });
  } catch (error) {
    console.error("Deactivate error", error);
    res.status(500).json({ message: "Serverfehler" });
  }
});


router.get("/all", async (_req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const licenses = await readLicenses();
    res.json({ licenses });
  } catch (error) {
    console.error("List error", error);
    res.status(500).json({ message: "Serverfehler" });
  }
});


router.delete("/:key", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const { key } = req.params;
    const licenses = await readLicenses();
    const filtered = licenses.filter((l) => l.key !== key);
    if (filtered.length === licenses.length) return res.status(404).json({ message: "Lizenz nicht gefunden" });
    await writeLicenses(filtered);
    res.json({ message: "Lizenz gelöscht" });
  } catch (error) {
    console.error("Delete error", error);
    res.status(500).json({ message: "Serverfehler" });
  }
});
 


router.get("/users/all", (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const data = fs.readFileSync("data/users.txt", "utf8");
    res.type("text/plain").send(data || "Keine Benutzer gespeichert.");
  } catch (err) {
    res.status(500).send("Fehler beim Lesen der users.txt");
  }
});



module.exports = { router, validateLicenseKey, readLicenses, writeLicenses };
