const express = require("express"); //node server.js
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });


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

const surveysDirectory = path.join(__dirname, "surveys");

function generateSurveyID() {
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

var surveyIdLookupTable = {};

function loadSurveyIDs() {
    const files = fs.readdirSync(surveysDirectory);
    for (const file of files) {
        if (!file.endsWith(".json")) {
            continue;
        }

        try {
            const filePath = path.join(surveysDirectory, file);
            const surveyData = JSON.parse(
                fs.readFileSync(filePath, "utf8")
            );

            if (surveyData.surveyID) {
                surveyIdLookupTable[surveyData.surveyID] = true;
            }
        } catch (error) {
            console.error(`Error loading ${file}:`, error.message);
        }
    }
}

if (!fs.existsSync(surveysDirectory)) {
  fs.mkdirSync(surveysDirectory, { recursive: true });
}
loadSurveyIDs();

app.get("/", (req, res) => {
  res.send('DataPulse360 Server Running. <a href="/admin">Open the admin website</a>.');
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Frontend", "AdminWebsite.html"));
});

app.use("/images", express.static(path.join(__dirname, "..", "images")));

app.get("/api/config", (req, res) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({ error: "Supabase authentication is not configured." });
  }

  res.json({ supabaseUrl, supabaseAnonKey });
});

app.get("/api/me", async (req, res) => {
  if (!supabaseAuthClient) {
    return res.status(503).json({ error: "Supabase authentication is not configured." });
  }

  const authorization = req.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!accessToken) {
    return res.status(401).json({ error: "A valid sign-in session is required." });
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);
  if (error) {
    return res.status(401).json({ error: "The sign-in session is invalid or expired." });
  }

  res.json({ user: data.user });
});

app.post("/submitSurvey", (req, res) => {
  console.log("Survey received:");
  console.log(req.body);

  res.json({
    success: true,
    message: "Survey received",
    user: req.user,
  });
});

app.post("/saveSurvey", (req, res) => {
  try {
    const questions = req.body.questions;
    const surveyName = req.body.surveyName?.trim();

    if (!surveyName) {
      return res.status(400).json({
        success: false,
        message: "Survey name is required."
      });
    }

    if (!Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: "Questions must be an array."
      });
    }

    let surveyID = generateSurveyID();

    while (Object.hasOwn(surveyIdLookupTable, surveyID)) {
      surveyID = generateSurveyID();
    }

    const fileName = surveyName.replace(/[^a-z0-9_-]/gi, "_") + ".json";
    const surveyFile = path.join(surveysDirectory, fileName);
      const surveyData = {surveyID, surveyName, questions};
      surveyIdLookupTable[surveyID] = true;

      fs.writeFileSync(
        surveyFile,JSON.stringify(surveyData, null, 2),"utf8");

    res.json({
      success: true,
      message: "Survey saved successfully.",
      surveyName: surveyName,
      surveyID: surveyID
    });
  } catch (error) {
    console.error("Error saving survey:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save survey."
    });
  }
});

app.post("/saveSurvey", (req, res) => {
  try {
    const questions = req.body.questions;
    const surveyName = req.body.surveyName?.trim();

    if (!surveyName) {
      return res.status(400).json({
        success: false,
        message: "Survey name is required."
      });
    }

    if (!Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: "Questions must be an array."
      });
    }

    let surveyID = generateSurveyID();

    while (Object.hasOwn(surveyIdLookupTable, surveyID)) {
      surveyID = generateSurveyID();
    }

    const fileName = surveyName.replace(/[^a-z0-9_-]/gi, "_") + ".json";
    const surveyFile = path.join(surveysDirectory, fileName);
      const surveyData = {surveyID, surveyName, questions};
      surveyIdLookupTable[surveyID] = true;

      fs.writeFileSync(
        surveyFile,JSON.stringify(surveyData, null, 2),"utf8");

    res.json({
      success: true,
      message: "Survey saved successfully.",
      surveyName: surveyName,
      surveyID: surveyID
    });
  } catch (error) {
    console.error("Error saving survey:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save survey."
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
