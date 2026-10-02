import type { ReelProjectState } from "./types";

export type ProjectSnapshot = Omit<ReelProjectState, "id" | "updatedAt">;

export class HistoryManager {
  private undoStack: ProjectSnapshot[] = [];
  private redoStack: ProjectSnapshot[] = [];
  private maxHistory: number;

  constructor(maxHistory = 30) {
    this.maxHistory = maxHistory;
  }

  push(state: ProjectSnapshot) {
    // Clone to prevent external mutations
    const snapshot = JSON.parse(JSON.stringify(state));
    
    // Check if duplicate of current top
    if (this.undoStack.length > 0) {
      const top = JSON.stringify(this.undoStack[this.undoStack.length - 1]);
      if (top === JSON.stringify(snapshot)) return;
    }

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // clear redo on new action
  }

  undo(currentState: ProjectSnapshot): ProjectSnapshot | null {
    if (this.undoStack.length <= 1) return null;

    // Move current to redo stack
    const current = this.undoStack.pop();
    if (current) {
      this.redoStack.push(current);
    }

    const previous = this.undoStack[this.undoStack.length - 1];
    return previous ? JSON.parse(JSON.stringify(previous)) : null;
  }

  redo(): ProjectSnapshot | null {
    if (this.redoStack.length === 0) return null;

    const next = this.redoStack.pop();
    if (next) {
      this.undoStack.push(next);
      return JSON.parse(JSON.stringify(next));
    }
    return null;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
