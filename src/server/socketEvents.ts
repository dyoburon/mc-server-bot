import { Server as SocketIOServer } from 'socket.io';
import { BotManager } from '../bot/BotManager';
import { BotInstance } from '../bot/BotInstance';
import { EventLog } from './EventLog';
import { logger } from '../util/logger';

/**
 * Sets up real-time event broadcasting from bot instances to connected dashboard clients.
 * Polls bot state and emits changes via Socket.IO.
 */
export function setupSocketEvents(
  botManager: BotManager,
  io: SocketIOServer,
  eventLog: EventLog
): void {
  // Track previous state to detect changes
  const prevPositions = new Map<string, string>();
  const prevHealth = new Map<string, string>();
  const prevStates = new Map<string, string>();
  const prevInventory = new Map<string, string>();

  // Poll bot state every 2 seconds and emit changes
  setInterval(() => {
    const bots = botManager.getAllBots();
    for (const bot of bots) {
      if (!bot.bot) continue;
      const name = bot.name;

      // Position
      try {
        const pos = bot.bot.entity?.position;
        if (pos) {
          const posKey = `${Math.round(pos.x)},${Math.round(pos.y)},${Math.round(pos.z)}`;
          if (prevPositions.get(name) !== posKey) {
            prevPositions.set(name, posKey);
            io.emit('bot:position', {
              bot: name,
              x: Math.round(pos.x),
              y: Math.round(pos.y),
              z: Math.round(pos.z),
            });
          }
        }
      } catch { /* bot may be disconnected */ }

      // Health & food
      try {
        const healthKey = `${bot.bot.health}:${bot.bot.food}`;
        if (prevHealth.get(name) !== healthKey) {
          prevHealth.set(name, healthKey);
          io.emit('bot:health', {
            bot: name,
            health: bot.bot.health,
            food: bot.bot.food,
          });
        }
      } catch { /* ignore */ }

      // State
      const stateKey = bot.state;
      if (prevStates.get(name) !== stateKey) {
        const previousState = prevStates.get(name);
        prevStates.set(name, stateKey);
        io.emit('bot:state', {
          bot: name,
          state: stateKey,
          previousState: previousState ?? null,
        });

        eventLog.push({
          type: 'bot:state',
          botName: name,
          description: `${name} state: ${previousState ?? '?'} → ${stateKey}`,
          metadata: { from: previousState, to: stateKey },
        });
      }

      // Inventory (check by stringified hash — only emit on actual change)
      try {
        const items = bot.bot.inventory.items();
        const invKey = items.map((i) => `${i.name}:${i.count}`).sort().join(',');
        if (prevInventory.get(name) !== invKey) {
          prevInventory.set(name, invKey);
          io.emit('bot:inventory', {
            bot: name,
            items: items.map((i) => ({ name: i.name, count: i.count, slot: i.slot })),
          });
        }
      } catch { /* ignore */ }
    }
  }, 2000);

  // World time broadcast every 30 seconds
  setInterval(() => {
    const bots = botManager.getAllBots();
    const connected = bots.find((b) => b.bot);
    if (!connected?.bot) return;

    const bot = connected.bot;
    const timeOfDay = bot.time.timeOfDay < 6000 ? 'sunrise'
      : bot.time.timeOfDay < 12000 ? 'day'
      : bot.time.timeOfDay < 18000 ? 'sunset'
      : 'night';

    io.emit('world:time', {
      timeOfDay,
      timeOfDayTicks: bot.time.timeOfDay,
      day: bot.time.day,
      isRaining: bot.isRaining,
    });
  }, 30000);

  // Clean up tracked state when bots disconnect
  setInterval(() => {
    const activeNames = new Set(botManager.getAllBots().map((b) => b.name));
    for (const name of prevPositions.keys()) {
      if (!activeNames.has(name)) {
        prevPositions.delete(name);
        prevHealth.delete(name);
        prevStates.delete(name);
        prevInventory.delete(name);
      }
    }
  }, 60000);

  logger.info('Socket.IO event broadcasting initialized');
}
