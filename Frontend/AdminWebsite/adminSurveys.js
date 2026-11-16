const createSurveyButton = document.getElementById("CreateSurvey");
const surveyBuilder = document.getElementById("surveyBuilder");
const addQuestionButton = document.getElementById("addQuestion");
const saveSurveyButton = document.getElementById("saveSurvey");
const submitSurveyCodeButton = document.getElementById("submitSurveyCode");
const firstPersonSurveys = document.getElementById("displaySurveyAccessButtons");
//const surveyAnsweringDiv = document.getElementById("surveyAnsweringDiv"); might not be needed. Can delete after testing.
const popup = document.getElementById("codePopup");

let currentSurveyID = null;
let currentPOV = null;

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
    const questionsContainer = document.getElementById("questionsContainer");
    if (questionsContainer.children.length === 0) {
        surveyBuilder.classList.add("active");
        CreateBlankSurveyQuestion();
    }   
});

addQuestionButton.addEventListener("click", () => {
    CreateBlankSurveyQuestion();
})

saveSurveyButton.addEventListener("click", async () => { 
    const questionElements = document.querySelectorAll("#questionsContainer .question");
    const surveyNameInput = document.getElementById("surveyNameInput");

    const questions = [];

    for (const element of questionElements) {
        const textareas = element.querySelectorAll("textarea");
        const optionInput = element.querySelector('input[type="number"]');

            
        const questionText =  textareas[0].value.trim();
        const thirdPersonText = textareas[1].value.trim();
        const numberOfOptions = Number(optionInput.value);

        if (!questionText || !thirdPersonText || isNaN(numberOfOptions)) {
            document.getElementById("output").textContent = "Please fill in all fields."
            return;
        }

        if (optionInput.value.trim() === "" ||!Number.isInteger(numberOfOptions) ||numberOfOptions < 1) {
            document.getElementById("output").textContent = "Please enter a whole number greater than 0.";
            return;
        }

        questions.push({
            questionText: questionText,
            thirdPersonText: thirdPersonText,
            numberOfOptions: numberOfOptions
        });
    }

    if (questions.length === 0) {
        document.getElementById("output").textContent = "Please add at least one question.";
        return;
    }

    try {
        const response = await fetch("/saveSurvey", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                surveyName: surveyNameInput.value.trim(),
                questions: questions})
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to save survey.");
        }

        document.getElementById("output").textContent = "Survey saved successfully.";

    } catch (error) {
        document.getElementById("output").textContent = "Error saving survey: " + error.message;
    }
    clearSurvey()
});

function clearSurvey() {
    const questionsContainer = document.getElementById("questionsContainer");
    const surveyNameInput = document.getElementById("surveyNameInput");
    questionsContainer.innerHTML = "";
    surveyNameInput.value = "";
    surveyBuilder.classList.remove("active"); 
}

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

document.addEventListener("DOMContentLoaded", loadSurveys);

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