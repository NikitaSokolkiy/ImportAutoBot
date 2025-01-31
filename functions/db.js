const { Pool } = require('pg');
require('dotenv').config()
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});
pool.connect((err) => {
    if (err) {
        console.error('Connection error', err.stack);
    } else {
        console.log('Connected to PostgreSQL');
    }
});


async function saveCalculation(userId, carData){
    const query = `
    INSERT INTO calculations(user_id, brand, model, price, year, power, engine_volume, type, type_utilisation)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
    const values =  [
        userId,
        carData.brand,
        carData.model,
        carData.price,
        carData.year,
        carData.power,
        carData.engineVolume,
        carData.type,
        carData.typeUtilisation
    ];
    try{
        await pool.query(query, values);
        console.log('Calculating is Saved');
    } catch (err){
        console.error('Error saving calculation: ', err)
    }
}
async function getCalculations(userId){
    const query = `
    SELECT id, brand, model, year FROM calculations WHERE user_id = $1
    `;
    try {
        const result = await pool.query(query, [userId]);
        return result.rows;
    } catch (err){
        console.error('Error fetching calculations: ', err);
        return [];
    }
}

async function getCalculationById(id){
    const query = `
    SELECT * FROM calculations WHERE id = $1
    `;
    try {
        const result = await pool.query(query,[id]);
        return result.rows[0];
    } catch (err){
        console.error('Error fetching calculation:', err);
        return null
    }
}


async function deleteCalculation(id) {
    const query = `
        DELETE FROM calculations WHERE id = $1
    `;
    try {
        await pool.query(query, [id]);
        console.log('Calculation deleted');
    } catch (err) {
        console.error('Error deleting calculation:', err);
    }
}

module.exports = {
    saveCalculation,
    getCalculations,
    getCalculationById,
    deleteCalculation
}
