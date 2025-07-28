import express from "express";
import { authorizedRoles, isAuthenticated } from "../middleware/auth";
import { createOrder, getAllOrders } from "../controllers/order.controller";

const router = express.Router();

router.get(
  "/get-orders",
  isAuthenticated,
  authorizedRoles("admin"),
  getAllOrders
);
router.post("/create-order", isAuthenticated, createOrder);

export default router;
