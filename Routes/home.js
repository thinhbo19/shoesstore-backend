import { Router } from "express";
import HomeControls from "../controllers/home.js";

const router = Router();

router.post("/webhooks", HomeControls.postWebhook);
router.get("/webhooks", HomeControls.getWebhook);

export default router;
