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
          this.question.classList.add("question");

          this.div = document.createElement("div");
          this.div.classList.add("horizontalDiv");

          this.div2 = document.createElement("div");
          this.div2.classList.add("verticalDiv");

          this.label = document.createElement("textarea");
          this.label.classList.add("questionInput");
          this.label.placeholder = "Enter question text here:";

          this.label.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = (this.scrollHeight) + "px";
          });

          this.label2 = document.createElement("textarea");
          this.label2.classList.add("questionInput");
          this.label2.placeholder = "Enter third person text here:";

          this.label2.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = (this.scrollHeight) + "px";
          });

          this.label3 = document.createElement("input");
          this.label3.type = "number";
          this.label3.placeholder = "Number of options";

          this.button = document.createElement("button");
          this.button.type = "button";
          this.button.textContent = "X";
          this.button.classList.add("deleteSurveyButton");

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

          this.answeredLabel = document.createElement("label");
          if (answered === true) {
            this.answeredLabel.textContent = "This survey has been completed.";
          } else {
            this.answeredLabel.textContent = "This survey has not been completed.";
          }

          this.inviterEmailLabel = document.createElement("label");
          this.inviterEmailLabel.textContent = `Invited By: ${inviterEmail}`;

          this.inviteButton = document.createElement("button");
          this.inviteButton.textContent = "Invite Participants";
          this.inviteButton.classList.add("inviteButton");

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
          this.verticalDiv1.appendChild(this.inviterEmailLabel);
          this.verticalDiv1.style.alignItems = "flex-start";
          this.verticalDiv1.style.justifyContent = "center";
          this.verticalDiv1.style.paddingLeft = "10px";


          this.verticalDiv2.appendChild(this.viewButton);
          this.verticalDiv2.appendChild(this.inviteButton);
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
            const surveyCode = `S${ID}`;

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
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error || !session) {
              alert("Please sign in to proceed.");
              return;
            }
            try {
              const response = await fetch("/user/invite", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ 
                  surveyID: ID,
                  email: email
                })
              });
              
              const result = await response.json();
              
              if (!response.ok) {
                alert(result.message);
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
            currentSurveyID = ID;
            potentialMainPageDivs.forEach((div) => {
              div.classList.remove("active");
            });
            surveyAnsweringDiv.classList.add("active");
            clearSurvey()
            console.log("POV:", pov, typeof pov);
            console.log("Questions:", questionsList);
            surveyAnsweringDiv.replaceChildren();
            for (let i = 0; i < questionsList.length; i++) {
              if (pov === "0") {
                surveyAnsweringDiv.appendChild(
                  CreateSurveyQuestion(
                    questionsList[i].questionText,
                    questionsList[i].numberOfOptions
                  ).question
                );
              }
              else if (pov === "1") {
                surveyAnsweringDiv.appendChild(CreateSurveyQuestion(questionsList[i].thirdPersonText, questionsList[i].numberOfOptions).question);
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

                    const selected =
                      question.querySelector(
                        'input[type="radio"]:checked'
                      );

                    responses[`question_${index + 1}`] =
                      selected ? selected.value : null;
                  });

                const unanswered =
                  Object.values(responses).some(
                    answer => answer === null
                  );

                if (unanswered) {
                  document.getElementById("output").textContent =
                    "Please answer all questions.";
                  return;
                }

                console.log("Survey:", currentSurveyID);
                console.log("Responses:", responses);

            });

            surveyAnsweringDiv.appendChild(submitButton);
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
            const surveyCode = `S${ID}`;

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
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error || !session) {
              alert("Please sign in to proceed.");
              return;
            }
            try {
              const response = await fetch("/user/invite", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ 
                  surveyID: ID,
                  email: email
                })
              });
              
              const result = await response.json();
              
              if (!response.ok) {
                alert(result.message);
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
            currentSurveyID = ID;
            potentialMainPageDivs.forEach((div) => {
              div.classList.remove("active");
            });
            surveyAnsweringDiv.classList.add("active");
            clearSurvey()
            console.log("POV:", pov, typeof pov);
            console.log("Questions:", questionsList);
            surveyAnsweringDiv.replaceChildren();
            for (let i = 0; i < questionsList.length; i++) {
              if (pov === "0") {
                surveyAnsweringDiv.appendChild(
                  CreateSurveyQuestion(
                    questionsList[i].questionText,
                    questionsList[i].numberOfOptions
                  ).question
                );
              }
              else if (pov === "1") {
                surveyAnsweringDiv.appendChild(CreateSurveyQuestion(questionsList[i].thirdPersonText, questionsList[i].numberOfOptions).question);
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

                    const selected =
                      question.querySelector(
                        'input[type="radio"]:checked'
                      );

                    responses[`question_${index + 1}`] =
                      selected ? selected.value : null;
                  });

                const unanswered =
                  Object.values(responses).some(
                    answer => answer === null
                  );

                if (unanswered) {
                  document.getElementById("output").textContent =
                    "Please answer all questions.";
                  return;
                }

                console.log("Survey:", currentSurveyID);
                console.log("Responses:", responses);

            });

            surveyAnsweringDiv.appendChild(submitButton);
          });
        }
      }



function CreateSurveyQuestion(questionText, numAnswers) { 
        const answers = [];
        for (let i = 0; i < numAnswers; i++) {
          answers.push(i+1);
        }
        const question = new SurveyQuestion(
          questionText,
          answers,
        );
        return question;
      }


function CreateBlankSurveyQuestion() { 
        const question = new BlankSurveyQuestion();
          document.getElementById("questionsContainer").appendChild(question.question);
      }
    
function createSurveyAccessButton(title, ID, pov, answered, questionsList, inviterEmail) {
        if (pov === "0") {
          const tempSurveyAccessButton = new surveyAccessButton(title, ID, pov, answered, questionsList);
          firstPersonSurveys.appendChild(tempSurveyAccessButton.div);
        }
        if (pov === "1") {
          const tempSurveyAccessButton = new peerSurveyAccessButton(title, ID, pov, answered, questionsList, inviterEmail);
          thirdPersonSurveys.appendChild(tempSurveyAccessButton.div);
        }
      }