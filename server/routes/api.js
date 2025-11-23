const express = require("express");
const OpenAI = require("openai");
const { validateLicenseKey } = require("./license");

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { text, licenseKey } = req.body || {};
    if (!text || !licenseKey) {
      return res.status(400).json({ message: "Text und Lizenzkey sind erforderlich." });
    }

    const licenseResult = await validateLicenseKey(licenseKey);
    if (!licenseResult.valid) {
      return res.status(403).json({ message: licenseResult.message || "Lizenz ungültig" });
    }

    const completion = await client.chat.completions.create({
  model: "gpt-4o-mini",
  max_tokens: 200,  // << LIMIT AUF 200 TOKENS
  messages: [
    { role: "system", content: "Gib deine Antworten so kurz, klar und strukturiert wie möglich aus." },
    { role: "user", content: text }
  ]
});


    const answer = completion.choices?.[0]?.message?.content || "Keine Antwort";
    res.json({ answer });
  } catch (error) {
    console.error("/ask error", error);
    const status = error?.status || 500;
    res.status(status).json({ message: "Fehler bei der Verarbeitung", details: error.message });
  }
});

module.exports = router;
