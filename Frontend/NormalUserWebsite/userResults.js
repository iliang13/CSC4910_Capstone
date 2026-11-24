let loadedItems = [];

function csvCell(value) {
  let text = String(value ?? "");
  // Stop spreadsheet apps from treating text as a formula
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadResultsCsv() {
  const rows = [["Survey", "Question #", "Question", "My Answer"]];
  loadedItems.forEach((item) => {
    item.questions.forEach((q, i) => {
      rows.push([
        item.title || "Untitled survey",
        i + 1,
        q.questionText,
        item.answers[`question_${i + 1}`] ?? "",
      ]);
    });
  });

  const csv = "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-survey-results.csv";
  a.click();
  URL.revokeObjectURL(url);
}
function showEmptyState(list, title, text, withButton = false) {
  list.replaceChildren();

  const box = document.createElement("div");
  box.className = "emptyState";

  const icon = document.createElement("div");
  icon.className = "emptyStateIcon";
  icon.textContent = "📋";

  const h = document.createElement("h3");
  h.textContent = title;

  const p = document.createElement("p");
  p.textContent = text;

  box.append(icon, h, p);

  if (withButton) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "View Surveys";
    btn.addEventListener("click", () => {
      window.location.href = "/user/surveys";
    });
    box.appendChild(btn);
  }

  list.appendChild(box);
}

async function downloadSurveyCsv(surveyID, button) {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) {
    alert("Please sign in to download your results.");
    return;
  }

  button.disabled = true;
  try {
    const res = await fetch(
      `/user/myResponses/${encodeURIComponent(surveyID)}/csv`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    if (!res.ok) throw new Error("Download failed");

    const match = /filename="([^"]+)"/.exec(
      res.headers.get("Content-Disposition") || ""
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = match ? match[1] : "survey-results.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Could not download this survey's results.");
  } finally {
    button.disabled = false;
  }
}

async function loadMyResponses() {
  const list = document.getElementById("resultsList");
  const downloadButton = document.getElementById("downloadResults");
  downloadButton.addEventListener("click", downloadResultsCsv);

  await supabaseReady;
  if (authSetupState !== "ready") return;

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) {
    showEmptyState(
      list,
      "Please sign in",
      "Sign in to see the surveys you've submitted."
    );
    return;
  }

  try {
    const res = await fetch("/user/myResponses", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error("Failed to load");
    const items = await res.json();

    if (items.length === 0) {
      showEmptyState(
        list,
        "No survey results yet",
        "Once you submit a survey, your answers and peer feedback will show up here.",
        true
      );
      return;
    }

    loadedItems = items;
    downloadButton.hidden = false;

    list.replaceChildren();
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "resultCard";

      const h = document.createElement("h3");
      h.textContent = item.title || "Untitled survey";
      card.appendChild(h);

      item.questions.forEach((q, i) => {
        const row = document.createElement("div");
        row.className = "resultRow";

        const question = document.createElement("span");
        question.textContent = q.questionText;

        const answer = document.createElement("span");
        answer.className = "resultAnswer";
        answer.textContent = item.answers[`question_${i + 1}`] ?? "—";

        row.append(question, answer);
        card.appendChild(row);
      });

      const csvButton = document.createElement("button");
      csvButton.type = "button";
      csvButton.className = "csvButton";
      csvButton.textContent = "Download CSV";
      csvButton.addEventListener("click", () =>
        downloadSurveyCsv(item.surveyID, csvButton)
      );
      card.appendChild(csvButton);

      list.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    showEmptyState(
      list,
      "Couldn't load your results",
      "Something went wrong. Please refresh the page and try again."
    );
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const loadingOverlay = document.getElementById("loadingOverlay");

  loadingOverlay.style.display = "flex";

  try {
    await loadMyResponses();
  } finally {
    loadingOverlay.style.display = "none";
  }
});
