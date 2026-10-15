
const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/db");
const { seedHospitals } = require("./config/seed");

const doctorRoutes = require("./routes/doctors");
const hospitalRoutes = require("./routes/hospitals");
const invoiceRoutes = require("./routes/invoices");
const prescriptionRoutes = require("./routes/prescriptions");

const app = express();

app.use(cors());
app.use(express.json());

let initializationPromise;

async function initializeApp() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await connectDB();
      await seedHospitals();
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

app.use(async (req, res, next) => {
  try {
    await initializeApp();
    next();
  } catch (error) {
    console.error("Application initialization failed:", error.message);
    res.status(503).json({
      error: "Service temporarily unavailable",
    });
  }
});

app.use("/api/doctors", doctorRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/prescriptions", prescriptionRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");

    return res.status(400).json({
      error: message || "Validation failed",
    });
  }

  if (err.name === "CastError") {
    return res.status(404).json({ error: "Not found" });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      error: "A record with that value already exists",
    });
  }

  res.status(500).json({
    error: "Something went wrong on the server",
  });
});

module.exports = app;
