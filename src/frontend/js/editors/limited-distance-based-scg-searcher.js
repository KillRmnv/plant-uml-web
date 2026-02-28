/**
 * =============================================================================
 * LimitedDistanceBasedSCgSearcher
 * =============================================================================
 * 
 * Wrapper-класс для DistanceBasedSCgSearcher с ограничением уровней поиска.
 * По умолчанию ограничивает поиск 3 уровнями вместо 7.
 * 
 * Использует перехват sandbox.eventStructUpdate для контроля уровней.
 * 
 * =============================================================================
 */

class LimitedDistanceBasedSCgSearcher {
    /**
     * @param {Object} sandbox - объект песочницы
     * @param {number} maxLevel - максимальный уровень поиска (по умолчанию 3)
     */
    constructor(sandbox, maxLevel = 2) {
        this._sandbox = sandbox;
        this._maxLevel = maxLevel;
        this._currentMaxLevel = 0;
        
        // Создаем оригинальный поисковик
        this._original = new SCWeb.core.DistanceBasedSCgSearcher(sandbox);
        
        // Сохраняем оригинальный callback
        this._originalEventStructUpdate = sandbox.eventStructUpdate;
        
        // Перехватываем eventStructUpdate для контроля уровней
        sandbox.eventStructUpdate = (data) => {
            // Проверяем уровень элемента
            const elementLevel = data.sceneElementLevel || 0;
            
            // Если уровень превышает максимальный - игнорируем
            if (elementLevel >= this._maxLevel) {
                console.log(`[LimitedSearch] Пропуск элемента на уровне ${elementLevel} (max: ${this._maxLevel})`);
                return;
            }
            
            // Обновляем текущий максимальный уровень
            this._currentMaxLevel = Math.max(this._currentMaxLevel, elementLevel);
            
            // Вызываем оригинальный callback
            if (this._originalEventStructUpdate) {
                this._originalEventStructUpdate(data);
            }
        };
    }
    
    /**
     * =============================================================================
     * searchContent(keyElements)
     * =============================================================================
     * 
     * Основной метод поиска. Сбрасывает счетчик уровней.
     */
    async searchContent(keyElements) {
        this._currentMaxLevel = 0;
        console.log(`[LimitedSearch] Начало поиска с maxLevel=${this._maxLevel}`);
        return await this._original.searchContent(keyElements);
    }
    
    /**
     * =============================================================================
     * initAppendRemoveElementsUpdate()
     * =============================================================================
     * 
     * Делегирует вызов оригинальному поисковику.
     */
    async initAppendRemoveElementsUpdate() {
        return await this._original.initAppendRemoveElementsUpdate();
    }
    
    /**
     * =============================================================================
     * destroyAppendRemoveElementsUpdate()
     * =============================================================================
     * 
     * Делегирует вызов оригинальному поисковику.
     */
    async destroyAppendRemoveElementsUpdate() {
        return await this._original.destroyAppendRemoveElementsUpdate();
    }
}

// Экспорт в глобальную область видимости
window.LimitedDistanceBasedSCgSearcher = LimitedDistanceBasedSCgSearcher;
