async function craftFourOakPlanks(bot) {
  const logName = 'oak_log';
  const plankName = 'oak_planks';
  let log = bot.inventory.items().find(i => i.name === logName);
  if (!log || log.count < 1) {
    await mineBlock(logName, 1);
  }
  const initialPlanks = bot.inventory.items().find(i => i.name === plankName)?.count || 0;

  // Crafting 4 planks usually takes 1 log.
  await craftItem(plankName, 4);
  const finalPlanks = bot.inventory.items().find(i => i.name === plankName)?.count || 0;
  if (finalPlanks <= initialPlanks) {
    throw new Error(`Crafting failed: ${plankName} count did not increase. Initial: ${initialPlanks}, Final: ${finalPlanks}`);
  }
}