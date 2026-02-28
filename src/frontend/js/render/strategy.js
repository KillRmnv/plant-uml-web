/**
 * Render Strategy Interface
 * Strategy pattern for rendering different types
 */

class RenderStrategy {
    constructor() {
        if (this.constructor === RenderStrategy) {
            throw new Error('RenderStrategy is abstract and cannot be instantiated');
        }
    }

    async render(content, options = {}) {
        throw new Error('Method render() must be implemented');
    }

    getType() {
        throw new Error('Method getType() must be implemented');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenderStrategy;
}
