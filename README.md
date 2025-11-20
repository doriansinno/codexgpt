# AI Selection Helper Project

Dieses Repository enthält eine vollständige Chrome-Extension (Manifest V3), einen Node.js/Express-Backend-Server mit Lizenzsystem und ein Admin-Dashboard.

## Inhalt
- **extension/** – Chrome-Extension (Content Script, Service Worker, Popup)
- **server/** – Express-Server mit OpenAI-Anbindung und Lizenzverwaltung (TXT-Speicher)
- **admin-dashboard/** – Minimalistisches Dashboard zur Lizenzpflege

## Voraussetzungen
- Node.js 18+
- Ein OpenAI API-Key in der Umgebung: `OPENAI_API_KEY`

## Installation & Start (Server)
1. Abhängigkeiten installieren:
   ```bash
   cd server
   npm install
   ```
   > Hinweis: In manchen Umgebungen können Netzwerk- oder Proxy-Regeln `npm install` verhindern. Stelle sicher, dass npm Zugriff auf die Registry hat oder verwende eine Offline/gespiegelte Registry.
2. Server starten:
   ```bash
   npm start
   ```
   Der Server läuft standardmäßig auf `http://localhost:3000` und serviert das Admin-Dashboard aus `admin-dashboard/`.

## Admin-Dashboard
- Öffne `http://localhost:3000/` nach dem Start des Servers.
- Funktionen: Lizenzen auflisten, erstellen, deaktivieren und löschen.

## Chrome-Extension laden
1. Chrome öffnen → `chrome://extensions/`
2. "Entwicklermodus" aktivieren.
3. "Entpackte Erweiterung laden" wählen und den Ordner `extension/` auswählen.
4. Lizenzschlüssel im Popup hinterlegen. Die Extension validiert beim Start automatisch.

## Lizenzdaten
- Lizenzdateien liegen unter `server/data/`:
  - `licenses.txt` mit Struktur `key;createdAt;expiresAt;active`
  - `users.txt` mit Struktur `userId;licenseKey;activatedAt`

## API-Endpunkte (Server)
- `POST /ask` – sendet Text an OpenAI (erfordert `text` und `licenseKey`).
- `POST /license/validate` – prüft Lizenz.
- `POST /license/create` – erstellt Lizenz (Standard 30 Tage, per `durationDays` anpassbar).
- `POST /license/deactivate` – deaktiviert Lizenz.
- `GET /license/all` – listet alle Lizenzen.
- `DELETE /license/:key` – löscht Lizenz.

## Troubleshooting
- Prüfe Netzwerkzugriff für `npm install`.
- Stelle sicher, dass `OPENAI_API_KEY` gesetzt ist, bevor `/ask` genutzt wird.
- Die Extension erwartet den Server unter `http://localhost:3000`. Bei anderem Host/Port bitte Manifest/Background anpassen.
