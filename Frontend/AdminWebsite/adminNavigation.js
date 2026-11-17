const surveysButton = document.getElementById("SurveysBtn");
const invitesButton = document.getElementById("InvitesBtn");
const personalResultsButton = document.getElementById("PersonalResults");
const homeButton = document.getElementById("home");
const signInButton = document.getElementById("signIn");
const signOutButton = document.getElementById("signOut");

//Handles SignIn-SignOut swapping
function updateAuthenticationButtons(isSignedIn) {
  console.log("Update button clicked");
  signInButton.hidden = isSignedIn;
  signOutButton.hidden = !isSignedIn;
}


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


      // Universal Authentication2 Setup
      const authDialog = document.getElementById("authDialog");
      const authForm = document.getElementById("authForm");

      const authTitle = document.getElementById("authTitle");

      const googleAuthButton = document.getElementById("googleAuthButton");
      const authMessage = document.getElementById("authMessage");
      const authStorageKey = "datapulse360-auth";
      let supabaseClient;
      let authSetupState = "loading";

      googleAuthButton.disabled = true;

      function openAuthDialog() {
        authForm.reset();
        authTitle.textContent = "Sign In";
        googleAuthButton.textContent = "Sign in with Google";
        authMessage.textContent = authSetupState === "ready"
          ? ""
          : authSetupState === "loading"
            ? "Loading secure sign-in..."
            : "Sign-in setup could not load. Refresh the page and try again.";
        authDialog.showModal();
      }

      signInButton.addEventListener("click", () => openAuthDialog());
      document.getElementById("closeAuthDialog").addEventListener("click", () => authDialog.close());

      async function signOutCurrentSession() {
        const { error } = await supabaseClient.auth.signOut({ scope: "global" });
        if (error) throw error;

        await fetch("/api/admin-session/logout", {
          method: "POST",
        });

        const userStatus = document.getElementById("userStatus");
        if (userStatus) {
          userStatus.textContent = "Not Signed In";
        }
      }

      googleAuthButton.addEventListener("click", async () => {
        if (!supabaseClient) {
          authMessage.textContent = "Sign-in setup could not load. Refresh the page and try again.";
          return;
        }

        googleAuthButton.disabled = true;
        authMessage.textContent = "";
        try {
          const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}${window.location.pathname}`,
              queryParams: { prompt: "select_account" },
            },
          });
          if (error) throw error;
        } catch (err) {
          authMessage.textContent = err.message || "Google sign-in failed.";
          googleAuthButton.disabled = false;
        }
      });

      async function showAuthenticatedUser(session) {
        const userStatus = document.getElementById("userStatus");
        const welcomeMessage = document.getElementById("welcomeMessage");
        const output = document.getElementById("output");

        if (!session) {
          if (userStatus) {
            userStatus.textContent = "Not Signed In";
          }
          updateAuthenticationButtons(false);
          return;
        }

        try {
          const response = await fetch("/api/me", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error || "Could not verify account.");
          }

          const adminResponse = await fetch("/api/admin-session", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (!adminResponse.ok && adminResponse.status !== 403) {
            throw new Error("Could not establish administrator session. Please sign in as an administrator.");
          }

          if (adminResponse.ok) {
            window.location.href = "/admin/home";
            return;
          } else if (adminResponse.status === 403) {
            if (window.location.pathname !== "/user/home") {
              window.location.href = "/user/home";
            }
            return;
          }

          if (userStatus) {
            userStatus.textContent = `Signed in as ${payload.user.email}`;
            updateAuthenticationButtons(true);
          }

          if (welcomeMessage) {
            welcomeMessage.querySelector("h2").textContent =
              `Welcome Back, ${payload.user.email}`;
          }

          if (output) {
            output.textContent = "Successfully signed in.";
          }
        } catch (err) {
          if (userStatus) {
            userStatus.textContent = "Not Signed In";
            updateAuthenticationButtons(false);
          }

          if (output) {
            output.textContent = err.message;
          }
        }
      }

      fetch("/api/config")
        .then(async (response) => {
          const config = await response.json();
          if (!response.ok) throw new Error(config.error || "Authentication setup is unavailable.");
          if (!window.supabase?.createClient) {
            throw new Error("The sign-in library did not load.");
          }
          if (typeof config.supabaseUrl !== "string" || typeof config.supabaseAnonKey !== "string") {
            throw new Error("The server returned incomplete sign-in configuration.");
          }
          supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: {
              storage: window.sessionStorage,
              storageKey: authStorageKey,
            },
          });

          supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === "TOKEN_REFRESHED" && session) {
              fetch("/api/admin-session", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }).then(async (response) => {
                if (!response.ok && response.status !== 403) {
                  console.error("Failed to refresh admin session.");
                }
              }).catch((error) => {
                console.error("Admin session refresh failed:", error);
              });
            }
          });
          const { data } = await supabaseClient.auth.getSession();
          
          authSetupState = "ready";
          googleAuthButton.disabled = false;

          await showAuthenticatedUser(data.session);
        })
        .catch((err) => {
          authSetupState = "error";
          googleAuthButton.disabled = true;
          console.error("Could not initialize sign-in:", err);
          authMessage.textContent = "Sign-in setup could not load. Refresh the page and try again.";
          document.getElementById("output").textContent = err.message;
        });
