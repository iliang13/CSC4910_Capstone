async function loadMyResponses() {
  const list = document.getElementById("resultsList");
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

    list.replaceChildren();
    items.forEach((item) => {
      const card = document.createElement("div");
      const h = document.createElement("h3");
      h.textContent = item.title || "Untitled survey";
      card.appendChild(h);

      item.questions.forEach((q, i) => {
        const p = document.createElement("p");
        p.textContent = `${q.questionText}: ${
          item.answers[`question_${i + 1}`] ?? "No answer"
        }`;
        card.appendChild(p);
      });
      list.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    list.textContent = "Unable to load your results.";
  }
}
loadMyResponses();
