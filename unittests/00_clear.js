import assert from 'assert'
import MySQLDatabase from '../src/mysql_database.js';

describe('CLEAR', function () {

    it('Foreign keys', async function () {
        await MySQLDatabase.clearForeignKeys();

        const sqlRequest = `SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_TYPE = 'FOREIGN KEY';`
        const result = await MySQLDatabase.query({ inquiry: sqlRequest });
        
        assert.deepEqual(result[0], []);
    })

    it('Tables', async function () {
        await MySQLDatabase.clearTables();

        const sqlRequest = `SELECT table_name FROM information_schema.tables 
        WHERE table_schema = '${process.env.DB_DATABASE}';`
        const result = await MySQLDatabase.query({ inquiry: sqlRequest });
        assert.deepEqual(result[0], []);
    })
});