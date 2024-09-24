const TelegramBot = require('node-telegram-bot-api');
const {calculateImportPrice} = require("./functions/calculateImport");
const {askCreditDetails}=require('./functions/calculateCredit')

const token = '7650778342:AAEc_uUh-AVYt7iO0IhGUT3p7zmkNI3IGEk';
const bot = new TelegramBot(token, {polling: true});

let userImportData = {}


bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Добро пожаловать в бот для расчета растоможки автомобилей! Выберите функцию:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Расчет растаможки', callback_data: 'calculateImport' }],
                [{ text: 'Помощь', callback_data: 'help' }],
                [{ text: 'История расчета', callback_data: 'showHistory' }],
                [{ text: 'Расчитать кредит', callback_data: 'calculateCredit' }]
            ]
        }
    });
});

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const action = callbackQuery.data;

    switch (action) {
        case 'calculateImport':
            personType(chatId)
            break;
        case 'physicalPerson':
            userImportData.type = "Физическое лицо"
            askUtilisationType(chatId);
            break;
        case 'legalEntity':
            userImportData.type = "Юридическое Лицо"
            askUtilisationType(chatId);
            break;
        case 'commercial':
            userImportData.typeUtilisation = "commercial"
            collectCarData(chatId);
            break;
        case 'preferential':
            userImportData.typeUtilisation = 'preferential'
            collectCarData(chatId)
            break;
        case 'help':
            bot.sendMessage(chatId, 'Это бот для расчета растаможки автомобилей. Используй кнопки для взаимодействия.');
            break;
        case 'showHistory':
            bot.sendMessage(chatId, 'Пока функция не доступна');
            break;
        case 'calculateCredit':
            askCreditDetails(bot, chatId)
            break;
        case 'convertCurrency':
            bot.sendMessage(chatId, 'Введите сумму и валюту для конвертации.\n(Функция находится в разработке)');
            break;
        case 'compareCars':
            bot.sendMessage(chatId, 'Введите параметры для сравнения автомобилей.\n(Функция находится в разработке)');
            break;
        default:
            bot.sendMessage(chatId, 'Неизвестное действие.');
    }
});
function personType (chatId){
    bot.sendMessage(chatId, 'Выберите кто вы: ', {
        reply_markup: {
            inline_keyboard: [
                [{text: 'Физическое лицо', callback_data: 'physicalPerson'}],
                [{text: 'Юридическое лицо', callback_data: 'legalEntity'}],
            ]
        }
    });
}
function askUtilisationType (chatId){
    bot.sendMessage(chatId, 'Выберите тип утилизационного сбора. Примечание: Льготный утильсбор применяется при одновременном выполнении следующих\n' +
        'условий:\n' +
        '1. автомобиль растаможен по ПТД (пассажирской таможенной декларации)\n' +
        '2. ввозится физическим лицом для личного пользования\n' +
        '3. не более 1 авто в год на 1 физлицо\n' +
        '4. постановка на учет в ГИБДД, без последующего отчуждения (продажи, дарения) в\n' +
        'течение 12 месяцев.', {
        reply_markup: {
            inline_keyboard: [
                [{text: 'Коммерческий', callback_data: 'commercial'}],
                [{text: 'Льготный', callback_data: 'preferential'}]
            ]
        }
    });
}

function collectCarData(chatId) {
    bot.sendMessage(chatId, 'Введите марку автомобиля: ');
    bot.once('message', (msg) => {
        userImportData.brand = msg.text;
        bot.sendMessage(chatId, "Введите модель автомобиля: ");
        bot.once('message', (msg) => {
            userImportData.model = msg.text;
            bot.sendMessage(chatId, "Введите цену автомобиля в евро: ");
            bot.once('message', (msg) => {
                userImportData.price = parseFloat(msg.text);
                if (isNaN(userImportData.price)) {
                    bot.sendMessage(chatId, "Пожалуйста, введите корректное числовое значение для цены.");
                    return;
                }
                bot.sendMessage(chatId, 'Введите год производства авто: ');
                bot.once('message', (msg) => {
                    userImportData.year = parseInt(msg.text);
                    bot.sendMessage(chatId, 'Введите мощность в л.с: ');
                    bot.once('message', (msg) => {
                        userImportData.power = parseFloat(msg.text);
                        bot.sendMessage(chatId, 'Введите точный объем двигателя в куб.см.: ');
                        bot.once('message', async (msg) => {
                            userImportData.engineVolume = parseFloat(msg.text);
                            if (isNaN(userImportData.engineVolume)) {
                                bot.sendMessage(chatId, "Пожалуйста, введите корректное числовое значение для объема двигателя.");
                                return;
                            }
                            try {
                                const result = await calculateImportPrice(userImportData);
                                bot.sendMessage(chatId,
                                    `Итоговые расчеты для ${result.nameBrand} ${result.nameModel}:\n` +
                                    `- Стоимость автомобиля: ${result.priceRub.toFixed(2)} рублей\n` +
                                    `- Таможенный сбор: ${result.customsDuty} рублей\n` +
                                    `- Акциз: ${result.exciseTax} рублей\n` +
                                    `- Утилизационный сбор: ${result.recyclingTax} рублей\n` +
                                    `- Таможенная пошлина: ${result.customsTax.toFixed(2)} рублей\n` +
                                    `- НДС: ${result.VAT} рублей\n` +
                                    `- Общая стоимость таможенных оформлений: ${result.totalCost} рублей\n` +
                                    `- Общая стоимость автомобиля: ${(result.priceRub + result.totalCost).toFixed(2)} рублей`
                                );
                                userImportData = {}
                            } catch (error) {
                                bot.sendMessage(chatId, "Произошла ошибка при расчете: " + error.message)
                            }
                        });
                    });
                });
            });
        });
    });
}

bot.on('polling_error', (error) => {
    console.error(`Polling error: ${error.code} - ${error.response.body}`);
});
