this.viewButton.addEventListener("click", async () => {
      currentSurveyID = ID;
      surveyAnsweringDiv.classList.add("active");
      clearSurvey();

      surveyAnsweringDiv.replaceChildren();
      for (let i = 0; i < questionsList.length; i++) {
        if (pov === "0") {
          surveyAnsweringDiv.appendChild(
            CreateSurveyQuestion(
              questionsList[i].questionText,
              questionsList[i].numberOfOptions
            ).question
          );
        } else if (pov === "1") {
          surveyAnsweringDiv.appendChild(
            CreateSurveyQuestion(
              questionsList[i].thirdPersonText,
              questionsList[i].numberOfOptions
            ).question
          );
        }
      }

      const submitButton = document.createElement("button");

      submitButton.textContent = "Submit Survey";

      submitButton.addEventListener("click", async () => {
        console.log("Submit clicked");

        const responses = {};

        document
          .querySelectorAll("#surveyAnsweringDiv .question")
          .forEach((question, index) => {
            const selected = question.querySelector(
              'input[type="radio"]:checked'
            );

            responses[`question_${index + 1}`] = selected
              ? selected.value
              : null;
          });

        const missing = Object.entries(responses)
          .filter(([, answer]) => answer === null)
          .map(([key]) => key.replace("question_", ""));

        document
          .querySelectorAll("#surveyAnsweringDiv .question")
          .forEach((q, i) => {
            q.style.outline = missing.includes(String(i + 1))
              ? "3px solid #f7120a"
              : "";
          });

        if (missing.length > 0) {
          document.getElementById(
            "output"
          ).textContent = `Please answer question${
            missing.length > 1 ? "s" : ""
          }: ${missing.join(", ")}`;
          return;
        }

        console.log("Survey:", currentSurveyID);
        console.log("Responses:", responses);

        const {
          data: { session },
          error,
        } = await supabaseClient.auth.getSession();

        if (error || !session) {
          document.getElementById("output").textContent =
            "Please sign in to submit the survey.";
          return;
        }

        try {
          submitButton.disabled = true;
          const res = await fetch("/submitSurvey/personal", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              surveyID: currentSurveyID,
              pov: pov,
              responses: responses,
            }),
          });

          const data = await res.json();
          if (!res.ok) submitButton.disabled = false;

          document.getElementById("output").textContent = res.ok
            ? data.message
            : data.error;
        } catch (err) {
          submitButton.disabled = false;
          document.getElementById("output").textContent = err.message;
        }
      });
      surveyAnsweringDiv.appendChild(submitButton);
    });