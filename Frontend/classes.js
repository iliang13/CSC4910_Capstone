let surveyReadyHandler = null;

function openSurveyWindow(ID, pov, questionsList, title, viewOnly = false) {
  const width = 1000;
  const height = 800;

  const left = (window.screen.availWidth - width) / 2;
  const top = (window.screen.availHeight - height) / 2;

  const surveyWindow = window.open(
    "../surveyAnswering.html",
    "SurveyAnswering",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if (!surveyWindow) {
    alert(
      "Your browser blocked the survey window. Please allow popups and try again."
    );
    return;
  }

  const onReady = async (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.source !== surveyWindow) return;
    if (event.data?.type !== "surveyWindowReady") return;

    // No removeEventListener here: the popup may load more than once
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    surveyWindow.postMessage(
      {
        ID: ID,
        pov: pov,
        questionsList: questionsList,
        surveyTitle: title,
        viewOnly: viewOnly,
        accessToken: error ? null : session?.access_token,
      },
      window.location.origin
    );
  };

  // Only one responder at a time, so repeated clicks don't pile up listeners
  if (surveyReadyHandler) {
    window.removeEventListener("message", surveyReadyHandler);
  }
  surveyReadyHandler = onReady;
  window.addEventListener("message", onReady);
}

function guestOpenSurveyWindow(ID, pov, questionsList, title, inviteCode) {
  const width = 1000;
  const height = 800;

  const left = (window.screen.availWidth - width) / 2;
  const top = (window.screen.availHeight - height) / 2;

  const surveyWindow = window.open(
    "../surveyAnswering.html",
    "SurveyAnswering",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if (!surveyWindow) {
    alert(
      "Your browser blocked the survey window. Please allow popups and try again."
    );
    return;
  }

  surveyWindow.addEventListener(
    "load",
    async () => {
      surveyWindow.postMessage(
        {
          ID: ID,
          pov: pov,
          questionsList: questionsList,
          surveyTitle: title,
          accessToken: null,
          inviteCode: inviteCode,
        },
        window.location.origin
      );
    },
    { once: true }
  );
}

class SurveyQuestion {
  constructor(questionText, options) {
    this.question = document.createElement("div");
    this.question.classList.add("question");

    this.label = document.createElement("label");
    this.label.textContent = questionText;

    this.fieldset = document.createElement("fieldset");
    this.fieldset.classList.add("surveyField");

    options.forEach((option) => {
      const label = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = questionText;
      radio.value = option;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(" " + option));
      this.fieldset.appendChild(label);
    });
    this.question.appendChild(this.label);
    this.question.appendChild(this.fieldset);
  }
}

class BlankSurveyQuestion {
  constructor() {
    this.question = document.createElement("div");
    this.question.classList.add("questionCreatorBackground");

    this.div = document.createElement("div");
    this.div.classList.add("horizontalDiv");

    this.div2 = document.createElement("div");
    this.div2.classList.add("verticalDiv");

    this.label = document.createElement("textarea");
    this.label.classList.add("questionInput");
    this.label.placeholder = "Enter question text here:";

    this.label.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    });

    this.label2 = document.createElement("textarea");
    this.label2.classList.add("questionInput");
    this.label2.placeholder = "Enter third person text here:";

    this.label2.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    });

    this.label3 = document.createElement("input");
    this.label3.type = "number";
    this.label3.placeholder = "Number of options";

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.textContent = "X";
    this.button.classList.add("deleteSurveyButton");
    this.button.title = "Delete Question";

    this.button.addEventListener("click", () => {
      this.question.remove();
    });

    this.question.appendChild(this.div);
    this.div.appendChild(this.div2);
    this.div2.appendChild(this.label);
    this.div2.appendChild(this.label2);
    this.div.appendChild(this.button);
    this.question.appendChild(this.label3);
  }
}

class surveyAccessButton {
  constructor(title, ID, pov, answered, questionsList, codes = []) {
    this.div = document.createElement("div");
    this.div.classList.add("SurveyAccessDiv");
    this.div.dataset.surveyID = ID;
    this.div.dataset.pov = pov;
    this.div.dataset.answered = answered;
    this.div.dataset.questions = questionsList;

    this.nameLabel = document.createElement("label");
    this.nameLabel.textContent = title;

    this.IDLabel = document.createElement("label");
    this.IDLabel.textContent = `Survey ID: ${ID}`;

    this.answeredLabel = document.createElement("label");
    if (answered === true) {
      this.answeredLabel.textContent = "This survey has been completed.";
    } else {
      this.answeredLabel.textContent = "This survey has not been completed.";
    }

    this.inviteButton = document.createElement("button");
    this.inviteButton.textContent = "Invite Participants";
    this.inviteButton.classList.add("inviteButton");

    this.viewButton = document.createElement("button");
    this.viewButton.textContent = "View Survey";

    this.inviteCodesDropdown = document.createElement("details");
    this.inviteCodesDropdown.classList.add("inviteCodesDropdown");

    this.inviteCodesSummary = document.createElement("summary");
    this.inviteCodesSummary.textContent = "Guest Invite Codes";
    this.inviteCodesDropdown.appendChild(this.inviteCodesSummary);

    this.inviteCodeList = document.createElement("div");
    this.displayInviteCodes = (codes) => {
      this.inviteCodeList.replaceChildren();

      codes.forEach((code) => {
        const codeLabel = document.createElement("p");
        codeLabel.textContent = code;
        this.inviteCodeList.appendChild(codeLabel);
      });
    };
    this.displayInviteCodes(codes);

    this.inviteCodesMenu = document.createElement("div");
    this.inviteCodesMenu.classList.add("inviteCodesMenu");

    this.createCodeButton = document.createElement("button");
    this.createCodeButton.textContent = "Generate Invite Code\n(Single Use)";
    this.createCodeButton.addEventListener("click", async () => {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error || !session) {
        alert("Please sign in to proceed.");
        return;
      }

      this.createCodeButton.disabled = true;
      try {
        const response = await fetch("/user/generateInviteCode", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ surveyID: ID }),
        });

        const result = await response.json();

        if (!response.ok) {
          alert(result.message || result.error || JSON.stringify(result));
          return;
        }

        this.displayInviteCodes(result.inviteCodes);
      } catch (error) {
        console.error("Error generating invite code:", error);
        alert("Could not contact the server");
      } finally {
        this.createCodeButton.disabled = false;
      }
    });

    this.inviteCodesMenu.appendChild(this.inviteCodeList);
    this.inviteCodesMenu.appendChild(this.createCodeButton);
    this.inviteCodesDropdown.appendChild(this.inviteCodesMenu);

    this.horizontalDiv = document.createElement("div");
    this.horizontalDiv.classList.add("horizontalDiv");

    this.verticalDiv1 = document.createElement("div");
    this.verticalDiv1.classList.add("verticalDiv");

    this.verticalDiv2 = document.createElement("div");
    this.verticalDiv2.classList.add("verticalDiv");

    this.div.appendChild(this.horizontalDiv);
    this.horizontalDiv.appendChild(this.verticalDiv1);
    this.horizontalDiv.appendChild(this.verticalDiv2);

    this.verticalDiv1.appendChild(this.nameLabel);
    this.verticalDiv1.appendChild(this.IDLabel);
    this.verticalDiv1.appendChild(this.answeredLabel);
    this.verticalDiv1.style.alignItems = "flex-start";
    this.verticalDiv1.style.justifyContent = "center";
    this.verticalDiv1.style.paddingLeft = "10px";

    this.verticalDiv2.appendChild(this.viewButton);
    this.verticalDiv2.appendChild(this.inviteButton);
    this.verticalDiv2.appendChild(this.inviteCodesDropdown);
    this.verticalDiv2.style.alignItems = "flex-end";
    this.verticalDiv2.style.justifyContent = "center";
    this.verticalDiv2.style.paddingRight = "10px";

    this.emailInput = document.createElement("input");
    this.popup = document.createElement("div");
    this.popup.classList.add("surveyPopup");
    this.popup.setAttribute("popover", "manual");

    this.submitButton = document.createElement("button");
    this.submitButton.textContent = "Invite";

    this.inviteButton.addEventListener("click", () => {

      this.popup.textContent = "Invitees Email Address: ";
      this.popup.appendChild(this.emailInput);
      this.popup.appendChild(this.submitButton);
      document.body.appendChild(this.popup);
      this.popup.showPopover();
    });

    this.submitButton.addEventListener("click", async () => {
      const email = this.emailInput.value.trim();
      if (!email) {
        alert("Please enter an email address.");
        return;
      }

      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error || !session) {
        alert("Please sign in to proceed.");
        return;
      }
      try {
        const response = await fetch("/user/invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            surveyID: ID,
            email: email,
          }),
        });

        const result = await response.json();
        console.log("Invite response status:", response.status);
        console.log("Invite response body:", result);

        if (!response.ok) {
          alert(result.message || result.error || JSON.stringify(result));
          return;
        }
        alert("Invitation sent successfully.");
      } catch (error) {
        console.error("Error sending invitation:", error);
        alert("Could not contact the server");
      }
      this.popup.hidePopover();
    });

    this.viewButton.addEventListener("click", async () => {
      openSurveyWindow(ID, "0", questionsList, title);
    });
  }
}

class peerSurveyAccessButton {
  constructor(title, ID, pov, answered, questionsList, inviterEmail) {
    this.div = document.createElement("div");
    this.div.classList.add("SurveyAccessDiv");
    this.div.dataset.surveyID = ID;
    this.div.dataset.pov = pov;
    this.div.dataset.answered = answered;
    this.div.dataset.questions = questionsList;
    this.div.dataset.inviterEmail = inviterEmail;

    this.nameLabel = document.createElement("label");
    this.nameLabel.textContent = `${title}\nInvited By: ${inviterEmail})`;

    this.IDLabel = document.createElement("label");
    this.IDLabel.textContent = `Survey ID: ${ID}`;

    this.answeredLabel = document.createElement("label");
    if (answered === true) {
      this.answeredLabel.textContent = "This survey has been completed.";
    } else {
      this.answeredLabel.textContent = "This survey has not been completed.";
    }

    this.viewButton = document.createElement("button");
    this.viewButton.textContent = "View Survey";

    this.horizontalDiv = document.createElement("div");
    this.horizontalDiv.classList.add("horizontalDiv");

    this.verticalDiv1 = document.createElement("div");
    this.verticalDiv1.classList.add("verticalDiv");

    this.verticalDiv2 = document.createElement("div");
    this.verticalDiv2.classList.add("verticalDiv");

    this.div.appendChild(this.horizontalDiv);
    this.horizontalDiv.appendChild(this.verticalDiv1);
    this.horizontalDiv.appendChild(this.verticalDiv2);

    this.verticalDiv1.appendChild(this.nameLabel);
    this.verticalDiv1.appendChild(this.IDLabel);
    this.verticalDiv1.appendChild(this.answeredLabel);
    this.verticalDiv1.style.alignItems = "flex-start";
    this.verticalDiv1.style.justifyContent = "center";
    this.verticalDiv1.style.paddingLeft = "10px";

    this.verticalDiv2.appendChild(this.viewButton);
    this.verticalDiv2.style.alignItems = "flex-end";
    this.verticalDiv2.style.justifyContent = "center";
    this.verticalDiv2.style.paddingRight = "10px";

    this.viewButton.addEventListener("click", async () => {
      openSurveyWindow(ID, "1", questionsList, title);
    });
  }
}

class adminSurveyAccessButton {
  constructor(title, ID, pov, answered, questionsList) {
    this.div = document.createElement("div");
    this.div.classList.add("SurveyAccessDiv");
    this.div.dataset.surveyID = ID;
    this.div.dataset.pov = pov;
    this.div.dataset.answered = answered;
    this.div.dataset.questions = questionsList;

    this.nameLabel = document.createElement("label");
    this.nameLabel.textContent = title;

    this.IDLabel = document.createElement("label");
    this.IDLabel.textContent = `Survey ID: ${ID}`;

    this.inviteButton = document.createElement("button");
    this.inviteButton.textContent = "Invite Participants";
    this.inviteButton.classList.add("inviteButton");

    this.viewButton = document.createElement("button");
    this.viewButton.textContent = "View Survey";

    this.deleteButton = document.createElement("button");
    this.deleteButton.textContent = "Delete Survey";

    this.horizontalDiv = document.createElement("div");
    this.horizontalDiv.classList.add("horizontalDiv");

    this.verticalDiv1 = document.createElement("div");
    this.verticalDiv1.classList.add("verticalDiv");

    this.verticalDiv2 = document.createElement("div");
    this.verticalDiv2.classList.add("verticalDiv");

    this.div.appendChild(this.horizontalDiv);
    this.horizontalDiv.appendChild(this.verticalDiv1);
    this.horizontalDiv.appendChild(this.verticalDiv2);

    this.verticalDiv1.appendChild(this.nameLabel);
    this.verticalDiv1.appendChild(this.IDLabel);
    this.verticalDiv1.style.alignItems = "flex-start";
    this.verticalDiv1.style.justifyContent = "center";
    this.verticalDiv1.style.paddingLeft = "10px";

    this.verticalDiv2.appendChild(this.viewButton);
    this.verticalDiv2.appendChild(this.inviteButton);
    this.verticalDiv2.appendChild(this.deleteButton);
    this.verticalDiv2.style.alignItems = "flex-end";
    this.verticalDiv2.style.justifyContent = "center";
    this.verticalDiv2.style.paddingRight = "10px";

    this.emailInput = document.createElement("input");
    this.popup = document.createElement("div");
    this.popup.classList.add("surveyPopup");
    this.popup.setAttribute("popover", "manual");

    this.submitButton = document.createElement("button");
    this.submitButton.textContent = "Invite";

    this.inviteButton.addEventListener("click", () => {
      this.popup.textContent = "Invitees Email Address: ";
      this.popup.appendChild(this.emailInput);
      this.popup.appendChild(this.submitButton);
      document.body.appendChild(this.popup);
      this.popup.showPopover();
    });

    this.submitButton.addEventListener("click", async () => {
      const email = this.emailInput.value.trim();
      if (!email) {
        alert("Please enter an email address.");
        return;
      }

      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error || !session) {
        alert("Please sign in to proceed.");
        return;
      }
      try {
        const response = await fetch("/admin/invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            surveyID: ID,
            email: email,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          alert(result.message || result.error || JSON.stringify(result));
          return;
        }
        alert("Invitation sent successfully.");
      } catch (error) {
        console.error("Error sending invitation:", error);
        alert("Could not contact the server");
      }
      this.popup.hidePopover();
    });

    this.viewButton.addEventListener("click", async () => {
      openSurveyWindow(ID, "0", questionsList, title, true);
    });

    this.deleteButton.addEventListener("click", async () => {
      if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
      try {
        const response = await fetch("/admin/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            surveyID: ID,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          alert(result.message || result.error || JSON.stringify(result));
          return;
        }
        alert("Survey deleted successfully.");
        window.location.reload();
      } catch (error) {
        console.error("Error deleting survey:", error);
        alert("Could not contact the server");
      }
    });
  }
}

function CreateSurveyQuestion(questionText, numAnswers) {
  const answers = [];
  for (let i = 0; i < numAnswers; i++) {
    answers.push(i + 1);
  }
  const question = new SurveyQuestion(questionText, answers);
  return question;
}

function CreateBlankSurveyQuestion() {
  const question = new BlankSurveyQuestion();
  document.getElementById("questionsContainer").appendChild(question.question);
}

function createSurveyAccessButton(
  title,
  ID,
  pov,
  answered,
  questionsList,
  inviterEmail,
  codes = []
) {
  if (pov === "0") {
    const tempSurveyAccessButton = new surveyAccessButton(
      title,
      ID,
      pov,
      answered,
      questionsList,
      codes
    );
    firstPersonSurveys.appendChild(tempSurveyAccessButton.div);
  }
  if (pov === "1") {
    const tempSurveyAccessButton = new peerSurveyAccessButton(
      title,
      ID,
      pov,
      answered,
      questionsList,
      inviterEmail
    );
    thirdPersonSurveys.appendChild(tempSurveyAccessButton.div);
  }
}

function createAdminSurveyAccessButton(
  title,
  ID,
  pov,
  answered,
  questionsList,
  inviterEmail
) {
  const tempSurveyAccessButton = new adminSurveyAccessButton(
    title,
    ID,
    pov,
    answered,
    questionsList
  );
  firstPersonSurveys.appendChild(tempSurveyAccessButton.div);
}

let answerShortcutHandler = null;

function setupAnswerShortcuts(container) {
  const questions = () => Array.from(container.querySelectorAll(".question"));
  let current = 0;

  const highlight = (scroll = true) => {
    questions().forEach((q, i) => {
      q.style.boxShadow = i === current ? "0 0 0 3px #d39805" : "";
    });
    if (scroll) {
      questions()[current]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  };

  if (!document.getElementById("shortcutHint")) {
    const hint = document.createElement("p");
    hint.id = "shortcutHint";
    hint.textContent =
      "Tip: press 1\u20139 to answer the highlighted question.";
    hint.style.color = "#cfd3dc";
    container.before(hint);
  }

  if (answerShortcutHandler) {
    document.removeEventListener("keydown", answerShortcutHandler);
  }

  answerShortcutHandler = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!/^[1-9]$/.test(event.key)) return;

    const qs = questions();
    if (qs.length === 0) return;

    const radios = qs[current].querySelectorAll('input[type="radio"]');
    const choice = radios[Number(event.key) - 1];
    if (!choice) return; // that question doesn't have this many options

    choice.checked = true;
    qs[current].style.outline = ""; // clear the red "unanswered" outline
    if (current < qs.length - 1) current++;
    highlight();
  };
  document.addEventListener("keydown", answerShortcutHandler);

  container.addEventListener("click", (event) => {
    const clicked = event.target.closest(".question");
    const index = questions().indexOf(clicked);
    if (index !== -1) {
      current = index;
      highlight(false);
    }
  });

  highlight(false);
}

function renderSurveyQuestions(
  ID,
  pov,
  questionsList,
  accessToken,
  title,
  viewOnly = false,
  inviteCode
) {
  console.log("renderSurveyQuestions fired");
  console.log("title:", title);
  console.log("questionsList:", questionsList);

  const surveyAnsweringDiv = document.getElementById("surveyAnsweringDiv");
  surveyAnsweringDiv.classList.add("active");
  document.getElementById("surveyTitle").textContent = title;

  console.log("before clear");

  surveyAnsweringDiv.replaceChildren();

  for (let i = 0; i < questionsList.length; i++) {
    console.log("Question data: ", questionsList[i]);
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

  if (accessToken) {
    submitButton.addEventListener("click", async () => {
      const responses = {};

      document
        .querySelectorAll("#surveyAnsweringDiv .question")
        .forEach((question, index) => {
          const selected = question.querySelector(
            'input[type="radio"]:checked'
          );

          responses[`question_${index + 1}`] = selected ? selected.value : null;
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

      console.log("Survey:", ID);
      console.log("Responses:", responses);

      if (!accessToken) {
        document.getElementById("output").textContent =
          "Please sign in to submit the survey.";
        return;
      }

      try {
        submitButton.disabled = true;
        const res = await fetch(
          pov === "0" ? "/submitSurvey/personal" : "/submitSurvey/peer",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              surveyID: ID,
              pov: pov,
              responses: responses,
            }),
          }
        );

        const data = await res.json();
        if (!res.ok) submitButton.disabled = false;

        document.getElementById("output").textContent = res.ok
          ? data.message
          : data.error;

        if (res.ok && window.opener && !window.opener.closed) {
          window.opener.location.reload();
        }
      } catch (err) {
        submitButton.disabled = false;
        document.getElementById("output").textContent = err.message;
      }
    });
  } else {
    submitButton.addEventListener("click", async () => {
      const responses = {};

      document
        .querySelectorAll("#surveyAnsweringDiv .question")
        .forEach((question, index) => {
          const selected = question.querySelector(
            'input[type="radio"]:checked'
          );

          responses[`question_${index + 1}`] = selected ? selected.value : null;
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

      try {
        submitButton.disabled = true;
        const res = await fetch("/submitSurvey/guest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            surveyID: ID,
            pov: pov,
            inviteCode: inviteCode,
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
  }
  console.log("questions rendered:", surveyAnsweringDiv.children.length);
  if (!viewOnly) {
    surveyAnsweringDiv.appendChild(submitButton);
  }
}

function filterSurveys() {
  const input = document.getElementById("surveySearch");
  if (!input) return;

  const query = input.value.trim().toLowerCase();
  let visible = 0;

  document.querySelectorAll(".SurveyAccessDiv").forEach((card) => {
    const title = card.querySelector("label")?.textContent || "";
    const haystack = `${title} ${card.dataset.surveyID || ""}`.toLowerCase();
    const matches = !query || haystack.includes(query);

    card.style.display = matches ? "" : "none";
    if (matches) visible++;
  });

  let message = document.getElementById("surveySearchEmpty");
  if (!message) {
    message = document.createElement("p");
    message.id = "surveySearchEmpty";
    document.getElementById("surveysDiv")?.prepend(message);
  }
  message.textContent =
    query && visible === 0 ? `No surveys match "${input.value.trim()}".` : "";
}

document.addEventListener("input", (event) => {
  if (event.target.id === "surveySearch") filterSurveys();
});
