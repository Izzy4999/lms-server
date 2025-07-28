import express from "express";
import { authorizedRoles, isAuthenticated } from "../middleware/auth";
import {
  getCoursesAnalytics,
  getOrderAnalytics,
  getUserAnalytics,
} from "../controllers/analytics.controller";

const router = express.Router();

router.get(
  "/get-users-analytics",
  isAuthenticated,
  authorizedRoles("admin"),
  getUserAnalytics
);
router.get(
  "/get-order-analytics",
  isAuthenticated,
  authorizedRoles("admin"),
  getOrderAnalytics
);
router.get(
  "/get-courses-analytics",
  isAuthenticated,
  authorizedRoles("admin"),
  getCoursesAnalytics
);

export default router;
