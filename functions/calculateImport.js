const axios = require('axios'); // Убедитесь, что axios установлен



async function convertToRUB(amountInEUR) {
    try {
        const response = await axios.get('https://v6.exchangerate-api.com/v6/eb6c32533fd66fe5bcc11a5e/latest/EUR');
        if (response.status !== 200) {
            throw new Error(`Ошибка API: ${response.status}`);
        }
        const conversionRate = response.data.conversion_rates.RUB;
        return amountInEUR * conversionRate;
    } catch (error) {
        console.error("Ошибка при конвертации валюты:", error);
        throw new Error("Не удалось получить курс валюты.");
    }
}

async function calculateImportPrice(data) {
    // Конвертируем цену из евро в рубли
    const { price, year, power, engineVolume, type, typeUtilisation, brand, model } = data;

    const priceInRUB = await convertToRUB(price);

    // таможенный сбор (цены в рублях на вход и выход )
    function customsDuty(price) {
        if (price <= 200000) {
            return 775;
        } else if (price > 200000 && price <= 450000) {
            return 1550;
        } else if (price > 450000 && price <= 1200000) {
            return 3100;
        } else if (price > 1200000 && price <= 2700000) {
            return 8530;
        } else if (price > 2700000 && price <= 4200000) {
            return 12000;
        } else if (price > 4200000 && price <= 5500000) {
            return 15500;
        } else if (price > 5500000 && price <= 7000000) {
            return 20000;
        } else if (price > 7000000 && price <= 8000000) {
            return 23000;
        } else if (price > 8000000 && price <= 9000000) {
            return 25000;
        } else if (price > 9000000 && price <= 10000000) {
            return 27000;
        } else if (price > 10000000) {
            return 30000;
        }
    }

    // Акциз
    function exciseTax(power) {
        if (power <= 90) {
            return 0;
        } else if (power > 90 && power <= 150) {
            return power * 58;
        } else if (power > 150 && power <= 200) {
            return power * 557;
        } else if (power > 200 && power <= 300) {
            return power * 912;
        } else if (power > 300 && power <= 400) {
            return power * 1555;
        } else if (power > 400 && power <= 500) {
            return power * 1609;
        } else if (power > 500) {
            return power * 1662;
        }
    }

    // Утилизационный сбор
    function recyclingTax(typeUtilisation, year, engineVolume) {
        const age = new Date().getFullYear() - year;
        if (typeUtilisation === 'preferential') {
            if (age <= 3) {
                if (engineVolume <= 3000) return 3400;
                if (engineVolume > 3000 && engineVolume <= 3500) return 970000;
                if (engineVolume > 3500) return 1235200;
            } else {
                if (engineVolume <= 3000) return 5200;
                if (engineVolume > 3000 && engineVolume <= 3500) return 1485000;
                if (engineVolume > 3500) return 1623800;
            }
        }
        if (typeUtilisation === 'commercial') {
            if (age <= 3) {
                if (engineVolume <= 1000) return 81200;
                if (engineVolume > 1000 && engineVolume <= 2000) return 300600;
                if (engineVolume > 2000 && engineVolume <= 3000) return 844800;
                if (engineVolume > 3000 && engineVolume <= 3500) return 970000;
                if (engineVolume > 3500) return 1235200;
            } else {
                if (engineVolume <= 1000) return 5200;
                if (engineVolume > 1000 && engineVolume <= 2000) return 12000;
                if (engineVolume > 2000 && engineVolume <= 3000) return 52000;
                if (engineVolume > 3000 && engineVolume <= 3500) return 1485000;
                if (engineVolume > 3500) return 1623800;
            }
        }
    }

    // Таможенная пошлина
    function customsTax(year, price, engineVolume) {
        const age = new Date().getFullYear() - year;
        let tax = 0;
        if (age <= 3) {
            // На вход сумма в евро, посде действий возращаетя уже в рублях
            if (price <= 8500) {
                tax = Math.max(price * 0.54, engineVolume * 2.5);
            } else if (price > 8500 && price <= 16700) {
                tax = Math.max(price * 0.48, engineVolume * 3.5);
            } else if (price > 16700 && price <= 42300) {
                tax = Math.max(price * 0.48, engineVolume * 5.5);
            } else if (price > 42300 && price <= 84500) {
                tax = Math.max(price * 0.48, engineVolume * 7.5);
            } else if (price > 84500 && price <= 169000) {
                tax = Math.max(price * 0.48, engineVolume * 15);
            } else if (price > 169000) {
                tax = Math.max(price * 0.48, engineVolume * 20);
            }
        } else if (age > 3 && age <= 5) {
            if (engineVolume <= 1000) {
                tax = engineVolume * 1.5;
            } else if (engineVolume > 1000 && engineVolume <= 1500) {
                tax = engineVolume * 1.7;
            } else if (engineVolume > 1500 && engineVolume <= 1800) {
                tax = engineVolume * 2.5;
            } else if (engineVolume > 1800 && engineVolume <= 2300) {
                tax = engineVolume * 2.7;
            } else if (engineVolume > 2300 && engineVolume <= 3000) {
                tax = engineVolume * 3;
            } else if (engineVolume > 3000) {
                tax = engineVolume * 3.6;
            }
        } else if (age > 5) {
            if (engineVolume <= 1000) {
                tax = engineVolume * 3;
            } else if (engineVolume > 1000 && engineVolume <= 1500) {
                tax = engineVolume * 3.2;
            } else if (engineVolume > 1500 && engineVolume <= 1800) {
                tax = engineVolume * 3.5;
            } else if (engineVolume > 1800 && engineVolume <= 2300) {
                tax = engineVolume * 4.8;
            } else if (engineVolume > 2300 && engineVolume <= 3000) {
                tax = engineVolume * 5;
            } else if (engineVolume > 3000) {
                tax = engineVolume * 5.7;
            }
        }
        return tax
    }

    // НДС
    function VAT(type, price) {
        return type === "Юридическое Лицо" ? price * 0.2 : 0;
    }
    const priceInRub = await convertToRUB(price)
    // Расчет таможенного сбора
    const customsDutyAmount = customsDuty(priceInRUB);
    // Расчет акциза
    const exciseTaxAmount = exciseTax(power)
    // Расчет утилизационного сбора
    const recyclingTaxAmount = recyclingTax(typeUtilisation, year, engineVolume);
    // Расчет таможенной пошлины
    const customsTaxAmount = await convertToRUB(customsTax(year, price, engineVolume));
    // Расчет НДС
    const VATAmount = VAT(type, priceInRUB);


    // Возвращаем объект с результатами
    return {
        customsDuty: customsDutyAmount,
        exciseTax: exciseTaxAmount,
        recyclingTax: recyclingTaxAmount,
        customsTax: customsTaxAmount,
        VAT: VATAmount,
        totalCost: customsDutyAmount + exciseTaxAmount + recyclingTaxAmount + customsTaxAmount + VATAmount,
        nameBrand: brand,
        nameModel: model,
        priceRub: priceInRub
    };
}

module.exports = { calculateImportPrice };
