const surveysButton = document.getElementById("SurveysBtn");
const invitesButton = document.getElementById("InvitesBtn");
const personalResultsButton = document.getElementById("PersonalResults");
const homeButton = document.getElementById("home");



surveysButton.addEventListener("click", () => {
    window.location.href = "/admin/surveys";
});

invitesButton.addEventListener("click", () => {
    window.location.href = "/admin/invites";
});

personalResultsButton.addEventListener("click", () => {
    window.location.href = "/admin/results";
});

homeButton.addEventListener("click", () => {
    window.location.href = "/admin/home";
});