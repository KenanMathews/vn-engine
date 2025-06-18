// types/upgrade.ts

import type { ParsedScene } from './index';

export interface ScriptUpgradeOptions {
  mode?: 'additive' | 'replace';
  namespace?: string;
  allowOverwrite?: string[];
  validateState?: boolean;
  dryRun?: boolean;
}

export interface UpgradeResult {
  success: boolean;
  error?: UpgradeError;
  addedScenes: string[];
  replacedScenes: string[];
  totalScenes: number;
  warnings: string[];
}

export interface UpgradeError {
  code: 'SCENE_CONFLICT' | 'INVALID_REFERENCE' | 'STATE_INVALID' | 'PARSE_ERROR' | 'UNAUTHORIZED_OVERWRITE';
  message: string;
  details: {
    conflictingScenes?: string[];
    invalidReferences?: string[];
    affectedState?: string[];
    unauthorizedOverwrites?: string[];
    parseErrors?: string[];
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: UpgradeError[];
  warnings: string[];
  wouldAddScenes: string[];
  wouldReplaceScenes: string[];
}

export interface BackupData {
  scenes: ParsedScene[];
  currentScene: string;
  currentInstruction: number;
  gameState: any;
  timestamp: number;
}

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: string[];
  unauthorizedOverwrites: string[];
}

export interface ReferenceValidationResult {
  valid: boolean;
  invalidJumpTargets: string[];
  invalidChoiceTargets: string[];
  affectedScenes: string[];
}