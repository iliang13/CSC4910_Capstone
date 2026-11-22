const createSurveyButton = document.getElementById("CreateSurvey");
const surveyBuilder = document.getElementById("surveyBuilder");
const addQuestionButton = document.getElementById("addQuestion");
const saveSurveyButton = document.getElementById("saveSurvey");
const submitSurveyCodeButton = document.getElementById("submitSurveyCode");
const firstPersonSurveys = document.getElementById("displaySurveyAccessButtons");
const popup = document.getElementById("codePopup");

let currentSurveyID = null;
let currentPOV = null;

function openSurveyCreationWindow() {
  const width = 1000;
  const height = 800;

  const left = (window.screen.availWidth - width) / 2;
  const top = (window.screen.availHeight - height) / 2;

  const creationWindow = window.open(
    "../surveyCreation.html",
    "SurveyCreation",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if (!creationWindow) {
    alert("Your browser blocked the survey window. Please allow popups and try again.");
    return;
  }

  refreshAdminSession().catch((err) => {
    creationWindow.close();
    alert(err.message || "Administrator sign-in required to create surveys.");
  });
}

// Re-issues the admin cookie from the live Supabase session.
async function refreshAdminSession() {
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();

  if (error || !session) {
    throw new Error("Administrator sign-in required to create surveys.");
  }

  const response = await fetch("/api/admin-session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Administrator sign-in required to create surveys.");
  }
}

submitSurveyCodeButton.addEventListener("click", async () => {
          const inviteCode = document.getElementById("surveyCode").value.trim();
          const alreadyAdded = Array.from(document.querySelectorAll(".SurveyAccessDiv")).some((button) => {
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
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ 
                surveyID: inviteCode
              })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
              alert(result.message);
              return;
            }
            createAdminSurveyAccessButton(result.surveyName, result.surveyId, result.pov, false, result.questions); //title, ID, pov, answered, questionsList
            alert("Survey Added Successfully");
          } catch (error) {
            console.error("Error validating survey code:", error);
            alert("Could not contact the server");
    }
  popup.hidePopover();
});

createSurveyButton.addEventListener("click", () => {
    openSurveyCreationWindow();  
});

async function loadSurveys() {
    try {
        const response = await fetch("/admin/loadSurveys");

        if (!response.ok) {
            throw new Error("Failed to load surveys");
        }
        const surveys = await response.json();
        firstPersonSurveys.replaceChildren();

        surveys.forEach((survey) => { //title, ID, pov, answered, questionsList
            createAdminSurveyAccessButton(survey.title, survey.survey_id, "0", false, survey.questions);
        });
    } catch (error) {
        console.error("Error loading surveys:", error);
        firstPersonSurveys.textContent = "Unable to load surveys.";
    }
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

document.addEventListener("click", (event) => {
    const popups = document.querySelectorAll(".surveyPopup:popover-open");
    popups.forEach((popup) => {
        // Check whether the click was inside the popup
        if (popup.contains(event.target)) {
            return;
        }
        // Check whether the click was on a button that opens a popup
        if (submitSurveyCodeButton.contains(event.target) || event.target.closest(".inviteButton")) {
            return;
        }
        popup.hidePopover();
    });
});