/**
 * Render Factory - Factory for creating render strategies
 */

class RenderFactory {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.strategies = {};
        this.registerDefaultStrategies();
    }

registerDefaultStrategies() {
        console.log("[RenderFactory] Registering strategies...");
        this.register('scs', new ScsRender(this.apiClient));
        console.log("[RenderFactory] Registered scs:", !!this.strategies.scs);
        this.register('scg', new ScgRender(this.apiClient));
        console.log("[RenderFactory] Registered scg:", !!this.strategies.scg);
        console.log("[RenderFactory] All registered:", Object.keys(this.strategies));
    }

    register(type, strategy) {
        this.strategies[type] = strategy;
    }

    getStrategy(type) {
        const strategy = this.strategies[type];
        if (!strategy) {
            throw new Error(`Unknown render type: ${type}`);
        }
        return strategy;
    }

    async render(type, content, options = {}) {
        const strategy = this.getStrategy(type);
        return await strategy.render(content, options);
    }

    async renderWithStructureName(type, content, structureName, options = {}) {
        const strategy = this.getStrategy(type);
        if (!strategy.renderWithStructureName) {
            throw new Error(`Strategy ${type} does not support renderWithStructureName`);
        }
        return await strategy.renderWithStructureName(content, structureName, options);
    }

    async renderOnlyStructureName(type, structureName, options = {}) {
        const strategy = this.getStrategy(type);
        if (!strategy.renderOnlyStructureName) {
            throw new Error(`Strategy ${type} does not support renderOnlyStructureName`);
        }
        return await strategy.renderOnlyStructureName(structureName, options);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenderFactory;
}
