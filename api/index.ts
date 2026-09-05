// Vercel serverless entrypoint — lets the Express engine run free on Vercel's Hobby plan
// next to the dashboard (no paid host required). Vercel compiles api/*.ts with its Node
// runtime, so no build step is needed. The listen guard in src/index.ts never fires here.

import { createApp } from "../src/index.js";

const app = createApp();

export default app;