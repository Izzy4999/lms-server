import { registrationUser, activateUser } from "../controllers/user.controller";
import express from "express";

const router = express.Router();

router.post("/register", registrationUser);
router.post("/activate-user", activateUser);

export default router;
