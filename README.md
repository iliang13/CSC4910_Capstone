# CSC4910_Capstone

## Run locally

The Express server serves the main app at `/` and the admin app at `/admin`.
From `Backend/`, run `npm start`; the server loads Supabase settings from
`Backend/.env` and listens on port 3000 by default.

## Deploy to Render

The repository includes a paid, always-on Render Blueprint in `render.yaml`.
Create a new Blueprint from this repository and provide `SUPABASE_URL` and
`SUPABASE_ANON_KEY` when prompted. These are the Supabase project URL and the
publishable/anon client key; never use a service-role or secret key. Render
shows the current monthly cost before you confirm the service.

After the service is deployed, add its `onrender.com` URL to Supabase
Authentication's Site URL and allowed redirect URLs. After this one-time
deployment and Supabase URL setup, users can visit the public site directly;
they do not need to start a local server.

## Google sign-in

The sign-in dialogs offer Google as an alternative to email and password. The
first Google sign-in creates the user's account and does not rely on Supabase
sending an email confirmation. To enable it:

1. In Google Cloud Console, create an OAuth client ID for a web application.
2. In its authorized redirect URIs, add the callback URL shown by Supabase under
   **Authentication > Providers > Google**. It is
   `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase, enable the Google provider and enter the Google client ID and
   client secret.
4. In Supabase **Authentication > URL Configuration**, add
   `https://csc4910-capstone.onrender.com/`,
   `https://csc4910-capstone.onrender.com/admin`, `http://localhost:3000/`, and
   `http://localhost:3000/admin` to the allowed redirect URLs.

The existing email/password option remains available and still depends on
Supabase email delivery and confirmation settings.

Survey JSON is currently stored in `Backend/surveys`. Render's service
filesystem is ephemeral, so survey data can be lost after restarts or
redeploys; use a database or persistent storage before relying on deployed
survey data.

https://csc4910-capstone.onrender.com/
LINK TO RUN WEBSITE USING RENDER
