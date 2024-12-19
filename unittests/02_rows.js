import assert from 'assert'
import MySQLDatabase from '../src/mysql_database.js';
import ProductTable from './product_table.js';

describe('ROWS', function () {
    
    it('Create', async function () {
        const rowOutput = await MySQLDatabase.createRow({ table: ProductTable, inputs: {
            label: "Lorem Ipsum",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pellentesque metus ipsum, vel ultrices mi faucibus vel. Interdum et malesuada fames ac ante ipsum primis in faucibus.",
            price: 73.75
        } });

        const readOutput = await MySQLDatabase.listRows({ table: ProductTable, inputs: {
            [`and_${ProductTable.primaryKey}_eq`]: rowOutput[ProductTable.primaryKey]
        } })

        assert.deepEqual( 
            [ rowOutput[ProductTable.primaryKey] !== null, readOutput[0][ProductTable.primaryKey] ],
            [ true, rowOutput[ProductTable.primaryKey] ]
        );
    })
})