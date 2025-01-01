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

    static getSelectElements({ defaultTableKey, tables, inputs }) {
        let output = {
            lines: ["SELECT *"],
            valuesToEscape: []
        };

        // if( MySQLEnums.SPECIAL_SELECT_KEYS.includes(inputKey) ) {
        //     output.lines = "";

        //     if( inputs.hasOwnProperty('fields_to_retrieve') ) {

        //     }
        // }

        return output;
    }

    static getFromString({ defaultTableKey, tables }) {
        return `FROM \`${[tables[defaultTableKey].label]}\` `;
    }

    /*
        inputString:
            tables_joins = leftTable1.leftField-rightTable1.rightField,leftTable2.leftField-rightTable2.rightField
    */
    static getJoinsLines({ defaultTableKey, tables, inputString }) {
        let output = [];

        const tablesLinks = inputString.split(',');
        for(const tableLink of tablesLinks) {
            const links = tableLink.split('-');

            const leftTable = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: links[0] });
            const leftField = this.extractTableField({ table: leftTable, inputString: links[0] });

            const rightTable = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: links[1] });
            const rightField = this.extractTableField({ table: leftTable, inputString: links[1] });

            output.push(`INNER JOIN \`${rightTable.label}\` ON \`${leftTable.label}\`.\`${leftField}\` = \`${rightTable.label}\`.\`${rightField}\` `);
        }

        return output;
    }

    /*
        inputString:
            and_id_eq
        inputValue:
            1
    */
    static getWhereElements({ defaultTableKey, tables, inputString, inputValue }) {
        let output = {
            table: "",
            field: "",
            logicalOperator: "",
            comparisonOperator: "",
            valueToEscape: null,
        };

        const table = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: inputString });
        output.table = table.label;
        output.field = this.extractTableField({ table: table, inputString: inputString });
        output.logicalOperator = this.extractLogicalOperator({ inputString })
        output.comparisonOperator = this.extractComparisonOperator({ table: table, field: output.field, inputString: inputString });

        output.valueToEscape = inputValue;
        if( typeof inputValue === 'string' && inputValue.toLowerCase() === "is_null" ) {
            output.valueToEscape = "IS NULL";
        } else if( typeof inputValue === 'string' && inputValue.toLowerCase() === "is_not_null" ) {
            output.valueToEscape = "IS NOT NULL";
        }

        return output;
    }

    // /*
    //     inputString:
    //         group_by = myTable.myField
    //         group_by = myField
    //         group_by = and_myField_like
    // */
    // static getGroupQuery({ defaultTableKey, tables, inputString }) {
    //     const table = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: inputString });
    //     const tableInput = this.extractTableInput({ table: leftTable, inputString: inputString });
    //     return `GROUP BY \`${table.label}\`.\`${tableInput}\``;
    // }

    /*
        inputString:
            sort = myField1_ASC,myField2_DESC
            sort = myTable1.myField1_ASC,myTable1.myField2_DESC
    */
    // static getSortString({ defaultTableKey, tables, inputString }) {
    //     let output = `ORDER BY `;

    //     let orderByArray = [];
    //     const sortElements = inputString.split(",");
    //     for(const element of sortElements) {
    //         const table = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: inputString });
    //         const tableInput = this.extractTableInput({ table: leftTable, inputString: inputString });
    //         const inputElements = tableInput.split('_');

    //         const field = table.hasOwnProperty(inputElements[0]) ? inputElements[0] : table.primaryKey;
    //         let direction = inputElements[1].toUpperCase();
    //         if( !MySQLEnums.SORT_DIRECTIONS.includes(direction) ) {
    //             direction = MySQLEnums.SORT_DIRECTIONS[0];
    //         }
    //         orderByArray.push(`\`${table.label}\`.\`${field}\` ${direction}`)
    //     }
    //     output += orderByArray.join(" , ");

    //     return output;
    // }

    // /*
    //     elements_per_page = 10
    //     page = 3
    // */
    // static getSkipQuery({ elementsPerPage, page }) {
    //     const countElements = parseInt(elementsPerPage) || 20;
    //     const countPage = parseInt(page) || 20;
    //     return countPage * countElements;
    // }

    // /*
    //     elements_per_page = 10
    // */
    // static getLimitQuery({ elementsPerPage }) {
    //     return parseInt(elementsPerPage) || 20;
    // }

    // // ====================================================

    /*
        inputString:
            myTable.myField
            myField
            and_myField_like
        output:
            myTable = { id: { dataType: MySQLEnums.DataTypes.BIGINT_UNSIGNED, ... }, ... }
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
            myTable.and_myField_like
        output:
            myField
    */
    static extractTableField({ table, inputString }) {
        let output = table.primaryKey;

        const elements = inputString.split('.');
        const element = elements.length === 1 ? elements[0] : elements[1];
        if( element.includes("_") ) {
            const subElements = element.split("_");
            if( table.schema.hasOwnProperty( subElements[1] ) ) {
                output = subElements[1];
            }

        } else if( table.schema.hasOwnProperty(element) ) {
            // && !element.includes("_")
            output = element;
        }

        return output;
    }

    /*
        inputString: 
            and_myField_like
            or_myField_eq
        output:
            and
            or
    */
    static extractLogicalOperator({ inputString }) {
        let output = "AND";

        const elements = inputString.split("_");
        if( MySQLEnums.LOGICAL_OPERATORS.includes(elements[0]) ) {
            output = elements[0].toUpperCase();
        }

        return output;
    }

    /*
        inputString: 
            and_myField_like
            or_myField_eq
        output:
            like
            =
    */
    static extractComparisonOperator({ table, field, inputString }) {
        let output = "=";

        const elements = inputString.split("_");
        if( table.schema.hasOwnProperty(field) && table.schema[field].hasOwnProperty("dataType") && elements.length === 2 ) {
            let validator = [];
            switch( table.schema[schema].dataType ) {
                case MySQLEnums.DataTypes.VARCHAR:
                case MySQLEnums.DataTypes.TEXT:
                case MySQLEnums.DataTypes.MEDIUMTEXT:
                case MySQLEnums.DataTypes.LONGTEXT:
                case MySQLEnums.DataTypes.ENUM:
                    validator = MySQLEnums.COMPARISON_OPERATORS_TEXT;
                    break;
                case MySQLEnums.DataTypes.TINYINT:
                case MySQLEnums.DataTypes.SMALLINT:
                case MySQLEnums.DataTypes.MEDIUMINT:
                case MySQLEnums.DataTypes.INT:
                case MySQLEnums.DataTypes.BIGINT:
                case MySQLEnums.DataTypes.TINYINT_UNSIGNED:
                case MySQLEnums.DataTypes.SMALLINT_UNSIGNED:
                case MySQLEnums.DataTypes.MEDIUMINT_UNSIGNED:
                case MySQLEnums.DataTypes.INT_UNSIGNED:
                case MySQLEnums.DataTypes.BIGINT_UNSIGNED:
                case MySQLEnums.DataTypes.DOUBLE:
                case MySQLEnums.DataTypes.TIMESTAMP:
                    validator = MySQLEnums.COMPARISON_OPERATORS_NUMBERS;
                    break;
                case MySQLEnums.DataTypes.BOOLEAN:
                    validator = MySQLEnums.COMPARISON_OPERATORS_BOOLEAN;
                    break;
                default:
                    console.error(`MySQLTools extractComparisonOperator - datatype not found: ${table.label}.${fieldName}`);
                    break;
            }

            if( validator.includes(elements[2]) ) {
                switch( elements[2] ) {
                    case "like":
                        output = ` LIKE `;
                        break;
                    case "nlike":
                        output = ` NOT LIKE `;
                        break;
                    case "eq":
                        output = ` = `;
                        break;
                    case "ne":
                        output = ` != `;
                        break;
                    case "gt":
                        output = ` > `;
                        break;
                    case "gte":
                        output = ` >= `;
                        break;
                    case "lt":
                        output = ` < `;
                        break;
                    case "lte":
                        output = ` <= `;
                        break;
                    case "in":
                        output = ` IN `;
                        break;
                    case "nin":
                        output = ` NOT IN `;
                        break;
                    default:
                        output = '';
                        break;
                }
            }

        } else {
            console.error(`MySQLTools extractComparisonOperator - ${table.label}.${field} not found in schema`);
        }

        return output;
    }
}