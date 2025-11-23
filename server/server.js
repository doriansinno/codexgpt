require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const apiRoutes = require("./routes/api");
const { router: licenseRoutes } = require("./routes/license");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/ask", apiRoutes);
app.use("/license", licenseRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ADMIN SCHUTZ
app.use((req, res, next) => {
  if (req.path.startsWith("/admin")) {
    if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
      return res.status(403).send("Zugriff verweigert");
    }
  }
  next();
});




app.use(express.static(path.join(__dirname, "../admin-dashboard")));

app.use((err, _req, res, _next) => {
  console.error("Unhandled error", err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
