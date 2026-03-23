async function craftTwentyFourOakPlanksFromLogs(bot) {
  const logName = 'oak_log';
  const plankName = 'oak_planks';
  const totalPlanksNeeded = 24;
  const logsNeeded = 6;
  const currentPlanks = bot.inventory.items().find(i => i.name === plankName)?.count || 0;
  if (currentPlanks >= totalPlanksNeeded) return;
  const currentLogs = bot.inventory.items().find(i => i.name === logName)?.count || 0;
  if (currentLogs < logsNeeded) {
    await mineBlock(logName, logsNeeded - currentLogs);
  }
  await craftItem(plankName, totalPlanksNeeded - currentPlanks);
}