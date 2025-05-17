require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * Database connection manager 
 * Provides pool management and structured access to the database
 */
class Database {
    constructor() {
        this.pool = null;
        this.init();
    }

    init() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            namedPlaceholders: true
        });

        // Test connection
        this.pool.getConnection()
            .then(conn => {
                console.log('Database connection established successfully');
                conn.release();
            })
            .catch(err => {
                console.error('Database connection failed:', err.message);
            });
    }

    /**
     * Execute a query with parameters
     * @param {string} sql - SQL query with placeholders
     * @param {Object|Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    async query(sql, params = []) {
        try {
            const [results] = await this.pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Database query error:', error.message);
            console.error('Query:', sql);
            throw error;
        }
    }

    /**
     * Begin a transaction
     * @returns {Promise<Connection>} Database connection with transaction
     */
    async beginTransaction() {
        const connection = await this.pool.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    /**
     * Execute a query within a transaction
     * @param {Connection} connection - Active connection with transaction
     * @param {string} sql - SQL query with placeholders
     * @param {Object|Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    async transactionQuery(connection, sql, params = []) {
        try {
            const [results] = await connection.execute(sql, params);
            return results;
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    /**
     * Commit a transaction and release the connection
     * @param {Connection} connection - Active connection with transaction
     */
    async commitTransaction(connection) {
        await connection.commit();
        connection.release();
    }

    /**
     * Rollback a transaction and release the connection
     * @param {Connection} connection - Active connection with transaction
     */
    async rollbackTransaction(connection) {
        await connection.rollback();
        connection.release();
    }
}

// Export singleton instance
module.exports = new Database();
