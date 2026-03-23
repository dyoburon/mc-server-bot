async function craftAFurnace(bot) {
  const cobblestoneCount = bot.inventory.items().filter(i => i.name === 'cobblestone').reduce((acc, i) => acc + i.count, 0);
  if (cobblestoneCount < 8) {
    await mineBlock('stone', 8 - cobblestoneCount);
  }
  await craftItem('furnace', 1);
}