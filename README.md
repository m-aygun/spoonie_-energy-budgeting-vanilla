<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4923c613-c9c3-40c1-96e1-017cf8936d03

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Publish to GitHub Pages

This project is configured to deploy automatically to GitHub Pages using GitHub Actions.

1. Push this repository to GitHub.
2. Make sure your default branch is `main`.
3. In GitHub, open Settings -> Pages.
4. Under Build and deployment, set Source to GitHub Actions.
5. Push to `main` (or run the workflow manually from Actions).

After deployment, your web app will be available at:

`https://<your-github-username>.github.io/spoonie_-energy-budgeting-vanilla/`

Note: `base` is already configured in [vite.config.ts](vite.config.ts) for this repository name.
