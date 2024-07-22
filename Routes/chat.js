import { Router } from "express";
import ChatControls from "../controllers/chat.js";

const router = Router();

router.post("/", ChatControls.createChat);
router.get("/findone/:_id", ChatControls.findOneChat);
router.get("/:userId", ChatControls.findUserChat);
router.get("/find/:firtsId/:secondId", ChatControls.findChat);
router.delete("/:_id", ChatControls.deleteChat);

export default router;
