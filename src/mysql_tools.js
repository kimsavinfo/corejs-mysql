import { existsSync, readdirSync, lstatSync } from 'node:fs';

import MySQLEnums from "./mysql_enums.js";

export default class MySQLTools {

    static getTablesFilesPaths({ inputPath=`${process.cwd()}` }) {
        return this.#getFilesPaths({ 
            inputPath: inputPath, 
            recursive: true, 
            whitelist: ["_table.js"], 
            output: []
        });
    }

    static #getFilesPaths({ inputPath, recursive = true, whitelist = ["*"], output = []  }) {
        if ( existsSync(inputPath) ) {
            const files = readdirSync(inputPath);

            for( const file of files ) {
                const path = `${inputPath}/${file}`;

                if( lstatSync(path).isDirectory() ) {
                    this.#getFilesPaths({ inputPath: path, recursive: recursive, whitelist: whitelist, output: output} );

                } else {
                    if( whitelist[0] === "*" ) {
                        output.push(path);
                    } else {
                        
                        let add = false;
                        for( const whiteKey of whitelist ) {
                            add |= file.includes(whiteKey);
                        }
                        if(add) {
                            output.push(path);
                        }

                    }
                }
            }
        }

        return output;
    }

    // ====================================================

    /*
        inputString:
            tables_joins = leftTable1.leftField-rightTable1.rightField,leftTable2.leftField-rightTable2.rightField
    */
    static getJoinsQuery({ defaultTableKey, tables, inputString }) {
        let output = "";

        const tablesLinks = inputString.split(',');
        for(const tableLink of tablesLinks) {
            const links = tableLink.split('-');

            const leftTable = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: links[0] });
            const leftTableInput = this.extractTableInput({ table: leftTable, inputString: links[0] });

            const rightTable = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: links[1] });
            const rightTableInput = this.extractTableInput({ table: leftTable, inputString: links[1] });

            output += `INNER JOIN \`${rightTable.label}\` `;
            output += `ON \`${leftTable.label}\`.\`${leftTableInput}\` = \`${rightTable.label}\`.\`${rightTableInput}\` `;
        }

        return output;
    }

    static getJoinsQuery({ defaultTableKey, tables, inputString }) {
    }

    /*
        inputString:
            group_by = myTable.myField
            group_by = myField
            group_by = and_myField_like
    */
    static getGroupQuery({ defaultTableKey, tables, inputString }) {
        const table = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: inputString });
        const tableInput = this.extractTableInput({ table: leftTable, inputString: inputString });
        return `GROUP BY \`${table.label}\`.\`${tableInput}\``;
    }

    /*
        inputString:
            sort = myField1_ASC,myField2_DESC
            sort = myTable1.myField1_ASC,myTable1.myField2_DESC
    */
    static getSortQuery({ defaultTableKey, tables, inputString }) {
        let output = `ORDER BY `;

        let orderByArray = [];
        const sortElements = inputString.split(",");
        for(const element of sortElements) {
            const table = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: inputString });
            const tableInput = this.extractTableInput({ table: leftTable, inputString: inputString });
            const inputElements = tableInput.split('_');

            const field = table.hasOwnProperty(inputElements[0]) ? inputElements[0] : table.primaryKey;
            let direction = inputElements[1].toUpperCase();
            if( !MySQLEnums.SORT_DIRECTIONS.includes(direction) ) {
                direction = MySQLEnums.SORT_DIRECTIONS[0];
            }
            orderByArray.push(`\`${table.label}\`.\`${field}\` ${direction}`)
        }
        output += orderByArray.join(" , ");

        return output;
    }

    // TODO: from to
    /*
        elements_per_page = 10
        page = 3
    */
    static getSkipQuery({ elementsPerPage, page }) {
        let from = 0;

        const countElements = parseInt(elementsPerPage) || 20;
        const countPage = parseInt(page) || 20;
        return countPage * countElements;
    }

    /*
        elements_per_page = 10
    */
    static getLimitQuery({ elementsPerPage }) {
        let to = 20;

        return parseInt(elementsPerPage) || 20;
    }

    // ====================================================

    /*
        inputString:
            myTable.myField
            myField
            and_myField_like
    */
    static extractTable({ defaultTableKey, tables, inputString }) {
        let output = tables[defaultTableKey];
        
        const elements = inputString.split('.');
        if( elements.length === 2 && tables.hasOwnProperty(elements[0]) ) {
            output = tables[elements[0]];
        }

        return output;
    }

    /*
        inputString: 
            myTable.myField
            myField
            and_myField_like
    */
    static extractTableInput({ table, inputString }) {
        let output = table.primaryKey;

        const elements = inputString.split('.');
        const element = elements.length === 1 ? elements[0] : elements[1];
        if( !element.includes("_") && table.schema.hasOwnProperty(element) ) {
            output = element
        }

        return output;
    }
}