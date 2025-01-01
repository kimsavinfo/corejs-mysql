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

        for (const [inputKey, inputValue] of Object.entries(inputs)) {
            if( MySQLEnums.SPECIAL_SELECT_KEYS.includes(inputKey) ) {
                output.lines = [];

                if( inputKey === 'count' ) {
                    /*
                        inputKey: count
                        inputValue: 
                            my_table.my_field
                            my_field
                    */
                    const table = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: inputValue });
                    const field = this.extractTableField({ table: table, inputString: inputValue });
                    output.lines.push(`SELECT COUNT(\`${table.label}\`.\`${field}\`) AS count`);

                } else if( inputKey === 'fields_to_retrieve' ) {
                    /*
                        inputKey: fields_to_retrieve
                        inputValue: 
                            my_field1
                            my_table.my_field1,my_table.my_field2
                            my_field1,my_field2
                    */
                    let line = "";
                    const elements = inputValue.split(",");
                    for( const element of elements ) {
                        const table = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: element });
                        const field = this.extractTableField({ table: table, inputString: element });

                        line = output.lines.length === 0 ? "SELECT " : ", ";
                        line +=  ` \`${table.label}\`.\`${field}\` AS "${table.label}.${field}" `;
                        output.lines.push(line);
                    }
                }

                break;
            }
        }

        return output;
    }

    static getFromString({ defaultTableKey, tables }) {
        return `FROM \`${[tables[defaultTableKey].label]}\` `;
    }

    /*
        inputString:
            tables_joins = left_table1.left_field-right_table1.right_field
            tables_joins = left_table1.left_field-right_table1.right_field,left_table2.left_field-right_table2.right_field
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

        if( typeof inputValue === 'string' && inputValue.toLowerCase() === "isnull" ) {
            output.comparisonOperator = "IS NULL";
        } else if( typeof inputValue === 'string' && inputValue.toLowerCase() === "isnotnull" ) {
            output.comparisonOperator = "IS NOT NULL";
        } else {
            output.valueToEscape = inputValue;
        }

        return output;
    }

    // /*
    //     inputString:
    //         group_by = my_table.my_field
    //         group_by = my_field
    //         group_by = and_my_field_like
    // */
    // static getGroupQuery({ defaultTableKey, tables, inputString }) {
    //     const table = this.extractTable({ defaultTableKey: defaultTableKey, tables: tables, inputString: inputString });
    //     const tableInput = this.extractTableInput({ table: leftTable, inputString: inputString });
    //     return `GROUP BY \`${table.label}\`.\`${tableInput}\``;
    // }

    /*
        inputString:
            sort = my_field1_ASC,my_field2_DESC
            sort = my_table1.my_field1_ASC,my_table1.my_field2_DESC
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

    /*
        inputs:
            elements_per_page = 10
            page = 3
        outputs:
            30
    */
    static getSkipNumber({ elementsPerPage, page }) {
        const countElements = parseInt(elementsPerPage) || 20;
        const countPage = parseInt(page) || 0;
        return countPage * countElements;
    }

    /*
        inputs:
            elements_per_page = 10
        outputs:
            10
    */
    static getLimitNumber({ elementsPerPage }) {
        return parseInt(elementsPerPage) || 20;
    }

    // // ====================================================

    /*
        inputString:
            my_table.my_field
            my_field
            and_my_field_like
        output:
            my_table = { id: { dataType: MySQLEnums.DataTypes.BIGINT_UNSIGNED, ... }, ... }
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
            my_table.my_field
            my_field
            and_my_field_like
            my_table.and_my_field_like
        output:
            my_field
    */
    static extractTableField({ table, inputString }) {
        let output = table.primaryKey;

        const elements = inputString.split('.');
        const element = elements.length === 1 ? elements[0] : elements[1];
        if( element.includes("_") ) {
            let subElements = element.split("_");
            subElements.shift();
            subElements.pop();
            const field = subElements.join("_");

            if( table.schema.hasOwnProperty( field ) ) {
                output = field;
            }

        } else if( table.schema.hasOwnProperty(element) ) {
            // && !element.includes("_")
            output = element;
        }

        return output;
    }

    /*
        inputString: 
            and_my_field_like
            or_my_field_eq
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
            and_my_field_like
            or_my_field_eq
        output:
            like
            =
    */
    static extractComparisonOperator({ table, field, inputString }) {
        let output = "=";

        const elements = inputString.split("_");
        if( table.schema.hasOwnProperty(field) && table.schema[field].hasOwnProperty("dataType") && elements.length >= 3 ) {
            let validator = [];
            switch( table.schema[field].dataType ) {
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

            let comparator = elements[elements.length - 1];
            if( validator.includes(comparator) ) {
                switch( comparator ) {
                    case "like":
                        output = `LIKE`;
                        break;
                    case "nlike":
                        output = `NOT LIKE`;
                        break;
                    case "eq":
                        output = `=`;
                        break;
                    case "ne":
                        output = `!=`;
                        break;
                    case "gt":
                        output = `>`;
                        break;
                    case "gte":
                        output = `>=`;
                        break;
                    case "lt":
                        output = `<`;
                        break;
                    case "lte":
                        output = `<=`;
                        break;
                    case "in":
                        output = `IN`;
                        break;
                    case "nin":
                        output = `NOT IN`;
                        break;
                    default:
                        output = '';
                        break;
                }
            }

        } else {
            console.error(`MySQLTools extractComparisonOperator - ${inputString} -> ${table.label}.${field} not found in schema`);
        }

        return output;
    }
}