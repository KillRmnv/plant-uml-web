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
        this.register('scs', new ScsRender(this.apiClient));
        this.register('scg', new ScgRender(this.apiClient));
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
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenderFactory;
}
