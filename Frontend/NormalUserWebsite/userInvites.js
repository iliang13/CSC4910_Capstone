const main = document.getElementById("main");

class surveyInviteeDiv {
  constructor(title, unansweredList, answeredList) {
    this.mainDiv = document.createElement("div");
    this.mainDiv.classList.add("verticalDiv");
    this.mainDiv.dataset.title = title;

    this.nameLabel = document.createElement("label");
    this.nameLabel.textContent = title;

    this.compeletedLabel = document.createElement("label");
    this.compeletedLabel.textContent = "Users Who Have Completed This Survey";

    this.completedDiv = document.createElement("div")
    this.completedDiv.classList.add("verticalDiv");

    this.uncompeletedLabel = document.createElement("label");
    this.uncompeletedLabel.textContent = "Users Who Have Not Completed This Survey";

    this.uncompletedDiv = document.createElement("div")
    this.uncompletedDiv.classList.add("verticalDiv");

    for (let i = 0; i < answeredList.length; i++) {
        let userLabel = document.createElement("label");
        userLabel.textContent = answeredList[i];

        this.completedDiv.appendChild(userLabel);
    }

    for (let i = 0; i < unansweredList.length; i++) {
        let userLabel = document.createElement("label");
        userLabel.textContent = unansweredList[i];

        this.uncompletedDiv.appendChild(userLabel);
    }

    this.mainDiv.appendChild(this.nameLabel);

    this.mainDiv.appendChild(this.compeletedLabel);
    this.mainDiv.appendChild(this.completedDiv);

    this.mainDiv.appendChild(this.uncompeletedLabel);
    this.mainDiv.appendChild(this.uncompletedDiv);

  }
}

function createSurveyInviteeDiv(title, unansweredList, answeredList) {
    const inviteeDiv = new surveyInviteeDiv(title, unansweredList, answeredList);
    main.appendChild(inviteeDiv.mainDiv);
}

async function loadInvitesPage() {
  await supabaseReady;

  if (authSetupState !== "ready") return;

  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error || !session) {
    alert("Please sign in to proceed.");
    return;
  }

  try {
    const response = await fetch("/user/loadInviteesTab", {
      headers: {
        "Authorization": `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to load invitees tab");
    }

    const surveys = await response.json();

    main.replaceChildren();

    surveys.forEach((survey) => { //title, ID, pov, answered, questionsList
      createSurveyInviteeDiv(survey.title, survey.unansweredList, survey.answeredList)
    });
  } catch (error) {
    console.error("Error loading invitees tab:", error);
    main.textContent = "Unable to load invitees tab.";
  }
}

loadInvitesPage();