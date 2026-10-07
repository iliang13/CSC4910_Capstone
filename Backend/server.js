const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

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

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
