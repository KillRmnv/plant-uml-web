# Dockerfile
FROM python:3.10

# Node.js для сборки SCg
RUN apt-get update && apt-get install -y nodejs npm

# Установить grunt-cli глобально
RUN npm install -g grunt-cli

WORKDIR /app

# Копировать package.json
COPY package*.json ./

# Установить Node.js зависимости
RUN npm install

# Копировать submodules (должны быть инициализированы до сборки)
COPY external/ ./external/

# Собрать SCg
RUN cd external/sc-web && npm install && npm run build

# Копировать статику
RUN cp -r external/sc-web/client/static/components/* static/

# Python зависимости
COPY requirements.txt .
RUN pip install -r requirements.txt

# Копировать исходники
COPY src/ ./src/

# Прокинуть порты
EXPOSE 5000 3000

# Запуск
CMD ["sh", "-c", "python src/backend/app.py & python -m http.server 3000"]
