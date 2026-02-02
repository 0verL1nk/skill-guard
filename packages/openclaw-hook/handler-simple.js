const handler = async (event) => {
  console.log('[SkillGuard] Hook loaded and triggered (simple mode)! Event:', event.type, event.action);
};

module.exports = handler;
