const TelegramBot = require('node-telegram-bot-api')
const {calculateImportPrice} = require("./functions/calculateImport");
const {askCreditDetails}=require('./functions/calculateCredit');
const {saveCalculation, deleteCalculation, getCalculationById, getCalculations} = require('./functions/db');


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
//  Слушатель для основнеого меню и расчета растоможки
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
        case 'calculateCredit':
            askCreditDetails(bot, chatId)
            break;
        default:
            break;
    }
});

bot.on('callback_query', async (callbackQuery)=>{
    const chatId = callbackQuery.message.chat.id;
    const action = callbackQuery.data;

    if (action === 'yesSave') {
        try {
            await saveCalculation(chatId, userImportData);
            bot.sendMessage(chatId, 'Ваш расчет сохранен! =)');
            userImportData = {}; // Сброс данных только после успешного сохранения

            // Возвращаем в главное меню
            setTimeout(()=>showMainMenu(chatId), 1500);
        } catch (error) {
            bot.sendMessage(chatId, 'Ошибка при сохранении расчета: ' + error.message);
        }
    }

    if (action === 'noSave') {
        bot.sendMessage(chatId, 'Расчет не был сохранен.');
        // Возвращаем в главное меню
        setTimeout(()=>showMainMenu(chatId), 1500);
    }
    try {

        if (action === 'showHistory') {
            const calculations = await getCalculations(chatId);
            if (calculations.length === 0) {
                bot.sendMessage(chatId, 'У вас нет сохраненных расчетов! =( ')
            } else {
                const buttons = calculations.map(item => ({
                    text: `${item.brand} ${item.model} (${item.year})`, callback_data: `calc_${item.id}`
                }));

                bot.sendMessage(chatId, 'Выберите сохраненный автомобиль ', {
                    reply_markup: {
                        inline_keyboard: buttons.map(button => [button])
                    }
                });
            }
        }

        if (action.startsWith('calc_')) {
            const calcId = action.split('_')[1];
            const calculation = await getCalculationById(calcId);

            if (calculation) {
                // Пересчитываем данные через calculateImportPrice
                const recalculatedData = await calculateImportPrice({
                    brand: calculation.brand,
                    model: calculation.model,
                    price: calculation.price,
                    year: calculation.year,
                    power: calculation.power,
                    engineVolume: calculation.engine_volume,
                    type: calculation.type,
                    typeUtilisation: calculation.type_utilisation
                });

                // Отправляем полный расчет
                bot.sendMessage(chatId,
                    `Детали расчета для ${recalculatedData.nameBrand} ${recalculatedData.nameModel}:\n` +
                    `- Год: ${calculation.year}\n` +
                    `- Цена: ${calculation.price} евро\n` +
                    `- Мощность: ${calculation.power} л.с.\n` +
                    `- Объем двигателя: ${calculation.engine_volume} куб. см.\n` +
                    `- Стоимость автомобиля: ${recalculatedData.priceRub.toFixed(2)} рублей\n` +
                    `- Таможенный сбор: ${recalculatedData.customsDuty} рублей\n` +
                    `- Акциз: ${recalculatedData.exciseTax} рублей\n` +
                    `- Утилизационный сбор: ${recalculatedData.recyclingTax} рублей\n` +
                    `- Таможенная пошлина: ${recalculatedData.customsTax.toFixed(2)} рублей\n` +
                    `- НДС: ${recalculatedData.VAT} рублей\n` +
                    `- Общая стоимость таможенных оформлений: ${recalculatedData.totalCost.toFixed(2)} рублей\n` +
                    `- Общая стоимость автомобиля: ${(recalculatedData.priceRub + recalculatedData.totalCost).toFixed(2)} рублей`,{
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Удалить расчет', callback_data: `delete_${calcId}` }],
                                [{text: 'Вернуться к списку', callback_data: 'showHistory'}]// Кнопка для удаления
                            ]
                        }
                    }
                );
            }
        }
        if (action.startsWith('delete_')) {
            const calcId = action.split('_')[1];
            try {
                await deleteCalculation(calcId);
                bot.sendMessage(chatId, 'Расчет успешно удален.');
                setTimeout(()=>showMainMenu(chatId), 1500);
            } catch (error) {
                console.error('Ошибка при удалении расчета:', error);
                bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
            }
        }
    } catch (error) {
        bot.sendMessage(chatId, 'Ошибка при получении истории: ' + error.message);
    }
});


function showMainMenu(chatId) {
    bot.sendMessage(chatId, "       Выберите функцию:       ", {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Расчет растаможки', callback_data: 'calculateImport' }],
                [{ text: 'Помощь', callback_data: 'help' }],
                [{ text: 'История расчета', callback_data: 'showHistory' }],
                [{ text: 'Расчитать кредит', callback_data: 'calculateCredit' }]
            ]
        }
    });
}


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
                                    `- Общая стоимость таможенных оформлений: ${result.totalCost.toFixed(2)} рублей\n` +
                                    `- Общая стоимость автомобиля: ${(result.priceRub + result.totalCost).toFixed(2)} рублей`
                                );
                                bot.sendMessage(chatId,'Сохранить данный расчет ?', {reply_markup: {
                                        inline_keyboard: [
                                            [{text: 'Да', callback_data: 'yesSave'}],
                                            [{text: 'Нет', callback_data: 'noSave'}],
                                        ]
                                    }})
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
