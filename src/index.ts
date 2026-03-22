import 'dotenv/config';
import v8 from 'v8';
import { loadConfig } from './config';
import { BotManager } from './bot/BotManager';
import { createAPIServer } from './server/api';
import { logger } from './util/logger';
import { AnthropicClient } from './ai/AnthropicClient';
import { GeminiClient } from './ai/GeminiClient';
import { LLMClient } from './ai/LLMClient';
import { setupSocketEvents } from './server/socketEvents';

function buildLLMClient(config: ReturnType<typeof loadConfig>): LLMClient | null {
  const common = {
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.chatMaxTokens,
  };

  if (config.llm.provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.warn('ANTHROPIC_API_KEY not set - AI chat disabled');
      return null;
    }

    return new AnthropicClient({ apiKey, ...common });
  }

  if (config.llm.provider === 'gemini') {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      logger.warn('GOOGLE_API_KEY not set - AI chat disabled');
      return null;
    }

    return new GeminiClient({ apiKey, ...common });
  }

  logger.warn({ provider: config.llm.provider }, 'Unsupported LLM provider - AI chat disabled');
  return null;
}

async function main() {
  logger.info('Starting DyoBot sidecar...');

  const config = loadConfig();

  // Initialize LLM client (optional - bots work without it, just no chat AI)
  const llmClient = buildLLMClient(config);
  if (llmClient) {
    logger.info({ model: config.llm.model }, 'LLM client initialized');
  }

  const botManager = new BotManager(config, llmClient);
  let memoryInterval: NodeJS.Timeout | null = null;

  // Restore previously saved bots
  await botManager.loadSavedBots();

  // Start HTTP API server with Socket.IO
  const { httpServer, io, eventLog } = createAPIServer(botManager);

  // Set up real-time Socket.IO event broadcasting
  setupSocketEvents(botManager, io, eventLog);

  const formatMb = (bytes: number) => Number((bytes / 1024 / 1024).toFixed(1));
  const startMemoryDiagnostics = () => {
    memoryInterval = setInterval(() => {
      const memory = process.memoryUsage();
      const heap = v8.getHeapStatistics();
      const diagnostics = botManager.getDiagnosticsSnapshot();

      logger.info({
        rssMb: formatMb(memory.rss),
        heapUsedMb: formatMb(memory.heapUsed),
        heapTotalMb: formatMb(memory.heapTotal),
        externalMb: formatMb(memory.external),
        arrayBuffersMb: formatMb(memory.arrayBuffers),
        heapLimitMb: formatMb(heap.heap_size_limit),
        totalHeapMb: formatMb(heap.total_heap_size),
        usedHeapMb: formatMb(heap.used_heap_size),
        totalBots: diagnostics.totalBots,
        bots: diagnostics.bots.map((bot) => ({
          name: bot.name,
          state: bot.state,
          health: Number(bot.health.toFixed(2)),
          food: bot.food,
          position: bot.position,
          currentTask: bot.voyager?.currentTask ?? null,
          queuedTasks: bot.voyager?.queuedTasks ?? 0,
          voyagerPaused: bot.voyager?.isPaused ?? false,
          lastExecution: bot.voyager?.lastExecution
            ? {
                task: bot.voyager.lastExecution.task,
                attempt: bot.voyager.lastExecution.attempt,
                success: bot.voyager.lastExecution.success,
                outputLength: bot.voyager.lastExecution.outputLength,
                eventCount: bot.voyager.lastExecution.eventCount,
                eventLogLength: bot.voyager.lastExecution.eventLogLength,
                codeLength: bot.voyager.lastExecution.codeLength,
                ageSec: Number(((Date.now() - bot.voyager.lastExecution.timestamp) / 1000).toFixed(1)),
              }
            : null,
        })),
      }, 'Memory diagnostics');
    }, 30000);
  };

  startMemoryDiagnostics();

  httpServer.listen(config.api.port, config.api.host, () => {
    logger.info({ port: config.api.port, host: config.api.host }, 'DyoBot API server running (HTTP + WebSocket)');
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down DyoBot...');
    if (memoryInterval) {
      clearInterval(memoryInterval);
      memoryInterval = null;
    }
    io.close();
    await botManager.removeAllBots();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start DyoBot');
  process.exit(1);
});
