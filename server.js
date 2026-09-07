const fs = require("fs");
const path = require("path");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const yaml = require("js-yaml");

const app = express();
const PORT = process.env.PORT ?? 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null;
const openApiSpec = yaml.load(
  fs.readFileSync(path.join(__dirname, "openapi.yaml"), "utf8")
);

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

async function fetchCommitDiff(owner, repo, commitId) {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${commitId}`;
  const headers = {
    Accept: "application/vnd.github.diff",
    "User-Agent": "dummy-api-webhook",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GitHub API ${response.status} for ${commitId}: ${errorBody}`
    );
  }

  return response.text();
}

app.get("/api/dummy", (req, res) => {
  res.json({
    message: "This is a dummy API endpoint for GitHub webhooks",
    timestamp: new Date().toISOString(),
  });
});

app.post("/webhook", async (req, res) => {
  const event = req.get("x-github-event") ?? "unknown";
  const deliveryId = req.get("x-github-delivery") ?? null;
  const payload = req.body ?? {};
  const commits = Array.isArray(payload.commits) ? payload.commits : [];
  const fullName = payload.repository?.full_name ?? null;
  const [owner, repo] = fullName?.split("/") ?? [];

  console.log("GitHub webhook received", {
    event,
    deliveryId,
    repository: fullName,
    ref: payload.ref ?? null,
    commitCount: commits.length,
    commits: commits.map((commit) => ({
      id: commit.id,
      message: commit.message,
      author: commit.author?.name ?? null,
    })),
  });

  if (event !== "push" || !owner || !repo || commits.length === 0) {
    res.status(200).json({
      received: true,
      event,
      deliveryId,
      commitCount: commits.length,
      diffs: [],
    });
    return;
  }

  const diffs = [];

  for (const commit of commits) {
    const commitId = commit.id;
    if (!commitId) {
      continue;
    }

    try {
      const diff = await fetchCommitDiff(owner, repo, commitId);
      console.log(`Diff for commit ${commitId}:\n${diff}`);
      diffs.push({
        id: commitId,
        message: commit.message ?? null,
        diff,
      });
    } catch (error) {
      console.error(`Failed to fetch diff for ${commitId}:`, error.message);
      diffs.push({
        id: commitId,
        message: commit.message ?? null,
        error: error.message,
      });
    }
  }

  res.status(200).json({
    received: true,
    event,
    deliveryId,
    commitCount: commits.length,
    diffs,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Swagger UI at http://localhost:${PORT}/docs`);
});
