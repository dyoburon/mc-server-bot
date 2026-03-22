async function mineThreeOakLogs(bot) {
  const currentCount = bot.inventory.items().find(i => i.name === 'oak_log')?.count || 0;
  await mineBlock('oak_log', currentCount + 3);
}