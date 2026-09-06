const express = require("express");

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

app.get("/api/dummy", (req, res) => {
  res.json({
    message: "This is a dummy API endpoint for GitHub webhooks",
    timestamp: new Date().toISOString(),
  });
});

app.post("/webhook", (req, res) => {
  const event = req.get("x-github-event") ?? "unknown";
  const deliveryId = req.get("x-github-delivery") ?? null;
  const payload = req.body ?? {};
  const commits = Array.isArray(payload.commits) ? payload.commits : [];

  console.log("GitHub webhook received", {
    event,
    deliveryId,
    repository: payload.repository?.full_name ?? null,
    ref: payload.ref ?? null,
    commitCount: commits.length,
    commits: commits.map((commit) => ({
      id: commit.id,
      message: commit.message,
      author: commit.author?.name ?? null,
    })),
  });

  res.status(200).json({
    received: true,
    event,
    deliveryId,
    commitCount: commits.length,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
