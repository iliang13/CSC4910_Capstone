const surveyBuilder = document.getElementById("surveyBuilder");
const surveyAccessDisplay = document.getElementById(
  "displaySurveyAccessButtons"
);

const firstPersonSurveys = document.getElementById("firstPersonSurveys");
const thirdPersonSurveys = document.getElementById("thirdPersonSurveys");


let currentSurveyID = null;

document.addEventListener("click", (event) => {
  const popups = document.querySelectorAll(".surveyPopup:popover-open");
  popups.forEach((popup) => {
    // Check whether the click was inside the popup
    if (popup.contains(event.target)) {
      return;
    }
    // Check whether the click was on a button that opens a popup
    if (
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
        survey.alreadyAnswered,
        survey.questions,
        null,
        survey.inviteCodes
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

firstPersonSurveys.addEventListener("click", (clickEvent) => {
  if (clickEvent.target.closest(".SurveyAccessDiv")) return;
  
  firstPersonCollapsed = !firstPersonCollapsed;
  toggleSurveyVisibility(firstPersonSurveys, firstPersonCollapsed);
});

thirdPersonSurveys.addEventListener("click", (clickEvent) => {
  if (clickEvent.target.closest(".SurveyAccessDiv")) return;

  thirdPersonCollapsed = !thirdPersonCollapsed;
  toggleSurveyVisibility(thirdPersonSurveys, thirdPersonCollapsed);
});
