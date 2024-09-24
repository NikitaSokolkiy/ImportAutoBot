function askCreditDetails (bot, chatId){
    bot.sendMessage(chatId, 'Введиете срок в месяцах: ')
    bot.once('message', (msg)=>{
        const term = parseInt(msg.text)
        if(isNaN(term) || term <= 0){
            bot.sendMessage(chatId, 'Введите корректное значение')
            return;
        }
        bot.sendMessage(chatId, 'Введите процентную ставку по кредиту (например: 5 для 5%)')
        bot.once('message', (msg)=>{
            const rate = parseFloat(msg.text)/100;
            if (isNaN(rate) || rate < 0) {
                bot.sendMessage(chatId, "Пожалуйста, введите корректное значение для процентной ставки.");
                return;
            }
            bot.sendMessage(chatId, 'Введите желаемую сумму кредита:');
            bot.once('message', (msg)=>{
                const amount = parseFloat(msg.text);
                if (isNaN(amount) || amount <= 0) {
                    bot.sendMessage(chatId, "Пожалуйста, введите корректное значение для суммы кредита.");
                    return;
                }
                const {monthlyPayment, totalPayment, interestPayment}  = calculateLoan(term, rate, amount);
                bot.sendMessage(chatId, `Расчет по кредитному условию:\n` +
                    `Ежемесячный платеж: ${monthlyPayment.toFixed(2)} рублей\n` +
                    `Переплата по кредиту: ${interestPayment.toFixed(2)} рублей\n` +
                    `Общая сумма кредита: ${totalPayment.toFixed(2)} рублей`);
            });
        })
    });
}

function calculateLoan (term, rate, amount){
    const monthlyRate = rate / 12;
    const monthlyPayment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));
    const totalPayment = monthlyPayment * term;
    const interestPayment = totalPayment - amount;

    return { monthlyPayment, totalPayment, interestPayment };
}

module.exports = {askCreditDetails}