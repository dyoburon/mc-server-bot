async function craftFourOakPlanksFromLog(bot) {
  const logName = 'oak_log';
  const plankName = 'oak_planks';
  const logItem = bot.inventory.items().find(i => i.name === logName);
  if (!logItem || logItem.count < 1) {
    await mineBlock(logName, 1);
  }
  await craftItem(plankName, 4);
}