# Базовый образ с Node.js
FROM node:18

# Создаем рабочую директорию
WORKDIR /usr/src/app

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем все файлы проекта
COPY . .

# Открываем порт для общения с ботом
EXPOSE 3000

# Запуск бота
CMD ["node", "bot.js"]