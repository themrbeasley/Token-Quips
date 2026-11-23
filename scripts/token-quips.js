import {TokenSaysSettingsConfig} from './apps/say-list-form.js';
import {workflow} from "./apps/workflow.js";
import {promptToWorkflowData} from './apps/helpers.js';

/**
 * A class which holds some constants for tokenSays
 */
export class tokenSays {
    static ID = 'token-quips';
    static NAME = 'tokenSays';

    static FLAGS = {
      TOKENSAYS: 'token-quips',
      LIMITCOUNT: 'count',
      SAYING: 'saying',
      AUDIOPLAYCOUNT: 'audio-play',
      CHATPLAYCOUNT: 'chat-play'
    }

    static TEMPLATES = {
      SAYS: `modules/${this.ID}/templates/says-form.hbs`,
      SAY: `modules/${this.ID}/templates/say-form.hbs`
    }

    static get conditionEscape(){
      return game.settings.get(this.ID, 'conditions').split('|').map(n => n.trim()).filter(n => n !== "")
    }
    
    /**
     * Performs escape of token says if certain game settings are matched. Settings may be world or client.
    */
    static get escape(){
      return !game.settings.get(this.ID,'isActive') ? true : false
    }

    /**
     * A small helper function which leverages developer mode flags to gate debug logs.
     * @param {boolean} force - forces the log even if the debug flag is not on
     * @param  {...any} args - what to log
    */
    static log(force, ...args) {  
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
    
        if (shouldLog) {
          console.log(this.ID, '|', ...args);
        }
      }

    static initialize() {
        this.TokenSaysSettingsConfig = null; // Set by TokenSaysSettingsConfig when it opens
    }

    /**
     * Open (or bring to front) the Token Quips settings list, optionally pre-seeding the search.
     * Creates a new instance if the list is not currently open.
     * @param {string|null} searchTerm  Token/actor name to pre-fill the search box with
     */
    static openSettingsConfig(searchTerm) {
        const form = this.TokenSaysSettingsConfig ?? new TokenSaysSettingsConfig();
        if (searchTerm && typeof form.setLastSearch === 'function') {
            form.setLastSearch(String(searchTerm).trim());
        }
        form.render(true);
    }

    /**
     * method that interrupts the renderedChatMessage (when called by that hook) to update the
     * Polyglot chat message and conform it to Token Quips format
     * Need to do it this way as opposed to including HTML to start else Polyglot translates the html
     * @param {object} chatMessage 
     * @param {object} html 
     * @param {object} message 
     */
    static _insertHTMLToPolyglotMessage(chatMessage, html, message) {
        const img = chatMessage.flags.TOKENSAYS.img;
        if(!img) return;
        // v12 passes jQuery, v13+ passes an HTMLElement
        const root = html instanceof HTMLElement ? html : html[0];
        const content = root?.querySelector(".message-content");
        if(!content) return;
        const translated = root.querySelector(".polyglot-original-text");
        const common = !translated;
        const contentText = common ? '<span>' + chatMessage.content + '</span>' : '';
        const wrapper = document.createElement('div');
        wrapper.className = 'token-quips chat-window';
        wrapper.style.marginBottom = '6px';
        wrapper.innerHTML = img + '<div class="what-is-said">' + contentText + '</div>';
        if(common) {
            content.replaceChildren(wrapper);
        } else {
            content.prepend(wrapper);
            wrapper.querySelector('.what-is-said').prepend(translated);
        }
    }

    static _prompt(context) {
      if (canvas.ready) {
        const layer = canvas.activeLayer;
        if ((layer instanceof TokenLayer)) {
          const token = layer.hover;
          if(token) tokenSays.prompt(token, context.isShift)
        }
      }
    }

    static prompt(token, isShift = false){
      const data = promptToWorkflowData(token, isShift ? 'prompt-alt' : 'prompt');
      if(data) workflow.go(game.userId, data);
    }

    static async resetTokenSayingCount(tokenId, sceneId){
      const scene = game.scenes.get(sceneId)
      await scene.updateEmbeddedDocuments("Token", [{_id: tokenId, [`flags.${tokenSays.ID}.-=${tokenSays.FLAGS.SAYING}`]: null}])
      ui.notifications?.info(game.i18n.localize("TOKENSAYS.alerts.counts-reset"))
    }
}
