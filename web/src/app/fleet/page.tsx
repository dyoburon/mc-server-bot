'use client';

import { useState, useCallback } from 'react';
import { useBotStore } from '@/lib/store';
import { useControlStore, Squad, CommandStatus } from '@/lib/controlStore';
import { api } from '@/lib/api';
import { getPersonalityColor } from '@/lib/constants';

const STATUS_STYLE: Record<CommandStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Pending' },
  running: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Running' },
  succeeded: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Succeeded' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Failed' },
};

export default function FleetPage() {
  const bots = useBotStore((s) => s.botList);
  const selectedBotIds = useControlStore((s) => s.selectedBotIds);
  const toggleBotSelection = useControlStore((s) => s.toggleBotSelection);
  const selectBots = useControlStore((s) => s.selectBots);
  const clearSelection = useControlStore((s) => s.clearSelection);
  const squads = useControlStore((s) => s.squads);
  const createSquad = useControlStore((s) => s.createSquad);
  const deleteSquad = useControlStore((s) => s.deleteSquad);
  const activeSquadId = useControlStore((s) => s.activeSquadId);
  const setActiveSquad = useControlStore((s) => s.setActiveSquad);
  const updateSquadMembers = useControlStore((s) => s.updateSquadMembers);
  const commandStates = useControlStore((s) => s.commandStates);
  const setCommandState = useControlStore((s) => s.setCommandState);

  const [newSquadName, setNewSquadName] = useState('');
  const [batchTask, setBatchTask] = useState('');

  const selectedArray = Array.from(selectedBotIds);
  const activeSquad = squads.find((s) => s.id === activeSquadId) ?? null;

  const handleCreateSquad = () => {
    if (!newSquadName.trim() || selectedArray.length === 0) return;
    createSquad(newSquadName.trim(), selectedArray);
    setNewSquadName('');
  };

  const handleSelectSquad = (squad: Squad) => {
    setActiveSquad(squad.id);
    selectBots(squad.memberNames);
  };

  const dispatchBatchCommand = useCallback(
    async (command: string, botNames: string[]) => {
      for (const name of botNames) {
        setCommandState(name, {
          botName: name,
          command,
          status: 'pending',
          startedAt: Date.now(),
        });
      }

      for (const name of botNames) {
        setCommandState(name, {
          botName: name,
          command,
          status: 'running',
          startedAt: Date.now(),
        });
        try {
          await api.queueTask(name, command);
          setCommandState(name, {
            botName: name,
            command,
            status: 'succeeded',
            startedAt: Date.now(),
            finishedAt: Date.now(),
          });
        } catch (err) {
          setCommandState(name, {
            botName: name,
            command,
            status: 'failed',
            startedAt: Date.now(),
            finishedAt: Date.now(),
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    },
    [setCommandState],
  );

  const handleBatchTask = () => {
    if (!batchTask.trim() || selectedArray.length === 0) return;
    dispatchBatchCommand(batchTask.trim(), selectedArray);
    setBatchTask('');
  };

  const handleBatchAction = (action: string) => {
    if (selectedArray.length === 0) return;
    dispatchBatchCommand(action, selectedArray);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Fleet Control</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {bots.length} bot{bots.length !== 1 ? 's' : ''} total
              {selectedArray.length > 0 && ` \u00B7 ${selectedArray.length} selected`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => selectBots(bots.map((b) => b.name))}
              className="px-3 py-1.5 text-[11px] font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-[11px] font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left: Bot list + squad actions */}
        <div className="w-80 border-r border-zinc-800/60 bg-zinc-950/50 overflow-y-auto shrink-0">
          {/* Squad overview cards */}
          {squads.length > 0 && (
            <div className="p-4 border-b border-zinc-800/40">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Squads ({squads.length})
              </p>
              <div className="space-y-2">
                {squads.map((squad) => {
                  const members = bots.filter((b) => squad.memberNames.includes(b.name));
                  const activities = members.map((m) => m.state).filter(Boolean);
                  const activitySummary = [...new Set(activities)].join(', ') || 'Idle';
                  const isActive = activeSquadId === squad.id;

                  return (
                    <div
                      key={squad.id}
                      className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                        isActive
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : 'border-zinc-800/60 bg-zinc-900/50 hover:border-zinc-700'
                      }`}
                      onClick={() => handleSelectSquad(squad)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-zinc-200">{squad.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSquad(squad.id);
                          }}
                          className="text-zinc-600 hover:text-red-400 transition-colors"
                          title="Delete squad"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        {squad.memberNames.length} member{squad.memberNames.length !== 1 ? 's' : ''}:
                        {' '}{squad.memberNames.join(', ')}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-1">Activity: {activitySummary}</p>
                      {/* Quick batch actions */}
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectBots(squad.memberNames);
                            dispatchBatchCommand('Stop current task and idle', squad.memberNames);
                          }}
                          className="px-2 py-0.5 text-[9px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                        >
                          Stop All
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectBots(squad.memberNames);
                            dispatchBatchCommand('Resume autonomous behavior', squad.memberNames);
                          }}
                          className="px-2 py-0.5 text-[9px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                        >
                          Resume All
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectBots(squad.memberNames);
                            dispatchBatchCommand('Gather together near the squad leader', squad.memberNames);
                          }}
                          className="px-2 py-0.5 text-[9px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                        >
                          Regroup
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create squad */}
          <div className="p-4 border-b border-zinc-800/40">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Create Squad from Selection
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSquad()}
                placeholder="Squad name..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
              <button
                onClick={handleCreateSquad}
                disabled={!newSquadName.trim() || selectedArray.length === 0}
                className="px-3 py-1.5 text-[11px] font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
            {selectedArray.length === 0 && (
              <p className="text-[9px] text-zinc-600 mt-1">Select bots below to add to a squad</p>
            )}
          </div>

          {/* Bot list */}
          <div className="p-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              All Bots
            </p>
            <div className="space-y-0.5">
              {bots.map((bot) => {
                const isSelected = selectedBotIds.has(bot.name);
                const cmd = commandStates[bot.name];
                return (
                  <button
                    key={bot.name}
                    onClick={() => toggleBotSelection(bot.name)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors ${
                      isSelected ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border-2 transition-colors"
                      style={{
                        borderColor: isSelected ? '#10B981' : '#3f3f46',
                        backgroundColor: isSelected ? '#10B981' : 'transparent',
                      }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getPersonalityColor(bot.personality) }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-zinc-300 truncate">{bot.name}</p>
                      <p className="text-[9px] text-zinc-600">{bot.state ?? 'Unknown'}</p>
                    </div>
                    {cmd && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${STATUS_STYLE[cmd.status].bg} ${STATUS_STYLE[cmd.status].text}`}>
                        {STATUS_STYLE[cmd.status].label}
                      </span>
                    )}
                  </button>
                );
              })}
              {bots.length === 0 && (
                <p className="text-[11px] text-zinc-600 text-center py-4">No bots online</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Details panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Batch command */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-zinc-400 mb-2">Batch Command</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={batchTask}
                onChange={(e) => setBatchTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBatchTask()}
                placeholder={
                  selectedArray.length > 0
                    ? `Send task to ${selectedArray.length} bot${selectedArray.length !== 1 ? 's' : ''}...`
                    : 'Select bots first...'
                }
                disabled={selectedArray.length === 0}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-40"
              />
              <button
                onClick={handleBatchTask}
                disabled={!batchTask.trim() || selectedArray.length === 0}
                className="px-4 py-2 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
            {/* Quick actions */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleBatchAction('Mine nearby stone blocks')}
                disabled={selectedArray.length === 0}
                className="px-2.5 py-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors disabled:opacity-30"
              >
                Mine Stone
              </button>
              <button
                onClick={() => handleBatchAction('Gather nearby wood')}
                disabled={selectedArray.length === 0}
                className="px-2.5 py-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors disabled:opacity-30"
              >
                Gather Wood
              </button>
              <button
                onClick={() => handleBatchAction('Guard this area and attack hostile mobs')}
                disabled={selectedArray.length === 0}
                className="px-2.5 py-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors disabled:opacity-30"
              >
                Guard Area
              </button>
              <button
                onClick={() => handleBatchAction('Stop and idle')}
                disabled={selectedArray.length === 0}
                className="px-2.5 py-1 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors disabled:opacity-30"
              >
                Stop All
              </button>
            </div>
          </div>

          {/* Active squad detail view */}
          {activeSquad && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-zinc-400">
                  Squad: <span className="text-zinc-200">{activeSquad.name}</span>
                </p>
                <button
                  onClick={() => {
                    if (selectedArray.length > 0) {
                      updateSquadMembers(activeSquad.id, selectedArray);
                    }
                  }}
                  disabled={selectedArray.length === 0}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 disabled:opacity-30"
                >
                  Update Members from Selection
                </button>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      <th className="text-left px-4 py-2.5 text-zinc-500 font-semibold">Bot</th>
                      <th className="text-left px-4 py-2.5 text-zinc-500 font-semibold">State</th>
                      <th className="text-left px-4 py-2.5 text-zinc-500 font-semibold">Position</th>
                      <th className="text-left px-4 py-2.5 text-zinc-500 font-semibold">Last Command</th>
                      <th className="text-left px-4 py-2.5 text-zinc-500 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSquad.memberNames.map((name) => {
                      const bot = bots.find((b) => b.name === name);
                      const cmd = commandStates[name];
                      return (
                        <tr key={name} className="border-b border-zinc-800/30 last:border-0">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: bot ? getPersonalityColor(bot.personality) : '#6B7280' }}
                              />
                              <span className="text-zinc-300 font-medium">{name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-zinc-400">{bot?.state ?? 'Offline'}</td>
                          <td className="px-4 py-2.5 text-zinc-500 font-mono text-[10px]">
                            {bot?.position
                              ? `${Math.round(bot.position.x)}, ${Math.round(bot.position.y)}, ${Math.round(bot.position.z)}`
                              : '--'}
                          </td>
                          <td className="px-4 py-2.5 text-zinc-400 max-w-[200px] truncate">
                            {cmd?.command ?? '--'}
                          </td>
                          <td className="px-4 py-2.5">
                            {cmd ? (
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLE[cmd.status].bg} ${STATUS_STYLE[cmd.status].text}`}>
                                {STATUS_STYLE[cmd.status].label}
                              </span>
                            ) : (
                              <span className="text-zinc-600">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per-bot command results */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-3">Command Results</p>
            {Object.keys(commandStates).length === 0 ? (
              <p className="text-[11px] text-zinc-600">No commands dispatched yet. Select bots and send a batch command.</p>
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      <th className="text-left px-4 py-2.5 text-zinc-500 font-semibold">Bot</th>
                      <th className="text-left px-4 py-2.5 text-zinc-500 font-semibold">Command</th>
                      <th className="text-left px-4 py-2.5 text-zinc-500 font-semibold">Status</th>
                      <th className="text-left px-4 py-2.5 text-zinc-500 font-semibold">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(commandStates).map((cmd) => (
                      <tr key={cmd.botName} className="border-b border-zinc-800/30 last:border-0">
                        <td className="px-4 py-2.5 text-zinc-300 font-medium">{cmd.botName}</td>
                        <td className="px-4 py-2.5 text-zinc-400 max-w-[250px] truncate">{cmd.command}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLE[cmd.status].bg} ${STATUS_STYLE[cmd.status].text}`}>
                            {STATUS_STYLE[cmd.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-red-400/70 text-[10px] max-w-[200px] truncate">
                          {cmd.error ?? '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
