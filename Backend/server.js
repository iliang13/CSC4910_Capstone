const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

const surveysDirectory = path.join(__dirname, "surveys");
const surveysFile = path.join(surveysDirectory, "surveys.json");

if (!fs.existsSync(surveysDirectory)) {
  fs.mkdirSync(surveysDirectory, { recursive: true });
}

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

    if (!Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: "Questions must be an array."
      });
    }

    const surveyData = { questions };

    const fileName = req.body.surveyName.trim().replace(/[^a-z0-9_-]/gi, "_") + ".json";
    const surveyFile = path.join(surveysDirectory, fileName);

    fs.writeFileSync(
      surveyFile,
      JSON.stringify(surveyData, null, 2),
      "utf8"
    );

    res.json({
      success: true,
      message: "Survey saved successfully."
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
