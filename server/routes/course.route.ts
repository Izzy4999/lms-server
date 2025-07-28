import express from "express";
import { authorizedRoles, isAuthenticated } from "../middleware/auth";
import {
  addAnswer,
  addQuestion,
  addReplyToReview,
  addReview,
  editCourse,
  getAllCourse,
  getAllCourses,
  getCourseByUser,
  getSingleCourse,
  uploadCourse,
} from "../controllers/course.controller";

const router = express.Router();

router.get("/get-course/:id", getSingleCourse);
router.get("/get-course", getAllCourse);
router.get("/get-course-content/:id", isAuthenticated, getCourseByUser);
router.get(
  "/get-courses",
  isAuthenticated,
  authorizedRoles("admin"),
  getAllCourses
);

router.post(
  "/create-course",
  isAuthenticated,
  authorizedRoles("admin"),
  uploadCourse
);
router.put(
  "/edit-course/:id",
  isAuthenticated,
  authorizedRoles("admin"),
  editCourse
);
router.put("/add-question", isAuthenticated, addQuestion);
router.put("/add-answer", isAuthenticated, addAnswer);
router.put("/add-review/:id", isAuthenticated, addReview);
router.put(
  "/add-reply",
  isAuthenticated,
  authorizedRoles("admin"),
  addReplyToReview
);

export default router;
