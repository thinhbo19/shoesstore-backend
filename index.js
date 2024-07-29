import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import dataConnect from "./config/dataConnect.js";
import initRouters from "./Routes/index.js";
const app = express();
dotenv.config();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

dataConnect();
const PORT = process.env.PORT;
initRouters(app);
app.listen(PORT, () => {
  console.log(`http://locallhost:${PORT}`);
});
