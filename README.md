<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d59977ff-215b-402c-a78e-5bc1c071c31e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Import parquet-style brick models

You can now import model files from the top-right **Import** button in the app.

Supported formats:

- JSON voxel array: `[{"x":0,"y":0,"z":0,"color":"#ffaa00"}]`
- Object with brick rows (from parquet extraction):
   `{"bricks":"1x4 (15,13,0)\n2x6 (13,5,0)"}`
- Plain text brick rows:
   `1x4 (15,13,0)`

Demo file included:

- `demo-parquet-bricks.json`
