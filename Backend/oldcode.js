else if (Number(pov) === 1) {
      const { error } = await supabaseServiceClient
        .from("user_surveys")
        .insert({
          survey_id: surveyID,
          user_id: user.id,
          response_data: responses,
          pov: Number(pov),
        });

      insertError = error;
    }

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

    if (Number(pov) === 0) {
      const { data: survey, error: fetchError } = await supabaseServiceClient
        .from("surveys")
        .select("Already_Answered, Global_Class_Answers_JSON")
        .eq("survey_id", surveyID)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      //Avoids duplicate submissions by the same user for the same survey
      survey.Already_Answered = survey.Already_Answered || [];
      if (survey.Already_Answered.includes(user.id)) {
        return res.status(409).json({
          success: false,
          error: "User has already answered this survey.",
        });
      }

      //Update answers in global survey
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
          throw insertError;
        }

      else {
      return res.status(400).json({
        success: false,
        error: "Invalid POV value.",
      });
    }

    if (insertError) {
      console.error(insertError);

      return res.status(500).json({
        success: false,
        error: insertError.message,
      });
    }

    
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: "Could not save survey response.",
    });
  }