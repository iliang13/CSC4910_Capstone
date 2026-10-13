const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseAuthClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

app.use(
  cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000" }),
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "../Frontend")));
app.use("/images", express.static(path.join(__dirname, "../images")));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/config", (req, res) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return res
      .status(503)
      .json({ error: "Supabase is not configured on the server." });
  }

  res.json({ supabaseUrl, supabaseAnonKey });
});

async function requireAuthentication(req, res, next) {
  if (!supabaseAuthClient) {
    return res
      .status(503)
      .json({ error: "Authentication is not configured on the server." });
  }

  const token = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return res.status(401).json({ error: "Sign in to continue." });
  }

  try {
    const { data, error } = await supabaseAuthClient.auth.getUser(token);
    if (error || !data.user) {
      return res
        .status(401)
        .json({
          error: "Your session is invalid or expired. Please sign in again.",
        });
    }

    req.user = { id: data.user.id, email: data.user.email };
    next();
  } catch (error) {
    console.error("Supabase token validation failed:", error.message);
    res.status(503).json({ error: "Authentication service is unavailable." });
  }
}

app.get("/api/me", requireAuthentication, (req, res) => {
  res.json({ user: req.user });
});

app.post("/submitSurvey", requireAuthentication, (req, res) => {
  res.json({
    success: true,
    message: "Survey received",
    user: req.user,
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
