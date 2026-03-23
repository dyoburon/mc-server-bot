async function pickUpDroppedItemsWithinFifteenMeters(bot) {
  while (true) {
    const itemEntity = bot.nearestEntity(entity => {
      const isItem = entity.name === 'item' || entity.type === 'item' || entity.objectType === 'Item';
      if (!isItem) return false;
      return bot.entity.position.distanceTo(entity.position) <= 15;
    });
    if (!itemEntity) {
      break;
    }
    const {
      x,
      y,
      z
    } = itemEntity.position;
    await moveTo(x, y, z, 1, 10);
    await bot.waitForTicks(10);
  }
}