import assert from 'assert'
import MySQLDatabase from '../src/mysql_database.js';
import MySQLEnums from '../src/mysql_enums.js';
import ProductTable from './annexes/product_table.js';
import MerchantTable from './annexes/merchant_table.js';

describe('ROWS', function () {
    const DUMMIES_COUNT = 10;
    let MERCHANT_ID;

    before(async function () {
        MySQLDatabase.setInputPath({ inputPath: `${process.cwd()}/unittests/annexes` });
        await MySQLDatabase.loadTables({ lazy: false });

        await MySQLDatabase.upsertTable({ table: MerchantTable });
        const merchantOutput = await MySQLDatabase.createRow({ table: MerchantTable, inputs: {
            name: "Jane DOE"
        } });
        MERCHANT_ID = merchantOutput[MerchantTable.primaryKey];
    })
    
    it('Create', async function () {
        const rowOutput = await MySQLDatabase.createRow({ table: ProductTable, inputs: {
            label: "Lorem Ipsum",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pellentesque metus ipsum, vel ultrices mi faucibus vel. Interdum et malesuada fames ac ante ipsum primis in faucibus.",
            price: 73.75,
            merchant_id: MERCHANT_ID
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
                price: i * 11.11,
                merchant_id: MERCHANT_ID
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

    it('select inner join', async function () {
        const rows = await MySQLDatabase.listRows({ inputs: {
            from: ProductTable.label,
            tables_joins: `${ProductTable.label}.merchant_id-${MerchantTable.label}.${MerchantTable.primaryKey}`,
            elements_per_page: 1,
            page: 0,
        } });
        const fields = Object.keys(rows[0]);

        assert.deepEqual( 
            [   fields.length, 
                fields.includes(`${ProductTable.label}.${ProductTable.primaryKey}`), 
                fields.includes(`${MerchantTable.label}.${MerchantTable.primaryKey}`) 
            ],
            [ Object.keys(ProductTable.schema).length + Object.keys(MerchantTable.schema).length, true, true ]
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

    it('Count, fields_to_retrieve and group', async function () {
        const rows = await MySQLDatabase.listRows({ inputs: {
            from: ProductTable.label,
            count: ProductTable.primaryKey,
            fields_to_retrieve: "state",
            group_by: "state"
        } })

        assert.deepEqual( 
            rows ,
            [ { count: 10, ["product.state"]: MySQLEnums.States.ACTIVE }, { count: 1, ["product.state"]: MySQLEnums.States.DELETED } ]
        );
    })
    

    it('Ids in', async function () {
        const rows = await MySQLDatabase.listRows({ inputs: {
            from: ProductTable.label,
            and_id_in: "1,4",
        } });

        assert.deepEqual( 
            [ rows[0].id, rows[1].id ] ,
            [ 1, 4 ]
        );
    })

    it('Same field multiple values', async function () {
        const countOr = await MySQLDatabase.countRows({ inputs: {
            from: ProductTable.label,
            count: ProductTable.primaryKey,
            or_label_like: "%lorem%,%product%",
        } });

        const countAnd = await MySQLDatabase.countRows({ inputs: {
            from: ProductTable.label,
            count: ProductTable.primaryKey,
            and_label_like: "%lorem%,%product%",
        } });
        
        assert.deepEqual(
            [ countOr, countAnd ] ,
            [ DUMMIES_COUNT+1, 0 ]
        );
    })
})