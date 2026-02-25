/**
 * SCg Render - Renders SCg JSON to image
 */

class ScgRender extends RenderStrategy {
    constructor(apiClient) {
        super();
        this.apiClient = apiClient;
    }

    getType() {
        return 'scg';
    }

    async render(content, options = {}) {
        const format = options.format || Config.RENDER.DEFAULT_FORMAT;
        
        try {
            const response = await this.apiClient.render(content, 'scg_json', format);
            return response;
        } catch (error) {
            console.error('[ScgRender] Render error:', error);
            throw error;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScgRender;
}
