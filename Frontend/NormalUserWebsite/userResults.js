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
    list.textContent = "Please sign in to see your results.";
    return;
  }

  try {
    const res = await fetch("/user/myResponses", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error("Failed to load");
    const items = await res.json();

    if (items.length === 0) {
      list.textContent = "You haven't submitted any surveys yet.";
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

      list.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    list.textContent = "Unable to load your results.";
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
