import { lazy } from "react";
import type { LearningVisualBlock } from "./visualBlockTypes";

// Centralized visual block registry
export const VISUAL_BLOCKS = {
  "physics.projectile": lazy(() =>
    import("../physics-sim/ProjectileSimulation").then((module) => ({
      default: module.ProjectileSimulation,
    }))
  ),
  "physics.engineLab": lazy(() =>
    import("../physics-sim/PhysicsEngineLab").then((module) => ({
      default: module.PhysicsEngineLab,
    }))
  ),
  // Note: physics.forceMotion was rendering PhysicsEngineLab with scenario: "force" in VisualBlockRenderer
  "physics.forceMotion": lazy(() =>
    import("../physics-sim/PhysicsEngineLab").then((module) => ({
      default: module.PhysicsEngineLab,
    }))
  ),
  "math.sineGraph": lazy(() =>
    import("../math-visualizer/FunctionGraph").then((module) => ({
      default: module.FunctionGraph,
    }))
  ),
  "math.quadraticGraph": lazy(() =>
    import("../math-visualizer/QuadraticGraph").then((module) => ({
      default: module.QuadraticGraph,
    }))
  ),
  "geometry.triangle": lazy(() =>
    import("../math-visualizer/TriangleVisualization").then((module) => ({
      default: module.TriangleVisualization,
    }))
  ),
  "exam_summary": lazy(() =>
    import("../exams/ExamResultSummary").then((module) => ({
      default: module.ExamResultSummary,
    }))
  ),
};

export type VisualBlockType = keyof typeof VISUAL_BLOCKS;
