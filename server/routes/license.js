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

// --------------------------------------
// LICENSE PARSING
// --------------------------------------
function parseLicense(line) {
  const parts = line.trim().split(";");
  if (!parts[0]) return null;

  return {
    key: parts[0],
    createdAt: parts[1],
    expiresAt: parts[2],
    active: parts[3] === "true"
  };
}

function serializeLicense(l) {
  return [
    l.key,
    l.createdAt,
    l.expiresAt,
    l.active ? "true" : "false"
  ].join(";");
}

async function readLicenses() {
  try {
    const txt = await fs.readFile(LICENSE_FILE, "utf8");
    return txt.split("\n").map(parseLicense).filter(Boolean);
  } catch {
    return [];
  }
}

async function writeLicenses(list) {
  await fs.writeFile(LICENSE_FILE, list.map(serializeLicense).join("\n"), "utf8");
}

// --------------------------------------
// USERS (DEVICE BINDING)
// Format: clientId;key;activatedAt
// --------------------------------------
function parseUser(line) {
  const [clientId, key, date] = line.trim().split(";");
  if (!clientId || !key) return null;
  return { clientId, key, date };
}

async function readUsers() {
  try {
    const txt = await fs.readFile(USERS_FILE, "utf8");
    return txt.split("\n").map(parseUser).filter(Boolean);
  } catch {
    return [];
  }
}

async function writeUsers(list) {
  await fs.writeFile(
    USERS_FILE,
    list.map(u => `${u.clientId};${u.key};${u.date}`).join("\n"),
    "utf8"
  );
}

// --------------------------------------
// VALIDATE (check device binding)
// --------------------------------------
async function validateLicenseKey(key, clientId) {
  const licenses = await readLicenses();
  const lic = licenses.find(l => l.key === key);

  if (!lic) return { valid: false, message: "Lizenz nicht gefunden" };
  if (!lic.active) return { valid: false, message: "Lizenz deaktiviert" };
  if (new Date(lic.expiresAt) < Date.now())
    return { valid: false, message: "Lizenz abgelaufen" };

  const users = await readUsers();
  const used = users.filter(u => u.key === key);

  if (used.length === 0)
    return { valid: false, message: "Lizenz wurde noch nicht aktiviert" };

  const match = used.find(u => u.clientId === clientId);

  if (match) return { valid: true };

  return {
    valid: false,
    message: "Lizenz wurde bereits auf einem anderen Gerät aktiviert"
  };
}

// --------------------------------------
// ROUTES
// --------------------------------------

// FIRST ACTIVATE
router.post("/activate", async (req, res) => {
  const { key, clientId } = req.body;

  if (!key || !clientId)
    return res.json({ valid: false, message: "Key oder ClientId fehlt" });

  const licenses = await readLicenses();
  const lic = licenses.find(l => l.key === key);

  if (!lic) return res.json({ valid: false, message: "Key existiert nicht" });

  const users = await readUsers();

  const existing = users.filter(u => u.key === key);

  // key schon benutzt von anderem Gerät
  if (existing.length > 0 && !existing.find(u => u.clientId === clientId)) {
    return res.json({
      valid: false,
      message: "Lizenz wurde bereits auf einem anderen Gerät aktiviert"
    });
  }

  // auf diesem Gerät bereits aktiviert
  if (existing.find(u => u.clientId === clientId)) {
    return res.json({ valid: true, message: "Bereits aktiviert" });
  }

  // erste Aktivierung
  users.push({
    clientId,
    key,
    date: new Date().toISOString()
  });

  await writeUsers(users);

  return res.json({ valid: true, message: "Aktiviert" });
});

// VALIDATE
router.post("/validate", async (req, res) => {
  const { key, clientId } = req.body;
  const result = await validateLicenseKey(key, clientId);
  res.json(result);
});

// ADMIN ROUTES (create/list/delete)...

module.exports = { router };
