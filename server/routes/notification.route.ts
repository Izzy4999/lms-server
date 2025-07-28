import express from "express";
import { authorizedRoles, isAuthenticated } from "../middleware/auth";
import {
  getNotifiaction,
  updateNotifications,
} from "../controllers/notification.controller";

const router = express.Router();

router.get(
  "/get-all-notifications",
  isAuthenticated,
  authorizedRoles("admin"),
  getNotifiaction
);

router.put(
  "/update-notification/:id",
  isAuthenticated,
  authorizedRoles("admin"),
  updateNotifications
);

export default router;
