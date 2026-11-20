const surveyBuilder = document.getElementById("surveyBuilder");

const submitSurveyCodeButton = document.getElementById("submitSurveyCode");
const surveyAccessDisplay = document.getElementById(
  "displaySurveyAccessButtons"
);

const firstPersonSurveys = document.getElementById("firstPersonSurveys");
const thirdPersonSurveys = document.getElementById("thirdPersonSurveys");

const popup = document.getElementById("codePopup");

let currentSurveyID = null;

submitSurveyCodeButton.addEventListener("click", async () => {
  const inviteCode = document.getElementById("surveyCode").value.trim();
  const alreadyAdded = Array.from(
    document.querySelectorAll(".SurveyAccessDiv")
  ).some((button) => {
    return inviteCode.slice(1) === button.dataset.surveyID;
  });
  if (alreadyAdded) {
    alert("Survey already added");
    popup.hidePopover();
    return;
  }
  try {
    const response = await fetch("/validateSurveyCode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        surveyID: inviteCode,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message);
      return;
    }
    createSurveyAccessButton(
      result.surveyName,
      result.surveyId,
      result.pov,
      false,
      result.questions
    ); //title, ID, pov, answered, questionsList
    alert("Survey Added Successfully");
  } catch (error) {
    console.error("Error validating survey code:", error);
    alert("Could not contact the server");
  }
  popup.hidePopover();
});

document.addEventListener("click", (event) => {
  const popups = document.querySelectorAll(".surveyPopup:popover-open");
  popups.forEach((popup) => {
    // Check whether the click was inside the popup
    if (popup.contains(event.target)) {
      return;
    }
    // Check whether the click was on a button that opens a popup
    if (
      submitSurveyCodeButton.contains(event.target) ||
      event.target.closest(".inviteButton")
    ) {
      return;
    }
    popup.hidePopover();
  });
});

async function loadSurveys() {
  await supabaseReady;

  if (authSetupState !== "ready") return;

  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();
  if (error || !session) {
    alert("Please sign in to proceed.");
    return;
  }
  try {
    const response = await fetch("/user/loadSurveys1", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load surveys");
    }
    const surveys = await response.json();

    firstPersonSurveys.querySelectorAll(".SurveyAccessDiv")
    .forEach(div => div.remove());
    
    thirdPersonSurveys.querySelectorAll(".SurveyAccessDiv")
    .forEach(div => div.remove());

    surveys.forEach((survey) => {
      //title, ID, pov, answered, questionsList
      createSurveyAccessButton(
        survey.title,
        survey.survey_id,
        "0",
        false,
        survey.questions
      );
    });
  } catch (error) {
    console.error("Error loading surveys:", error);
    surveyAccessDisplay.textContent = "Unable to load surveys.";
  }
  try {
    const response = await fetch("/user/loadSurveys2", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load surveys");
    }
    const surveys = await response.json();

    surveys.forEach((survey) => {
      //title, ID, pov, answered, questionsList
      createSurveyAccessButton(
        survey.title,
        survey.survey_id,
        "1",
        false,
        survey.questions,
        survey.inviterEmail
      );
    });
  } catch (error) {
    console.error("Error loading surveys:", error);
    surveyAccessDisplay.textContent = "Unable to load surveys.";
  }
}

function clearSurvey() {
  const questionsContainer = document.getElementById("questionsContainer");
  const surveyNameInput = document.getElementById("surveyNameInput");
  if (questionsContainer) questionsContainer.innerHTML = "";
  if (surveyNameInput) surveyNameInput.value = "";
  surveyBuilder?.classList.remove("active");
}

document.addEventListener("DOMContentLoaded", async () => {
    const loadingOverlay = document.getElementById("loadingOverlay");

    loadingOverlay.style.display = "flex";

    try {
        await loadSurveys();
    } finally {
        loadingOverlay.style.display = "none";
    }
});

//Collapsing Divs Function(s)
let firstPersonCollapsed = false;
let thirdPersonCollapsed = false;

function toggleSurveyVisibility(surveyDiv, isCollapsed) {
  surveyDiv.querySelectorAll(".SurveyAccessDiv").forEach(survey => {
    survey.style.display = isCollapsed ? "none" : "";
  });
}

firstPersonSurveys.addEventListener("click", () => {
  console.log("Testing");
  firstPersonCollapsed = !firstPersonCollapsed;
  toggleSurveyVisibility(firstPersonSurveys, firstPersonCollapsed);
});

thirdPersonSurveys.addEventListener("click", () => {
  console.log("Testing");
  thirdPersonCollapsed = !thirdPersonCollapsed;
  toggleSurveyVisibility(thirdPersonSurveys, thirdPersonCollapsed);
});
