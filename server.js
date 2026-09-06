const express = require("express");

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

app.get("/api/dummy", (req, res) => {
  res.json({
    message: "This is a dummy API endpoint",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
