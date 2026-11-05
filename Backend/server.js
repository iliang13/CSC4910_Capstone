const express = require("express"); //node server.js
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_ANON_KEY in Backend/.env or the hosting environment."
  );
}
if (!supabaseServiceRoleKey) {
  throw new Error(
    "Set SUPABASE_SERVICE_ROLE_KEY in Backend/.env or the hosting environment."
  );
}

const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
const supabaseServiceClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || false }));
app.use(express.json());

app.get("/testSurvey/:id", async (req, res) => {
    try {
        const { data, error } = await supabaseServiceClient
            .from("surveys")
            .select("*")
            .eq("survey_id", req.params.id)
            .maybeSingle();

        if (error) {
            console.error("Supabase error:", error.message);
            return res.status(500).json({
                error: "Failed to retrieve survey"
            });
        }

        if (!data) {
            return res.status(404).json({
                error: "Survey not found"
            });
        }

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Server error"
        });
    }
});

const surveysDirectory = path.join(__dirname, "surveys");

function generateSurveyID() {
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

var surveyIDLookupTable = {};

function loadSurveyIDs() {
  const files = fs.readdirSync(surveysDirectory);
  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }

    try {
      const filePath = path.join(surveysDirectory, file);
      const surveyData = JSON.parse(fs.readFileSync(filePath, "utf8"));

            if (surveyData.surveyID) {
                surveyIDLookupTable[surveyData.surveyID] = surveyData;
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
  res.sendFile(path.join(__dirname, "..", "Frontend", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Frontend", "AdminWebsite.html"));
});

app.get("/user", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Frontend", "UserCopy.html"));
});

app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/images", express.static(path.join(__dirname, "..", "images")));

app.get("/api/config", (req, res) => {
  res.json({ supabaseUrl, supabaseAnonKey });
});

app.get("/api/me", async (req, res) => {
  const authorization = req.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!accessToken) {
    return res
      .status(401)
      .json({ error: "A valid sign-in session is required." });
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);
  if (error) {
    return res
      .status(401)
      .json({ error: "The sign-in session is invalid or expired." });
  }

  res.json({ user: data.user });
});

app.post("/submitSurvey", async (req, res) => {
  try {
    const authorization = req.get("authorization");

    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        error: "Invalid session.",
      });
    }

    const user = data.user;

    const { surveyID, responses } = req.body;

    console.log("User:", user.id);
    console.log("Survey:", surveyID);
    console.log("Responses:", responses);

    console.log("Survey submission received:");
    console.log(req.body);

    const { error: insertError } = await supabaseServiceClient
      .from("survey_responses")
      .insert({
        survey_id: surveyID,
        user_id: user.id,
        response_data: responses,
      });

    if (insertError) {
      console.error(insertError);

      return res.status(500).json({
        success: false,
        error: insertError.message,
      });
    }

    res.json({
      success: true,
      message: "Survey submitted successfully.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: "Could not save survey response.",
    });
  }
});

app.post("/saveSurvey", async (req, res) => {
  try {
    const questions = req.body.questions;
    const surveyName = req.body.surveyName?.trim();

    if (!surveyName) {
      return res.status(400).json({
        success: false,
        message: "Survey name is required.",
      });
    }

    if (!Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: "Questions must be an array.",
      });
    }

    let surveyID = generateSurveyID();

    while (Object.hasOwn(surveyIDLookupTable, surveyID)) {
      surveyID = generateSurveyID();
    }

    const {error} = await supabaseServiceClient
    .from("surveys")
    .insert({
      survey_id: surveyID,
      title: surveyName,
      questions: questions
    });

    if (error) {
      console.error("Supabase insert error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to save survey."
      });
    }

    res.json({
      success: true,
      message: "Survey saved successfully.",
      surveyName: surveyName,
      surveyID: surveyID,
    });
  } catch (error) {
    console.error("Error saving survey:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save survey.",
    });
  }
});

app.post("/validateSurveyCode", async (req, res) => {
  const inviteCode = req.body.surveyID?.trim();

  if (!inviteCode) {
    return res.status(400).json({
      success:false,
      message: "no survey code entered"
    });
  }

  //0 for 1st perosn, 1 for 2nd person
  const pov = inviteCode[0];

  if (pov !== "0" && pov !== "1") {
    return res.status(400).json({
      success: false,
      message: "Invalid survey Code."
    });
  }
  const surveyID = inviteCode.slice(1);
  const {data: survey, error} = await supabaseServiceClient
  .from("surveys")
  .select("survey_id, title, questions")
  .eq("survey_id", surveyID)
  .maybeSingle();
  if (error) {
    console.error("Supabase error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve survey."
    });
  }
  if (!survey) {
    return res.status(404).json({success: false, message: "Invalid Survey Code."
    });
  }
  
  return res.json({
    success: true, 
    pov: pov,
    surveyId: survey.survey_id,
    surveyName: survey.title,
    questions: survey.questions
  });
});

app.get("/admin/surveys", async (req, res) => {
  try {
    const {data, error } = await supabaseServiceClient
    .from("surveys").select("survey_id, title, questions");

    if (error) {
      console.error("Supabase error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return res.status(500).json({
        message: "Failed to load surveys"
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

app.get("/user/surveys", async (req, res) => {
  try {
    const authorization = req.get("authorization");

    const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

    if (!accessToken) {
      return res.status(401).json({error: "Authentication required."});
    }
    const { data: authData, error: authError } = await supabaseAuthClient.auth.getUser(accessToken);

    if (authError || !authData.user) {
     return res.status(401).json({error: "Invalid session."});
    }

    const user = authData.user;

    const {data:SurveyList, error: surveyListError } = await supabaseServiceClient
    .from("user_surveys").select("survey_id").eq("user_id", user.id);;

    if (surveyListError) {
      console.error("Supabase error:", {
        message: surveyListError.message,
        details: surveyListError.details,
        hint: surveyListError.hint,
        code: surveyListError.code
      });
      return res.status(500).json({
        message: "Failed to load surveys"
      });
    }

    const surveyIDs = SurveyList.map(survey => survey.survey_id);
    if (surveyIDs.length === 0) {
      return res.json([]);
    }
    const {data, error: surveyError } = await supabaseServiceClient
    .from("surveys").select("survey_id, title, questions").in("survey_id", surveyIDs);

    if (surveyError) {
      console.error("Supabase error:", {
        message: surveyError.message,
        details: surveyError.details,
        hint: surveyError.hint,
        code: surveyError.code
      });
      return res.status(500).json({
        message: "Failed to load surveys"
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

app.post("/invite", async (req, res) => {
  const authorization = req.get("authorization");

  const accessToken = authorization?.startsWith("Bearer ")
  ? authorization.slice("Bearer ".length)
  : null;

  if (!accessToken) {
    return res.status(401).json({error: "Authentication required."});
  }
  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);

  if (error || !data.user) {
     return res.status(401).json({error: "Invalid session."});
  }

  const user = data.user;

  const { surveyID, email } = req.body;
  if (!surveyID || !email) {
    return res.status(400).json({ error: "Missing surveyID or email" });
  }

  const { data:userList, error:userListError } = await supabaseServiceClient.auth.admin.listUsers();
  if (userListError) {
    console.error("Supabase error:", userListError.message);
    return res.status(500).json({ error: "Failed to retrieve user list" });
  }
  const recipient = userList.users.find(
  user => user.email?.toLowerCase() === email.toLowerCase()
  );
  if (!recipient) {
    return res.status(404).json({ error: "Recipient not found" });
  }
  const recipientID = recipient.id;
  const {error: surveyError } = await supabaseServiceClient
    .from("user_surveys")
    .insert({
      user_id: recipientID,
      survey_id: surveyID,
    });
  if (surveyError) {
    console.error("Supabase error:", surveyError.message);
    return res.status(500).json({ error: "Failed to create survey" });
  }
  
  return res.json({
    success: true,
    message: "Invitation sent successfully."
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
