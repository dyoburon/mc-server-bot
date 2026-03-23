async function mineThreeOakLogsAtTarget(bot) {
  const logName = 'oak_log';
  const targetCount = 3;
  const targetPos = {
    x: 717,
    y: 79,
    z: 245
  };

  // Move closer to the target location to ensure we mine the correct logs
  await moveTo(targetPos.x, targetPos.y, targetPos.z, 3, 60);

  // Use the mineBlock primitive to collect 3 oak logs
  await mineBlock(logName, targetCount);
}