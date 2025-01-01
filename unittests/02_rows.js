import assert from 'assert'
import MySQLDatabase from '../src/mysql_database.js';
import ProductTable from './product_table.js';

describe('ROWS', function () {
    const DUMMIES_COUNT = 10
    
    it('Create', async function () {
        const rowOutput = await MySQLDatabase.createRow({ table: ProductTable, inputs: {
            label: "Lorem Ipsum",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pellentesque metus ipsum, vel ultrices mi faucibus vel. Interdum et malesuada fames ac ante ipsum primis in faucibus.",
            price: 73.75
        } });

        const readOutput = await MySQLDatabase.readRow({ table: ProductTable, idValue: rowOutput[ProductTable.primaryKey] })
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
        const readOuput = await MySQLDatabase.listRows({ inputs: {
            from: ProductTable.label,
            elements_per_page: 1,
            page: 0,
            fields_to_retrieve: `id,${ProductTable.label}.label`
        } });
        
        const fields = Object.keys(readOuput[0]);
        assert.deepEqual( 
            [ fields.length, fields.includes(`${ProductTable.label}.id`), fields.includes(`${ProductTable.label}.label`) ],
            [ 2, true, true ]
        );
    })

    // TODO: fields_to_retrieve
    // TODO: SORT
    // TODO: GROUP BY
    // TODO: DISTINCT
})