const express = require("express"); //node server.js
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const cookieParser = require("cookie-parser");

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
const supabaseServiceClient = createClient(supabaseUrl, supabaseServiceRoleKey);


async function requireAdmin(req, res, next) {
  try {
    
    const accessToken = req.cookies?.["datapulse360-admin"];

    if (!accessToken) {
      return res.status(401).send("Authentication required.");
    }

    
    const { data, error } =
      await supabaseAuthClient.auth.getUser(accessToken);

    if (error || !data.user) {
      return res.status(401).send("Invalid or expired session.");
    }

    // Check whether this user is an administrator.
    const { data: admin, error: adminError } =
      await supabaseServiceClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (adminError) {
      console.error("Admin verification error:", adminError.message);
      return res.status(500).send("Unable to verify administrator access.");
    }

    if (!admin) {
      return res.status(403).send("Administrator access required.");
    }

    req.user = data.user;
    next();
  } catch (error) {
    console.error("Admin authentication error:", error);
    res.status(500).send("Authentication error.");
  }
}


app.use(cors({ origin: process.env.FRONTEND_ORIGIN || false }));
app.use(express.json());
app.use("/admin", requireAdmin);
app.use(cookieParser());

app.use((req, res, next) => {
  const adminPages = [
    "/AdminWebsite/adminHome.html",
    "/AdminWebsite/adminSurveys.html",
    "/AdminWebsite/adminResults.html",
    "/AdminWebsite/adminInvites.html"
  ];

  if (adminPages.includes(req.path)) {
    return requireAdmin(req, res, next);
  }

  next();
});

app.use(express.static(path.join(__dirname, "..", "Frontend")));

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
        error: "Failed to retrieve survey",
      });
    }

    if (!data) {
      return res.status(404).json({
        error: "Survey not found",
      });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Server error",
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

app.get("/admin/home", (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "Frontend", "AdminWebsite", "adminHome.html")
  );
});

app.get("/admin/surveys", (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "Frontend", "AdminWebsite", "adminSurveys.html")
  );
});

app.get("/admin/results", (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "Frontend", "AdminWebsite", "adminResults.html")
  );
});

app.get("/admin/invites", (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "Frontend", "AdminWebsite", "adminInvites.html")
  );
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

app.post("/api/admin-session", async (req, res) => {
  try {
    const authorization = req.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!accessToken) {
      return res.status(401).json({ error: "Authentication required." });
    }

    // Verify the Supabase user.
    const { data, error } =
      await supabaseAuthClient.auth.getUser(accessToken);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid session." });
    }

    // Verify administrator privileges.
    const { data: admin, error: adminError } =
      await supabaseServiceClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (adminError) {
      console.error(adminError);
      return res.status(500).json({ error: "Admin verification failed." });
    }

    if (!admin) {
      return res.status(403).json({ error: "Administrator access required." });
    }

    // Establish the administrator cookie.
    res.cookie("datapulse360-admin", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 1000,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Admin session error:", error);
    res.status(500).json({ error: "Unable to establish admin session." });
  }
});

//Clears cookies
app.post("/api/admin-session/logout", (req, res) => {
  res.clearCookie("datapulse360-admin", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  res.json({ success: true });
});

app.post("/submitSurvey/personal", async (req, res) => {
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

    const { data: survey, error: fetchError } = await supabaseServiceClient
    .from("surveys")
    .select("*")
    .eq("survey_id", surveyID)
    .single();

    if (fetchError || !survey) {
      return res.status(404).json({
        success: false,
        error: "Survey not found.",
      });
    }

    survey.Already_Answered = survey.Already_Answered || [];
      if (survey.Already_Answered.includes(user.id)) {
        return res.status(409).json({
          success: false,
          error: "User has already answered this survey.",
        });
      }

      const globalAnswers = survey.Global_Class_Answers_JSON || {};

      for (const [question, answer] of Object.entries(responses)) {
        if (!globalAnswers[question]) {
          globalAnswers[question] = {};
        }

        if (!globalAnswers[question][answer]) {
          globalAnswers[question][answer] = 0;
        }

        globalAnswers[question][answer]++;
      }

      survey.Already_Answered.push(user.id);

      const {error: updateError} = await supabaseServiceClient
        .from("surveys")
        .update({
          Already_Answered: survey.Already_Answered,
          Global_Class_Answers_JSON: globalAnswers,
        })
        .eq("survey_id", surveyID);

        if (updateError) {
          throw updateError;
        }

        const inviteCode = crypto.randomBytes(16).toString("hex");

        const {error: insertError} = await supabaseServiceClient
          .from("survey_responses")
          .insert({
            SurveyID: surveyID,
            OriginalUserID: user.id,
            InviteCode: inviteCode,
            OriginalUserAnswers: responses
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

  } catch (error) {
    console.error("Error submitting survey:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to submit survey.",
    });
  }
});

app.post("/submitSurvey/peer", async (req, res) => {
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

    //Validation for surveyID and responses
    if (!surveyID || !responses || typeof responses !== "object" || Array.isArray(responses)) {
      return res.status(400).json({
        success: false,
        error: "Invalid survey submission.",
      });
    }

    const { data: surveyResponse, error: fetchError } = await supabaseServiceClient
      .from("survey_responses")
      .select("*")
      .eq("SurveyID", surveyID)
      .contains("Invitees", JSON.stringify([user.id]))
      .single();

    console.log("Peer survey lookup:", {
      surveyID,
      userID: user.id,
      fetchError,
      surveyResponse
    });

    if (fetchError || !surveyResponse) {
      return res.status(404).json({
        success: false,
        error: "You have not been invited to this survey or it does not exist.",
      });
    }

    const inviteesWhoAnswered = surveyResponse.InviteesWhoHaveAnswered || [];

    if (inviteesWhoAnswered.includes(user.id)) {
      return res.status(409).json({
        success: false,
        error: "You have already submitted your peer responses.",
      });
    }

    const aggregateAnswers = surveyResponse.AggregateInviteeAnswers || {};

    for (const [question, answer] of Object.entries(responses)) {
      if (!aggregateAnswers[question]) {
        aggregateAnswers[question] = {};
      }

      if (!aggregateAnswers[question][answer]) {
        aggregateAnswers[question][answer] = 0;
      }
      aggregateAnswers[question][answer]++;
    }

    inviteesWhoAnswered.push(user.id);
    const remainingInvitees = (surveyResponse.Invitees || [])
      .filter(inviteeID => inviteeID !== user.id);


    const {error: updateError} = await supabaseServiceClient
      .from("survey_responses")
      .update({
        AggregateInviteeAnswers: aggregateAnswers,
        InviteesWhoHaveAnswered: inviteesWhoAnswered,
        Invitees: remainingInvitees
      })
      .eq("SurveyID", surveyID)
      .eq("OriginalUserID", surveyResponse.OriginalUserID);
      
      if (updateError) {
        throw updateError;
      }

      return res.json({
        success: true,
        message: "Peer survey submitted successfully.",
      });

  } catch (error) {
    console.error("Error submitting survey:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to submit survey.",
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

    const { error } = await supabaseServiceClient.from("surveys").insert({
      survey_id: surveyID,
      title: surveyName,
      questions: questions,
    });

    if (error) {
      console.error("Supabase insert error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Failed to save survey.",
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
      success: false,
      message: "no survey code entered",
    });
  }

  //0 for 1st perosn, 1 for 2nd person
  const pov = inviteCode[0];

  if (pov !== "0" && pov !== "1") {
    return res.status(400).json({
      success: false,
      message: "Invalid survey Code.",
    });
  }
  const surveyID = inviteCode.slice(1);
  const { data: survey, error } = await supabaseServiceClient
    .from("surveys")
    .select("survey_id, title, questions")
    .eq("survey_id", surveyID)
    .maybeSingle();
  if (error) {
    console.error("Supabase error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve survey.",
    });
  }
  if (!survey) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Survey Code." });
  }

  return res.json({
    success: true,
    pov: pov,
    surveyId: survey.survey_id,
    surveyName: survey.title,
    questions: survey.questions,
  });
});

app.get("/admin/loadSurveys", async (req, res) => {
  try {
    const { data, error } = await supabaseServiceClient
      .from("surveys")
      .select("survey_id, title, questions");

    if (error) {
      console.error("Supabase error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return res.status(500).json({
        message: "Failed to load surveys",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.get("/user/loadSurveys1", async (req, res) => {
  try {
    const authorization = req.get("authorization");

    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!accessToken) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const { data: authData, error: authError } =
      await supabaseAuthClient.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return res.status(401).json({ error: "Invalid session." });
    }

    const user = authData.user;

    const { data: SurveyList, error: surveyListError } =
      await supabaseServiceClient
        .from("user_surveys")
        .select("survey_id, POV")
        .eq("user_id", user.id);

    if (surveyListError) {
      console.error("Supabase error:", {
        message: surveyListError.message,
        details: surveyListError.details,
        hint: surveyListError.hint,
        code: surveyListError.code,
      });
      return res.status(500).json({
        message: "Failed to load surveys",
      });
    }

    const surveyIDs = SurveyList.map((survey) => survey.survey_id);
    if (surveyIDs.length === 0) {
      return res.json([]);
    }
    const { data, error: surveyError } = await supabaseServiceClient
      .from("surveys")
      .select("survey_id, title, questions")
      .in("survey_id", surveyIDs);

    if (surveyError) {
      console.error("Supabase error:", {
        message: surveyError.message,
        details: surveyError.details,
        hint: surveyError.hint,
        code: surveyError.code,
      });
      return res.status(500).json({
        message: "Failed to load surveys",
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.get("/user/loadSurveys2", async (req, res) => {
  try {
    const authorization = req.get("authorization");

    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!accessToken) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const { data: authData, error: authError } =
      await supabaseAuthClient.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return res.status(401).json({ error: "Invalid session." });
    }

    const user = authData.user;

    const { data: InvitedSurveys, error: invitedError } =
      await supabaseServiceClient
        .from("survey_responses")
        .select("SurveyID, OriginalUserID")
        .contains("Invitees", JSON.stringify([user.id]));

    if (invitedError) {
      console.error("Supabase error:", {
        message: invitedError.message,
        details: invitedError.details,
        hint: invitedError.hint,
        code: invitedError.code,
      });
      return res.status(500).json({
        message: "Failed to load surveys",
      });
    }

    if (InvitedSurveys.length === 0) {
      return res.json([]);
    }

    const surveyInviters = await Promise.all(
      InvitedSurveys.map(async (survey) => {
        const { data: inviter, error: inviterError } = 
        await supabaseServiceClient.auth.admin.getUserById(
          survey.OriginalUserID
        );

        if (inviterError) {
          throw inviterError;
        }

        return {
          surveyID: survey.SurveyID,
          inviterEmail: inviter.user.email
        };
      })
    );

    const { data, error: surveyError } = await supabaseServiceClient
      .from("surveys")
      .select("survey_id, title, questions")
      .in("survey_id", surveyInviters.map(s => s.surveyID));

    if (surveyError) {
      console.error("Supabase error:", {
        message: surveyError.message,
        details: surveyError.details,
        hint: surveyError.hint,
        code: surveyError.code,
      });
      return res.status(500).json({
        message: "Failed to load surveys",
      });
    }

    const surveysWithInviters = data.map((survey) => {
    const inviter = surveyInviters.find(
      (s) => s.surveyID === survey.survey_id
    );

    return {...survey, inviterEmail: inviter?.inviterEmail };
  });

  res.json(surveysWithInviters);

  } catch (error) {
    console.error("Unexpected error loading surveys:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.post("/admin/invite", async (req, res) => {
  const authorization = req.get("authorization");

  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!accessToken) {
    return res.status(401).json({ error: "Authentication required." });
  }
  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid session." });
  }

  const user = data.user;

  const { surveyID, email } = req.body;
  if (!surveyID || !email) {
    return res.status(400).json({ error: "Missing surveyID or email" });
  }

  const { data: userList, error: userListError } =
    await supabaseServiceClient.auth.admin.listUsers();
  if (userListError) {
    console.error("Supabase error:", userListError.message);
    return res.status(500).json({ error: "Failed to retrieve user list" });
  }
  const recipient = userList.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );
  if (!recipient) {
    return res.status(404).json({ error: "Recipient not found" });
  }
  const recipientID = recipient.id;
  const { error: surveyError } = await supabaseServiceClient
    .from("user_surveys")
    .insert({
      user_id: recipientID,
      survey_id: surveyID,
    });
  if (surveyError) {
    console.error("Supabase error:", surveyError.message);
    return res.status(500).json({ 
      error: "Failed to create survey", 
      details: surveyError.message,
      code: surveyError.code });
  }

  return res.json({
    success: true,
    message: "Invitation sent successfully.",
  });
});

app.post("/user/invite", async (req, res) => {
  try {
    const authorization = req.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!accessToken) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid session." });
    }

    const user = data.user;

    const { surveyID, email } = req.body;
    if (!surveyID || !email) {
      return res.status(400).json({
        error: "Missing surveyID or email."
      });
    }

    const { data: userList, error: userListError } =
    await supabaseServiceClient.auth.admin.listUsers();
    if (userListError) {
      throw userListError;
    }

    const recipient = userList.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const recipientID = recipient.id;

    if (recipientID === user.id) {
      return res.status(400).json({ error: "Cannot invite yourself" });
    }

    const {data: surveyResponse, error: fetchError} = 
    await supabaseServiceClient
    .from("survey_responses")
    .select("Invitees")
    .eq("SurveyID", surveyID)
    .eq("OriginalUserID", user.id)
    .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(400).json({
          error: "Please submit your own survey before inviting participants."
        });
      }
      throw fetchError;
    }

    const invitees = surveyResponse?.Invitees || [];
    if (invitees.includes(recipientID)) {
      return res.status(400).json({ error: "Recipient already invited" });
    }

    invitees.push(recipientID);

    const { error: updateError } = await supabaseServiceClient
      .from("survey_responses")
      .update({ Invitees: invitees })
      .eq("SurveyID", surveyID)
      .eq("OriginalUserID", user.id);

    if (updateError) {
      throw updateError;
    }

    return res.json({
      success: true,
      message: "Invitation sent successfully.",
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    return res.status(500).json({ error: "Failed to invite user" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
