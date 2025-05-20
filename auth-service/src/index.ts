import "dotenv/config";
import express, { json, Application, Request, Response } from "express";

const PORT: number = parseInt(process.env.PORT || "3000", 10);
const app: Application = express();

app.use(json());

app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("Auth Service is Healthy");
});

app.listen(PORT, () => {
  console.log(`Auth service is listening on port: ${PORT}`);
});
