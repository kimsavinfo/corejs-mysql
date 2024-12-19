import assert from 'assert'
import MySQLDatabase from '../src/mysql_database.js';
import ProductTable from './product_table.js';
import ProductBisTable from './productbis_table.js';

describe('TABLES', function () {

    it('Create', async function () {
        await MySQLDatabase.upsertTable({ table: ProductTable });

        const tables = await MySQLDatabase.query({ inquiry: `SELECT table_name FROM information_schema.tables 
        WHERE table_schema = '${process.env.DB_DATABASE}';` });

        let created = false;
        for(const table of tables[0]) {
            if( table.table_name === ProductTable.label ) {
                created = true;
                break;
            }
        }

        assert.deepEqual(created, true);
    })

    it('Alter: add column', async function () {
        await MySQLDatabase.upsertTable({ table: ProductBisTable });

        const query = `SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${process.env.DB_DATABASE}'
        AND TABLE_NAME = '${ProductBisTable.label}';`;
        const fields = await MySQLDatabase.query({ inquiry: query });
        let found = false;
        for(const field of fields[0]) {
            if(field.COLUMN_NAME === "lorem") {
                found = true;
                break;
            }
        }
        
        assert.deepEqual(found, true);
    })

    it('Alter: drop column', async function () {
        await MySQLDatabase.upsertTable({ table: ProductTable });

        const query = `SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${process.env.DB_DATABASE}'
        AND TABLE_NAME = '${ProductTable.label}';`;
        const fields = await MySQLDatabase.query({ inquiry: query });
        let found = false;
        for(const field of fields[0]) {
            if(field.COLUMN_NAME === "lorem") {
                found = true;
                break;
            }
        }
        
        assert.deepEqual(found, false);
    })
})