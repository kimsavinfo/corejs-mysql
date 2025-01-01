import MySQLEnums from "./mysql_enums.js";

const WHERE_KEYS_BLACKLIST = [
    "sort",
    "elements_per_page",
    "page",
    "from",
    "to",
    "count",
    "distinct",
    "fields_to_retrieve",
    "table_main",
    "tables_joins",
    "group_by",
];

const LOGICAL_OPERATORS = [
    "and",
    "or", // ex: or_label_like: '%lorem%#%ipsum%'
];

const COMPARISON_OPERATORS_TEXT = [
    "like",
    "nlike",
    // "eq",
    // "ne",
    "in", // ex: and_label_in: 'lorem,ipsum'
    "nin"
];

const COMPARISON_OPERATORS_NUMBERS = [
    "eq",
    "gt",
    "gte",
    "lt",
    "lte",
    "ne",
    "in",
    "nin"
];

const COMPARISON_OPERATORS_BOOLEAN = [
    "eq",
    "ne"
];

export default class MySQLTools {
    static getCreateFieldQuery({ key, settings }) {
        let field = `\n\t\`${key}\` ${settings.dataType}`;

        if( settings.dataType === MySQLEnums.DataTypes.VARCHAR ) {
            field += `(${settings.length})`;
        } else if( settings.dataType === MySQLEnums.DataTypes.ENUM ) {
            field += `(`;
            for( const value of settings.values ) {
                field += `"${value}",`;
            }
            field = field.slice(0, -1);
            field += `)`;
        }

        if( settings.hasOwnProperty("nullable") ) {
            if( settings.nullable ) {
                field += ` NULL`;
            } else {
                field += ` NOT NULL`;
            }   
        }
        if( settings.autoIncrement ) {
            field += ` AUTO_INCREMENT`;
        }

        if( settings.hasOwnProperty("default") ) {
            field += ` DEFAULT ${settings.default}`;
        }
        if( settings.hasOwnProperty("onUpdate") ) {
            field += ` ON UPDATE ${settings.default}`;
        }

        // console.log(key, settings);
        // console.log(field);

        return field;
    }

    static getFormatedValue({ schema, field, value }) {
        let output;

        switch( schema[field].dataType ) {
            case MySQLEnums.DataTypes.DATETIME:

                output = value;
                if( typeof value === "string" ){
                    output = new Date(value).toISOString().slice(0, 19).replace('T', ' ');
                }

                break;
            default:
                output = value
                break;
        }

        return output;
    }

    static getSelectFieldsQuery({ tables, inputs }) {
        let tableRef = tables[inputs.from];

        let fieldsArray = [];
        if ( inputs.hasOwnProperty("distinct") ) {
            const fieldData = this.extractTableAndField({ inputString: inputs.distinct, tableKey: tableRef.label });
            if(fieldData.tableKey !== inputs.from && tables[fieldData.tableKey] ) {
                tableRef = tables[fieldData.tableKey];
            }

            if( tableRef.schema.hasOwnProperty(fieldData.fieldName) ) {
                fieldsArray.push(`DISTINCT( \`${fieldData.tableKey}\`.\`${fieldData.fieldName}\` )`);
            }
        }
        if( inputs.hasOwnProperty('count') ) {
            const fieldData = this.extractTableAndField({ inputString: inputs.count, tableKey: tableRef.label });
            if(fieldData.tableKey !== inputs.from && tables[fieldData.tableKey] ) {
                tableRef = tables[fieldData.tableKey];
            }

            if( !tableRef.schema.hasOwnProperty(fieldData.fieldName) ) {
                fieldData.fieldName = tableRef.primaryKey;
            }
            fieldsArray.push(`COUNT( \`${fieldData.tableKey}\`.\`${fieldData.fieldName}\` ) AS count`);

        }
        if( inputs.hasOwnProperty('fields_to_retrieve') ) {
            const tablesFields = inputs.fields_to_retrieve.split(',');
            for( const tableField of tablesFields ) {
                tableRef = tables[inputs.from];
                const fieldData = this.extractTableAndField({ inputString: tableField, tableKey: tableRef.label});
                if(fieldData.tableKey !== inputs.from && tables[fieldData.tableKey] ) {
                    tableRef = tables[fieldData.tableKey];
                }

                if( tableRef.schema.hasOwnProperty(fieldData.fieldName) ) {
                    fieldsArray.push(`\`${fieldData.tableKey}\`.\`${fieldData.fieldName}\` AS "${fieldData.tableKey}.${fieldData.fieldName}"`);
                }
            }
        }


        let selectSQL = `SELECT `;
        if( fieldsArray.length > 0 ) {
            selectSQL += fieldsArray.join(', ');
        } else {
            selectSQL += ` * `;
        }

        return selectSQL;
    }

    static getJoinsQuery({ tables, inputs }) {
        let joinsSQL = "";

        if( inputs.hasOwnProperty('tables_joins') ) {
            const tablesLinks = inputs.tables_joins.split(',');
            for(const tableLink of tablesLinks) {
                const links = tableLink.split('-');
                const linkLeftElements = links[0].split('.');
                const linkRightElements = links[1].split('.');
                
                let canLinkLeft = false;
                if( tables[linkLeftElements[0]] ) {
                    canLinkLeft = tables[linkLeftElements[0]].schema.hasOwnProperty(linkLeftElements[1]);
                }
                let canLinkRight = false;
                if( tables[linkRightElements[0]] ) {
                    canLinkRight = tables[linkRightElements[0]].schema.hasOwnProperty(linkRightElements[1]);
                }

                if( canLinkLeft && canLinkRight ){                    
                    joinsSQL += `INNER JOIN \`${linkRightElements[0]}\` ON \`${linkLeftElements[0]}\`.\`${linkLeftElements[1]}\` = \`${linkRightElements[0]}\`.\`${linkRightElements[1]}\``;
                } else {
                    console.error(`MySQLTools getJoinsQuery: ${linkLeftElements[0]}.${linkLeftElements[1]} or ${linkRightElements[0]}.${linkRightElements[1]} not found`)
                }
            }
        }

        return joinsSQL;
    }

    static getSelectWhereQuery({ tables, inputs, subquery=false }) {
        let whereSQL = ``;
        let valuesToEscape = [];

        // console.log("getSelectWhereQuery", inputs, subquery);
        let tableRef;
        for (const [input, value] of Object.entries(inputs)) {
            if( !WHERE_KEYS_BLACKLIST.includes(input) ) {
                tableRef = tables[inputs.from];
                const inputElements = input.split('_');

                if( inputElements.length >= 3 ) {
                    const logicalOperator = inputElements[0];
                    const comparisonOperator = inputElements[ inputElements.length - 1 ];

                    const tableField = inputElements.slice(1, -1).join("_");
                    const fieldData = this.extractTableAndField({ inputString: tableField, tableKey: tableRef.label });
                    if(fieldData.tableKey !== inputs.from && tables[fieldData.tableKey] ) {
                        tableRef = tables[fieldData.tableKey];
                    }

                    // console.log("getSelectWhereQuery", tableField);
                    // console.log("getSelectWhereQuery", fieldData,
                    //     MySQLConnector.doesTableFieldExist({ tableKey: fieldData.tableKey, fieldName: fieldData.fieldName })
                    //     ,this.isLogicalOperatorValid({ logicalOperator: logicalOperator })
                    //     ,this.isComparisonOperatorValid({ tableKey: fieldData.tableKey, fieldName: fieldData.fieldName, comparisonOperator: comparisonOperator })
                    // );

                    if( tableRef.schema.hasOwnProperty(fieldData.fieldName)
                        && this.isLogicalOperatorValid({ logicalOperator: logicalOperator })
                        && this.isComparisonOperatorValid({ table: tableRef, fieldName: fieldData.fieldName, comparisonOperator: comparisonOperator })
                    ) {
                        const comparisonOperatorQuery = this.getComparisonOperatorQuery({ comparisonOperator: comparisonOperator });

                        if(subquery) {
                            if( whereSQL.length > 0 ) {
                                whereSQL += `\n\t ${logicalOperator} `;
                            }
                        } else {
                            if( whereSQL.length === 0 ) {
                                whereSQL += `WHERE `;
                            } else {
                                whereSQL += `\n\t ${logicalOperator} `;
                            }
                        }

                        if( typeof value === 'string' && value.toLowerCase() === "is_null" ) {
                            whereSQL += ` \`${fieldData.tableKey}\`.\`${fieldData.fieldName}\` IS NULL `;
                        } else if( typeof value === 'string' && value.toLowerCase() === "is_not_null" ) {
                            whereSQL += ` \`${fieldData.tableKey}\`.\`${fieldData.fieldName}\` IS NOT NULL `;
                        } else {
                            whereSQL += ` \`${fieldData.tableKey}\`.\`${fieldData.fieldName}\` ${comparisonOperatorQuery} `;

                            if( comparisonOperator === "in" || comparisonOperator === "nin" ) {
                                whereSQL += ` ( `;
                                
                                let questionMarksArray = [];
                                const elements = value.split(',');
                                for( let iElement = 0 ; iElement < elements.length ; ++iElement ) {
                                    questionMarksArray.push('?');
                                    valuesToEscape.push( elements[iElement] );
                                }
                                whereSQL += questionMarksArray.join(", ");
    
                                whereSQL += ` ) `;
                            } else {
                                whereSQL += ` ? `;
                                valuesToEscape.push( value )
                            }
                        }
                    }
                } else if( inputElements.length === 2 
                    && LOGICAL_OPERATORS.includes(inputElements[0]) && Number.isInteger(Number(inputElements[1])) ) {
                    // Exemple: and_1 = "or_table.field_like###%lorem%,or_table.field2_like###%lorem%"
                    const lines = value.split(',');
                    let subInputs = {
                        from: inputs.from
                    };
                    for(const line of lines) {
                        const elements = line.split('###');
                        subInputs[`${elements[0]}`] = elements[1];
                    }
                    // console.log("subQuery inputs",subInputs)
                    const subQuery = this.getSelectWhereQuery({ tables: tables, inputs: subInputs, subquery: true });
                    // console.log("subQuery",subQuery)

                    if( whereSQL.length === 0 ) {
                        whereSQL += `WHERE (`;
                    } else {
                        whereSQL += `\n\t ${inputElements[0]} (`;
                    }

                    whereSQL += subQuery.whereSQL;
                    valuesToEscape = valuesToEscape.concat(subQuery.valuesToEscape);

                    whereSQL += `)`;
                }
            }
        }

        return {whereSQL: whereSQL, valuesToEscape: valuesToEscape};
    }

    // ==========
    
    static extractTableAndField({ inputString, tableKey = "" }) {
        const tableFieldElements = inputString.split('.');
        let outputTableKey = "";
        let fieldName = "";

        if( tableFieldElements.length === 1 ) {
            outputTableKey = tableKey;
            fieldName = inputString;
        } else if( tableFieldElements.length === 2 ) {
            outputTableKey = tableFieldElements[0];
            fieldName = tableFieldElements[1];
        }

        return {tableKey: outputTableKey, fieldName: fieldName};
    }

    static isLogicalOperatorValid({ logicalOperator }) {
        return LOGICAL_OPERATORS.includes(logicalOperator);
    }

    static isComparisonOperatorValid({ table, fieldName, comparisonOperator }) {
        let valid = false;

        if( table.schema.hasOwnProperty(fieldName) && table.schema[fieldName].hasOwnProperty("dataType") ) {
            // console.log(tableKey, fieldName, comparisonOperator);

            switch( table.schema[fieldName].dataType ) {
                case MySQLEnums.DataTypes.VARCHAR:
                case MySQLEnums.DataTypes.TEXT:
                case MySQLEnums.DataTypes.MEDIUMTEXT:
                case MySQLEnums.DataTypes.LONGTEXT:
                case MySQLEnums.DataTypes.ENUM:
                    valid = COMPARISON_OPERATORS_TEXT.includes(comparisonOperator);
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
                    valid = COMPARISON_OPERATORS_NUMBERS.includes(comparisonOperator);
                    break;
                case MySQLEnums.DataTypes.BOOLEAN:
                    valid = COMPARISON_OPERATORS_BOOLEAN.includes(comparisonOperator);
                    break;
                default:
                    console.error(`MySQLTools getSearchFilters - datatype not found: ${table.label}.${fieldName}`);
                    break;
            }
        } else {
            console.error(`MySQLTools getSearchFilters - ${table.label}.${fieldName} ${comparisonOperator} not found in schema`);
        }

        return valid;
    }

    static getComparisonOperatorQuery({ comparisonOperator }) {
        let output = '';

        switch( comparisonOperator ) {
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

        return output;
    }

    static getGroupByQuery({ tables, inputs }) {
        let groupBySQL = "";

        let tableRef = tables[inputs.from];
        if( !inputs.hasOwnProperty("tables_joins") ) {
            if( !inputs.hasOwnProperty('count') ) {
                groupBySQL = `GROUP BY \`${tableRef.label}\`.\`${tableRef.primaryKey}\``;
            }
        }
        
        if( inputs.hasOwnProperty('group_by') ) {
            const fieldData = this.extractTableAndField({ inputString: inputs.group_by, tableKey: tableRef.label }); 
            if(fieldData.tableKey !== inputs.from && tables[fieldData.tableKey] ) {
                tableRef = tables[fieldData.tableKey];
            }
            
            if(tableRef.schema.hasOwnProperty(fieldData.fieldName)) {
                groupBySQL = `GROUP BY \`${fieldData.tableKey}\`.\`${fieldData.fieldName}\``;
            }   
        }

        return groupBySQL;
    }

    static getSelectSortQuery({ tables, inputs }) {
        let orderBySQL = ``;

        if( inputs.hasOwnProperty('sort') ) {
            orderBySQL += `ORDER BY `;

            if(inputs["sort"] === "RAND") {
                orderBySQL += `RAND()`;
            } else {
                const sortElements = inputs["sort"].split(",");
                let orderByArray = [];
                let tableRef;
                for(const row of sortElements) {
                    const rowElements = row.split('_');
                    const direction = rowElements[ rowElements.length-1 ];

                    const tableField = rowElements.slice(0, -1).join("_");
                    tableRef = tables[inputs.from];
                    const fieldData = this.extractTableAndField({ inputString: tableField, tableKey: tableRef.label }); 
                    if(fieldData.tableKey !== inputs.from && tables[fieldData.tableKey] ) {
                        tableRef = tables[fieldData.tableKey];
                    }

                    if( tableRef.schema.hasOwnProperty(fieldData.fieldName)
                        && this.isSortDirectionValid({ direction: direction })
                    ) {
                        orderByArray.push(` \`${fieldData.tableKey}\`.\`${fieldData.fieldName}\` ${direction} `);
                    }
                }

                orderBySQL += orderByArray.join(", ");
            }
        }

        return orderBySQL;
    }

    static isSortDirectionValid({ direction = "" }) {
        return direction === "ASC" || direction === "DESC";
    }

    static getSelectSkipQuery({ inputs }) {
        const elementsPerPage = inputs.elementsPerPage ? parseInt(inputs.elementsPerPage) : 20;
        const page = inputs.page ? parseInt(inputs.page) : 0;
        return elementsPerPage * page;
    }

    static getSelectlimitQuery({ inputs }) {
        const elementsPerPage = inputs.elementsPerPage ? parseInt(inputs.elementsPerPage) : 20;
        return elementsPerPage;
    }
}