const surveysButton = document.getElementById("SurveysBtn");
const invitesButton = document.getElementById("InvitesBtn");
const personalResultsButton = document.getElementById("PersonalResults");
const homeButton = document.getElementById("home");

const signUpButton = document.getElementById("signUp");
const signInButton = document.getElementById("signIn");

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


        //Universal Authentication Setup
        const authDialog = document.getElementById("authDialog");
        const authForm = document.getElementById("authForm");
        const authEmail = document.getElementById("authEmail");
        const authPassword = document.getElementById("authPassword");
        const authTitle = document.getElementById("authTitle");
        const authSubmit = document.getElementById("authSubmit");
        const googleAuthButton = document.getElementById("googleAuthButton");
        const authMessage = document.getElementById("authMessage");
        const googleAuthAttemptKey = "googleAuthAttempt";
        const authStorageKey = "datapulse360-auth";
        let supabaseClient;
        let authSetupState = "loading";
        let authMode = "signin";
        authSubmit.disabled = true;
        googleAuthButton.disabled = true;

        function openAuthDialog(mode) {
          authMode = mode;
          const isSignUp = mode === "signup";
          authForm.reset();
          authTitle.textContent = isSignUp ? "Create Account" : "Sign In";
          authSubmit.textContent = isSignUp ? "Create Account" : "Sign In";
          googleAuthButton.textContent = isSignUp ? "Sign up with Google" : "Sign in with Google";
          authPassword.autocomplete = isSignUp ? "new-password" : "current-password";
          authMessage.textContent = authSetupState === "ready"
            ? ""
            : authSetupState === "loading"
              ? "Loading secure sign-in..."
              : "Sign-in setup could not load. Refresh the page and try again.";
          authDialog.showModal();
        }

        signUpButton.addEventListener("click", () => openAuthDialog("signup"));
        signInButton.addEventListener("click", () => openAuthDialog("signin"));
        document.getElementById("closeAuthDialog").addEventListener("click", () => authDialog.close());

        async function signOutCurrentSession() {
            const { error } = await supabaseClient.auth.signOut({ scope: "local" });
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
            if (authMode === "signup") {
              await signOutCurrentSession();
            }
            sessionStorage.setItem(googleAuthAttemptKey, JSON.stringify({
              mode: authMode,
              startedAt: Math.floor(Date.now() / 1000) * 1000,
            }));
            const { error } = await supabaseClient.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: `${window.location.origin}${window.location.pathname}`,
                queryParams: { prompt: "select_account" },
              },
            });
            if (error) throw error;
          } catch (err) {
            sessionStorage.removeItem(googleAuthAttemptKey);
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

            if (userStatus) {
              userStatus.textContent = `Signed in as ${payload.user.email}`;
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
            }

            if (output) {
              output.textContent = err.message;
            }
          }
        }

        async function handleGoogleAuthSession(session) {
          const savedAttempt = sessionStorage.getItem(googleAuthAttemptKey);
          if (!savedAttempt) {
            await showAuthenticatedUser(session);
            return;
          }

          sessionStorage.removeItem(googleAuthAttemptKey);
          let attempt;
          try {
            attempt = JSON.parse(savedAttempt);
          } catch {
            await supabaseClient.auth.signOut();
            throw new Error("Could not verify the Google sign-in request. Please try again.");
          }

          if (
            !attempt ||
            !["signup", "signin"].includes(attempt.mode) ||
            !Number.isFinite(attempt.startedAt)
          ) {
            await supabaseClient.auth.signOut();
            throw new Error("Could not verify the Google sign-in request. Please try again.");
          }

          if (!session) {
            openAuthDialog(attempt.mode);
            authMessage.textContent = "No sign-in session was created. Please try again.";
            return;
          }

          const createdAt = Date.parse(session.user.created_at);
          if (!Number.isFinite(createdAt)) {
            await supabaseClient.auth.signOut();
            throw new Error("Could not verify when this Google account was created. Please try again.");
          }

          const isNewAccount = createdAt >= attempt.startedAt;
          if (attempt.mode === "signup" && !isNewAccount) {
            await supabaseClient.auth.signOut();
            openAuthDialog("signup");
            authMessage.textContent = "This Google account already exists. Please click Sign In.";
            return;
          }
          if (attempt.mode === "signin" && isNewAccount) {
            await supabaseClient.auth.signOut();
            openAuthDialog("signin");
            authMessage.textContent = "This Google account is new. Please click Sign Up.";
            return;
          }

          await showAuthenticatedUser(session);
        }

        authForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (!supabaseClient) {
            authMessage.textContent = authSetupState === "loading"
              ? "Sign-in setup is still loading. Please wait a moment and try again."
              : "Sign-in setup could not load. Refresh the page and try again.";
            return;
          }
          authSubmit.disabled = true;
          authMessage.textContent = "";

          try {
            if (authMode === "signup") {
              await signOutCurrentSession();
            }
            const result = authMode === "signup"
              ? await supabaseClient.auth.signUp({
                  email: authEmail.value.trim(),
                  password: authPassword.value,
                  options: {
                    emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
                  },
                })
              : await supabaseClient.auth.signInWithPassword({
                  email: authEmail.value.trim(),
                  password: authPassword.value,
                });
            if (result.error) throw result.error;

            if (authMode === "signup" && !result.data.session) {
              authMessage.textContent =
                `We sent a confirmation link to ${authEmail.value.trim()}. ` +
                "Open it to verify your email, then sign in.";
              return;
            }

            await showAuthenticatedUser(result.data.session);
            authDialog.close();
          } catch (err) {
            authMessage.textContent = err.message || "Authentication failed.";
          } finally {
            authSubmit.disabled = false;
          }
        });

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
            authSetupState = "ready";
            authSubmit.disabled = false;
            googleAuthButton.disabled = false;
            const { data } = await supabaseClient.auth.getSession();
            try {
              await handleGoogleAuthSession(data.session);
            } catch (err) {
              authMessage.textContent = err.message || "Google sign-in failed.";
              authSubmit.disabled = false;
              googleAuthButton.disabled = false;
            }
          })
          .catch((err) => {
            authSetupState = "error";
            authSubmit.disabled = true;
            googleAuthButton.disabled = true;
            console.error("Could not initialize sign-in:", err);
            authMessage.textContent = "Sign-in setup could not load. Refresh the page and try again.";
            document.getElementById("output").textContent = err.message;
          });