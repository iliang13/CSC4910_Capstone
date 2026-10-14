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

Survey JSON is currently stored in `Backend/surveys`. Render's service
filesystem is ephemeral, so survey data can be lost after restarts or
redeploys; use a database or persistent storage before relying on deployed
survey data.
