import {
  registrationUser,
  activateUser,
  loginUser,
  logoutUser,
  updateAccessToken,
  getUserInfo,
  socialAuth,
  updateUserInfo,
  updatePassword,
  updateProfilePicture,
  getAllUsers,
} from "../controllers/user.controller";
import express from "express";
import { authorizedRoles, isAuthenticated } from "../middleware/auth";

const router = express.Router();

router.get("/logout", isAuthenticated, logoutUser);
router.get("/refresh-token", updateAccessToken);
router.get("/me", isAuthenticated, getUserInfo);
router.get(
  "/mget-userse",
  isAuthenticated,
  authorizedRoles("admin"),
  getAllUsers
);

router.post("/register", registrationUser);
router.post("/activate-user", activateUser);
router.post("/login", loginUser);
router.post("/social-auth", socialAuth);

router.put("/update-user-info", isAuthenticated, updateUserInfo);
router.put("/update-user-password", isAuthenticated, updatePassword);
router.put("/update-user-avatar", isAuthenticated, updateProfilePicture);

export default router;
