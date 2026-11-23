let foundryInterface = {}
function buildInterface() { 
    foundryInterface.pathfinderSkills  = CONFIG.PF2E?.skills || CONFIG.PF2E?.skillList
    foundryInterface.audioHelper = foundry.audio?.AudioHelper || AudioHelper
    foundryInterface.chatMessageTypes = CONST.CHAT_MESSAGE_STYLES || CONST.CHAT_MESSAGE_TYPES
    // v13+ uses `style` (v14 rejects `type` for styles), v12 uses `type`
    foundryInterface.chatMessageKey = CONST.CHAT_MESSAGE_STYLES ? 'style' : 'type'
}
export { buildInterface, foundryInterface }
