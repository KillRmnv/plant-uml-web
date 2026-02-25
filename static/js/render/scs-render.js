/**
 * ScS Render - Renders ScS text to image
 */

class ScsRender extends RenderStrategy {
    constructor(apiClient) {
        super();
        this.apiClient = apiClient;
    }

    getType() {
        return 'scs';
    }

    async render(content, options = {}) {
        const format = options.format || Config.RENDER.DEFAULT_FORMAT;
        
        try {
            const response = await this.apiClient.render(content, 'scs', format);
            return response;
        } catch (error) {
            console.error('[ScsRender] Render error:', error);
            throw error;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScsRender;
}
