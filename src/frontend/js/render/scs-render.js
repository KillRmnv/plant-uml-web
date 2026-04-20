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

    async renderWithStructureName(content, structureName, options = {}) {
        const format = options.format || Config.RENDER.DEFAULT_FORMAT;

        try {
            const response = await this.apiClient.generateDiagramFromInputs(
                structureName,
                content,
                format
            );
            return response;
        } catch (error) {
            console.error('[ScsRender] renderWithStructureName error:', error);
            throw error;
        }
    }

    async renderOnlyStructureName(structureName, options = {}) {
        const format = options.format || Config.RENDER.DEFAULT_FORMAT;

        try {
            const response = await this.apiClient.generateDiagram(structureName, format);
            return response;
        } catch (error) {
            console.error('[ScsRender] renderOnlyStructureName error:', error);
            throw error;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScsRender;
}
