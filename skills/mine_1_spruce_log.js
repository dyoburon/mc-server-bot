async function mineOneSpruceLog(bot) {
  const targetName = 'spruce_log';
  const targetCount = 1;
  const findSpruce = () => bot.findBlock({
    matching: b => b.name === targetName,
    maxDistance: 32
  });
  let spruceLog = findSpruce();
  if (!spruceLog) {
    await exploreUntil('north', 60, findSpruce);
  }
  await mineBlock(targetName, targetCount);
}