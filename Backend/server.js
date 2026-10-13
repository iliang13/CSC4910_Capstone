const express = require("express"); //node server.js
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
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
  res.send("DataPulse360 Server Running");
});

app.post("/submitSurvey", (req, res) => {
  console.log("Survey received:");
  console.log(req.body);

  res.json({
    success: true,
    message: "Survey received",
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

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
