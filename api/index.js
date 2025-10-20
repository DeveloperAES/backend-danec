import app from "../src/app.js";

// Vercel's Node runtime expects a default export handler(req, res)
export default function handler(req, res) {
  return app(req, res);
}
