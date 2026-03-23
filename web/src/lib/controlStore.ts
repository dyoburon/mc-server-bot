'use client';

import { create } from 'zustand';
import type { CommandRecord } from './api';

interface ControlStore {
  // Selection
  selectedBotIds: Set<string>;
  toggleBotSelection: (botName: string) => void;
  selectAll: (botNames: string[]) => void;
  clearSelection: () => void;

  // Commands
  commands: CommandRecord[];
  setCommands: (cmds: CommandRecord[]) => void;
  addCommand: (cmd: CommandRecord) => void;
  updateCommand: (cmd: CommandRecord) => void;

  // Derived helpers
  pendingCommands: () => CommandRecord[];
  failedCommands: () => CommandRecord[];
  commandsForBot: (botName: string) => CommandRecord[];
}

export const useControlStore = create<ControlStore>((set, get) => ({
  selectedBotIds: new Set<string>(),

  toggleBotSelection: (botName) =>
    set((state) => {
      const next = new Set(state.selectedBotIds);
      if (next.has(botName)) next.delete(botName);
      else next.add(botName);
      return { selectedBotIds: next };
    }),

  selectAll: (botNames) =>
    set({ selectedBotIds: new Set(botNames) }),

  clearSelection: () =>
    set({ selectedBotIds: new Set<string>() }),

  commands: [],

  setCommands: (cmds) => set({ commands: cmds }),

  addCommand: (cmd) =>
    set((state) => ({ commands: [cmd, ...state.commands].slice(0, 200) })),

  updateCommand: (cmd) =>
    set((state) => ({
      commands: state.commands.map((c) => (c.id === cmd.id ? cmd : c)),
    })),

  pendingCommands: () =>
    get().commands.filter((c) => c.status === 'queued' || c.status === 'started'),

  failedCommands: () =>
    get().commands.filter((c) => c.status === 'failed'),

  commandsForBot: (botName) =>
    get().commands.filter((c) => c.targets.includes(botName)),
}));
