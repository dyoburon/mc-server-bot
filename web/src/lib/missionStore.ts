'use client';

import { create } from 'zustand';
import type { MissionRecord } from './api';

interface MissionStore {
  missions: MissionRecord[];
  setMissions: (m: MissionRecord[]) => void;
  addMission: (m: MissionRecord) => void;
  updateMission: (m: MissionRecord) => void;

  // Derived helpers
  activeMissions: () => MissionRecord[];
  failedMissions: () => MissionRecord[];
  missionsForBot: (botName: string) => MissionRecord[];
}

export const useMissionStore = create<MissionStore>((set, get) => ({
  missions: [],

  setMissions: (m) => set({ missions: m }),

  addMission: (m) =>
    set((state) => ({ missions: [m, ...state.missions].slice(0, 200) })),

  updateMission: (m) =>
    set((state) => ({
      missions: state.missions.map((existing) => (existing.id === m.id ? m : existing)),
    })),

  activeMissions: () =>
    get().missions.filter((m) => m.status === 'running' || m.status === 'queued'),

  failedMissions: () =>
    get().missions.filter((m) => m.status === 'failed'),

  missionsForBot: (botName) =>
    get().missions.filter((m) => m.assigneeIds.includes(botName)),
}));
