import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
import mysql from "mysql2/promise";

import MySQLTools from "./mysql_tools.js";
import MySQLEnums from "./mysql_enums.js";

export default class MySQLDatabase {
    static instance;
    static #tablesPath = `${process.cwd()}`;
    static #tables = {};

    constructor() {
        if (!MySQLDatabase.instance) {
            this.pool = mysql.createPool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                database: process.env.DB_DATABASE,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            MySQLDatabase.instance = this;
            Object.freeze(MySQLDatabase.instance); // Freeze the singleton instance
        }
        return MySQLDatabase.instance;
    }

    static getInstance() {
        if (!MySQLDatabase.instance) {
            new MySQLDatabase();
        }
        return MySQLDatabase.instance;
    }

    static setInputPath({ inputPath }) {
        this.#tablesPath = inputPath;
    }

    // #region QUERY

    static async query({ inquiry, valuesToEscape=[], debug=(process.env.DB_DEBUG==="TRUE") }) {
        if(debug) {
            this.#logQuery({ inquiry: inquiry, valuesToEscape: valuesToEscape })
        }

        let output = null;
        try {
            const instance = MySQLDatabase.getInstance();
            const result = await instance.pool.query(inquiry, valuesToEscape);
            output = JSON.parse(JSON.stringify(result));
        } catch (error) {
            console.error('DATABASE INQUIRY error:', error);
        }

        return output;
    }

    static #logQuery({ inquiry, valuesToEscape=[] }) {
        console.log(`=== DATABASE INQUIRY ===`);

        let inquiryElements = inquiry.split("?");
        let logInquiry = "";
        const valuesToEscapeLength = valuesToEscape.length;
        for(let iElement = 0; iElement < inquiryElements.length; ++iElement) {
            logInquiry += `${inquiryElements[iElement]} `;
            if(iElement < valuesToEscapeLength) {
                if(typeof valuesToEscape[iElement] === "string") {
                    logInquiry += `"${valuesToEscape[iElement]}"`;
                } else {
                    logInquiry += valuesToEscape[iElement];
                }
            }
        }

        console.log(new Date(), logInquiry);
    }

    // #endregion QUERY

    // #region CLEAR

    static async clear() {
        await this.clearForeignKeys();
        await this.clearTables();
    }

    static async clearForeignKeys() {
        const result = await this.query({ inquiry: 
            `SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_TYPE = 'FOREIGN KEY';` 
        });
        for( const row of result[0] ) {
            await this.query({ inquiry:
                `ALTER TABLE ${row.TABLE_NAME} DROP FOREIGN KEY ${row.CONSTRAINT_NAME};`
            });
        }
    }

    static async clearTables() {
        const result = await this.query({ inquiry: 
            `SELECT table_name FROM information_schema.tables 
            WHERE table_schema = '${process.env.DB_DATABASE}';` 
        });
        for( const row of result[0] ) {
            await this.query({ inquiry: `DROP TABLE IF EXISTS ${process.env.DB_DATABASE}.${row.table_name};`});
        }
    }

    // #endregion CLEAR

    // #region TABLES

    static async upsertTable({ table }) {
        const result = await this.query({ inquiry: 
            `SELECT * 
            FROM information_schema.tables
            WHERE table_schema = '${process.env.DB_DATABASE}' 
                AND table_name = '${table.label}'
            LIMIT 1;` 
        });
        
        if( result[0].length === 0 ) {
            await this.query({ inquiry: table.getCreateTableQuery() });
        } else {
            const fields = await this.query({ inquiry: 
                `SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = '${process.env.DB_DATABASE}'
                AND TABLE_NAME = '${table.label}';` 
            });

            let toAdd = {};
            for( const key of Object.keys(table.schema) ) {
                let found = false;
                for(const field of fields[0]) {
                    if(field.COLUMN_NAME === key) {
                        found = true;
                        break
                    }
                }
    
                if(!found) {
                    toAdd[key] = table.schema[key];
                }
            }
            for( const [key, seetings] of Object.entries(toAdd) ) {
                await this.query({ inquiry: 
                    table.getAlterTableQuery({ action: "ADD", columnKey: key, columnSettings: seetings })
                });
            }

            let toDelete = [];
            for(const field of fields[0]) {
                let found = false;
                for( const key of Object.keys(table.schema) ) {
                    if(field.COLUMN_NAME === key) {
                        found = true;
                        break
                    }
                }
    
                if(!found) {
                    toDelete.push(field.COLUMN_NAME);
                }
            }
            for( const key of toDelete ) {
                await this.query({ inquiry: 
                    table.getAlterTableQuery({ action: "DROP", columnKey: key })
                });
            }
        }
    }

    // #endregion TABLES

    // #region ROWS CRUD

    static async createRow({ table, inputs, debug=(process.env.DB_DEBUG==="TRUE") }) {
        let output = { [table.primaryKey]: null };

        await this.loadTables({ lazy:true });
        try {
            const query = table.getCreateRowQuery({ inputs: inputs });
            const valuesToEscape = table.getValuesToEscapte({ inputs: inputs });
            const response = await this.query({ inquiry: query, valuesToEscape: valuesToEscape, debug: debug });
            output[table.primaryKey] = response[0].insertId;
            if(debug) {
                console.log(`DATABASE ${table.label} ROW CREATED: ${response[0].insertId}`);
            }
        } catch(error) {
            console.error(`DATABASE CREATE ${table.label} ROW`, inputs, error);
            output = { error: error.sqlMessage };
        }

        return output;
    }






    static async listRows({ inputs, debug=(process.env.DB_DEBUG==="TRUE") }) {
        let output = [];

        await this.loadTables({ lazy:true });
        if( inputs.from && this.#tables.hasOwnProperty(inputs.from) ) {
            try {
                let query = "";
                let valuesToEscape = [];

                const selectElements = MySQLTools.getSelectElements({ defaultTableKey: inputs.from, tables: this.#tables, inputs: inputs });
                query += selectElements.lines.join("\n");
                valuesToEscape.push(...selectElements.valuesToEscape);

                query += `\n${MySQLTools.getFromString({ defaultTableKey: inputs.from, tables: this.#tables })}`;

                if( inputs.hasOwnProperty("tables_joins") ) {
                    const joinsLines = MySQLTools.getJoinsLines({ 
                        defaultTableKey: inputs.from, tables: this.#tables, 
                        inputString: inputs["tables_joins"]
                    });
                    query += `\n${joinsLines.join("\n")}`;
                }

                let whereString = "";
                let whereElements;
                for (const [inputKey, inputValue] of Object.entries(inputs)) {
                    if( !MySQLEnums.WHERE_KEYS_BLACKLIST.includes(inputKey) ) {
                        whereElements = MySQLTools.getWhereElements({ defaultTableKey: inputs.from, tables: this.#tables, 
                            inputString: inputKey,
                            inputValue: inputValue
                        });

                        const isFirstCondition = whereString.length === 0;
                        if( isFirstCondition ) {
                            whereString = "WHERE";
                        }
                        whereString += `\n\t`;
                        if(!isFirstCondition) {
                            whereString += ` ${whereElements.logicalOperator}`;
                        }
                        whereString += ` \`${whereElements.table}\`.\`${whereElements.field}\` ${whereElements.comparisonOperator} ? `
                        valuesToEscape.push(whereElements.valueToEscape);
                    }
                }
                query += `\n${whereString}`;
                
                // let sortQuery = "";
                // let groupQuery = "";
                // let skipQuery = 0;
                // let limitQuery = 20;

                const result = await MySQLDatabase.query({ inquiry: query, valuesToEscape: valuesToEscape, debug: debug })
                output = result[0];

            } catch(error) {
                console.error(`DATABASE LIST ROWS`, inputs, error);
                output = [{ error: error.sqlMessage }];
            }
        }

        return output;
    }

    static async loadTables({ lazy=true }) {
        if(!lazy) {
            this.#tables = {};
        }

        if( Object.keys(this.#tables).length === 0 ) {
            const tablesFilesPaths = MySQLTools.getTablesFilesPaths({ inputPath: this.#tablesPath });
            for(const tableFilePath of tablesFilesPaths) {
                try {
                    const table = (await import(tableFilePath)).default;
                    if( table.label?.length > 0 ) {
                        this.#tables[table.label] = table;
                        console.log(`DATABASE TABLE ${table.label} loaded`);
                    }

                } catch(error) {
                    console.error(`DATABASE LOAD TABLE ${table.label}`, error);
                }
            }
        }
    }

    // #endregion ROWS CRUD
}