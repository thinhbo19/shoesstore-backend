import { Router } from "express";
import MessControls from "../controllers/messager.js";

const router = Router();

router.post("/", MessControls.createMess);
router.get("/:chatId", MessControls.getMess);

export default router;
