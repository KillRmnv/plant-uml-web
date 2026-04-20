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

    async renderWithStructureName(content, structureName, options = {}) {
        const format = options.format || Config.RENDER.DEFAULT_FORMAT;

        try {
            const response = await this.apiClient.generateDiagram(structureName, format);
            return response;
        } catch (error) {
            console.error('[ScgRender] renderWithStructureName error:', error);
            throw error;
        }
    }

    async renderOnlyStructureName(structureName, options = {}) {
        const format = options.format || Config.RENDER.DEFAULT_FORMAT;

        try {
            const response = await this.apiClient.generateDiagram(structureName, format);
            return response;
        } catch (error) {
            console.error('[ScgRender] renderOnlyStructureName error:', error);
            throw error;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScgRender;
}
