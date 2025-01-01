import assert from 'assert'
import MySQLDatabase from '../src/mysql_database.js';
import ProductTable from './product_table.js';
import MySQLEnums from '../src/mysql_enums.js';

describe('ROWS', function () {
    const DUMMIES_COUNT = 10
    
    it('Create', async function () {
        const rowOutput = await MySQLDatabase.createRow({ table: ProductTable, inputs: {
            label: "Lorem Ipsum",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pellentesque metus ipsum, vel ultrices mi faucibus vel. Interdum et malesuada fames ac ante ipsum primis in faucibus.",
            price: 73.75
        } });

        const readOutput = await MySQLDatabase.readRow({ table: ProductTable, primaryValue: rowOutput[ProductTable.primaryKey] })
        assert.deepEqual( 
            [ rowOutput[ProductTable.primaryKey] !== null, readOutput[ProductTable.primaryKey] ],
            [ true, rowOutput[ProductTable.primaryKey] ]
        );
    })

    it('Count without WHERE', async function () {
        for( let i = 0; i < DUMMIES_COUNT; ++i ) {
            await MySQLDatabase.createRow({ table: ProductTable, inputs: {
                label: `Product ${i+1}`,
                price: i * 11.11
            } });
        }

        const count = await MySQLDatabase.countRows({ inputs: {
            from: ProductTable.label,
            count: ProductTable.primaryKey
        } })
        assert.deepEqual( 
            [ count ],
            [ DUMMIES_COUNT+1 ]
        );
    })

    it('Count with WHERE IS NOT NULL', async function () {
        const count = await MySQLDatabase.countRows({ inputs: {
            from: ProductTable.label,
            count: ProductTable.primaryKey,
            and_description_like: "isnotnull"
        } })
        assert.deepEqual( 
            [ count ],
            [ 1 ]
        );
    })

    it('Count with WHERE IS NULL', async function () {
        const count = await MySQLDatabase.countRows({ inputs: {
            from: ProductTable.label,
            count: ProductTable.primaryKey,
            and_description_like: "isnull"
        } })
        assert.deepEqual( 
            [ count ],
            [ DUMMIES_COUNT ]
        );
    })

    it('fields_to_retrieve', async function () {
        const rows = await MySQLDatabase.listRows({ inputs: {
            from: ProductTable.label,
            elements_per_page: 1,
            page: 0,
            fields_to_retrieve: `id,${ProductTable.label}.label`
        } });
        const fields = Object.keys(rows[0]);

        assert.deepEqual( 
            [ fields.length, fields.includes(`${ProductTable.label}.id`), fields.includes(`${ProductTable.label}.label`) ],
            [ 2, true, true ]
        );
    })

    it('sort', async function () {
        const rows = await MySQLDatabase.listRows({ inputs: {
            from: ProductTable.label,
            elements_per_page: 1,
            page: 0,
            sort: "price_DESC"
        } });
        const row = rows[0];

        assert.deepEqual( 
            [ row.id ],
            [ DUMMIES_COUNT+1 ]
        );
    })

    it('Update with dates', async function () {
        const date = new Date();
        date.setFullYear( date.getFullYear() + 1 );
        const dateFormatted = date.valueOf();

        await MySQLDatabase.updateRow({ table: ProductTable, primaryValue: 1, 
            inputs: {
                updated: dateFormatted
            }
        });

        const row = await MySQLDatabase.readRow({ table: ProductTable, primaryValue: 1 })
        assert.deepEqual( 
            [ row.updated ],
            [ dateFormatted ]
        );
    })

    it('Delete with select DISTINCT', async function () {
        await MySQLDatabase.deleteRow({ table: ProductTable, primaryValue: 1});

        const rows = await MySQLDatabase.listRows({ inputs: {
            from: ProductTable.label,
            distinct: "state",
            elements_per_page: Number.MAX_SAFE_INTEGER,
            sort: "state_ASC"
        } })

        assert.deepEqual( 
            rows,
            [ { state: MySQLEnums.States.ACTIVE }, { state: MySQLEnums.States.DELETED } ]
        );
    })
})