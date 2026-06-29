import "dotenv/config";
import cors from "cors";
import express from "express";
import { calculate } from "./calculators.js";
import { clearHistory, getHistory, initDatabase, saveCalculation } from "./db.js";

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigin = process.env.CLIENT_URL;

app.use(cors(allowedOrigin ? { origin: allowedOrigin } : undefined));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/history", async (_request, response, next) => {
  try {
    response.json(await getHistory());
  } catch (error) {
    next(error);
  }
});

app.post("/api/calculate", async (request, response, next) => {
  try {
    const { calculator, payload } = request.body;
    const calculation = calculate({ calculator, payload });
    const saved = await saveCalculation({
      calculator,
      operation: calculation.operation,
      input: payload,
      result: calculation.result
    });

    response.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/history", async (_request, response, next) => {
  try {
    await clearHistory();
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  response.status(400).json({ message: error.message || "Ошибка сервера" });
});

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server started on http://localhost:${port}`);
    });
  })
  .catch(error => {
    console.error("Database initialization failed", error);
    process.exit(1);
  });
