"use strict";

import mysql from "mysql";
import { existsSync, readdirSync, lstatSync } from 'node:fs';

import MySQLTools from "./mysql_tools.js";

export default class MySQLDatabase {
    // #connection = null;
    #pool = null;
    #host = "localhost";
    #port = 3306;
    #database = "";
    #user = "";
    #password = "";
    #waitingSecondsMax = 10;
    #tablesPath = "";
    #tables = { /* tableKey: MySQLTable */ };

    constructor({
        host = "localhost", port = 3306,
        database, user, password, waitingSecondsMax=10,
        tablesPath
    }) { 
        this.#host = host;
        this.#port = port;
        this.#database = database;
        this.#user = user;
        this.#password = password;
        this.#waitingSecondsMax = waitingSecondsMax;
        this.#tablesPath = tablesPath;

        return this;
    }

    async connect() {
        if (!this.#pool) {
            this.#pool = mysql.createPool({
                connectionLimit: 10,
                host: this.#host,
                port: this.#port,
                database: this.#database,
                user: this.#user,
                password: this.#password
            });
        
            // Test connection on pool creation
            this.#pool.getConnection((err, connection) => {
                if (err) {
                    this.#pool = null;
                    console.error('Error connecting to the database:', err);
                    throw new Error('Unable to connect to the database.');
                }
                console.log('POOL - Database connected successfully');
                connection.release();  // Release the initial connection back to the pool
            });
        }
    }

    async loadTables() {
        this.#tables = {};

        const tablesPaths = this.#getFilesPaths({ 
            inputPath: this.#tablesPath, 
            recursive: true, 
            whitelist: ["_table.js"], 
            output: []
        });

        for(const tablePath of tablesPaths) {
            try {
                const table = (await import(tablePath)).default;
                this.#tables[table.label] = table;
                console.log(`${this.constructor.name}: ${table.label} loaded`);
            } catch(error) {
                throw error;
            }
        }
    }

    #getFilesPaths({ inputPath, recursive = true, whitelist = ["*"], output = []  }) {
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

    async query({ inquiry, valuesToEscape = [], debug=false }) {
        await this.connect();

        if(debug) {
            console.log(`=== ${this.constructor.name} INQUIRY ===`);
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

        return new Promise((resolve, reject) => {
            try {
                this.#pool.query(inquiry, valuesToEscape, (errQuery, results) => {
                    if (errQuery) {
                        reject(errQuery);
                    }
                    if(results) {
                        resolve(JSON.parse(JSON.stringify(results)));
                    }
                });
            } catch (errPromise) {
                reject(errPromise);
            }
        });
    }

    async create({ debug=false }) {
        await this.loadTables();

        /* why duplicate foreign key ???
        const resultTables = await this.query({ inquiry: `
            SELECT table_name FROM information_schema.tables WHERE table_schema = '${this.#database}';
        `, 
        debug: debug });
        let databaseTables = [];
        for( const row of resultTables ) {
            databaseTables.push(row.table_name);
        }

        for( const tableKey of Object.keys(this.#tables) ) {
            if( !databaseTables.includes(tableKey) ) {
                await this.#createTable({ tableKey: tableKey, debug: debug });
            }
        }
        for( const tableKey of Object.keys(this.#tables) ) {
            if( !databaseTables.includes(tableKey) ) {
                await this.#createTableForeignKeys({ tableKey: tableKey, debug: debug });
            }
        }
        */

        // const tablesDb = await this.query({ inquiry: `SHOW TABLES;`, debug: debug });
        // if(tablesDb.length === 0) {
        //     for( const tableKey of Object.keys(this.#tables) ) {
        //         await this.#createTable({ tableKey: tableKey, debug: debug });
        //     }
        // }

        // const constraintsDb = await this.query({ inquiry: `
        //     SELECT *
        //     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        //     WHERE CONSTRAINT_SCHEMA = '${this.#database}'
        //     AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        // `, debug: debug });
        // if(constraintsDb.length === 0) {
        //     for( const tableKey of Object.keys(this.#tables) ) {
        //         await this.#createTableForeignKeys({ tableKey: tableKey, debug: debug });
        //     }
        // }        
    }

    async #createTable({ tableKey, debug=false }) {
        const table = this.#tables[tableKey];
        if( table ) {
            let query = `CREATE TABLE IF NOT EXISTS \`${table.label}\` (`;

            let uniqueFields = [];
            for (const [key, settings] of Object.entries(table.schema)) {
                const field = MySQLTools.getCreateFieldQuery({ key: key, settings: settings });
                query += `${field},`;
    
                if( settings.unique ) {
                    uniqueFields.push(`${key}`);
                }
            }
    
            query += `\n\tPRIMARY KEY(${table.primaryKey})`;
            for( const unique of uniqueFields ) {
                query += `,\n\tCONSTRAINT UC_${unique} UNIQUE(${unique})`;
            }
    
            query += `\n) CHARACTER SET utf8mb4;`;
    
            try {
                await this.query({ inquiry: query, debug: debug });
                console.log(`${this.constructor.name} table created if not exists.`);
            } catch(error) {
                console.error(`${this.constructor.name} CREATE TABLE`, error);
                throw error;
            }
        } else {
            console.error(`${this.constructor.name} CREATE TABLE: ${tableKey} not found.`);
        }        
    }

    async #createTableForeignKeys({ tableKey, debug=false }) {
        const tableStart = this.#tables[tableKey];
        if( tableStart ) {

            for( const fk of tableStart.foreignKeys ) {
                const elements = fk.split('_');
                const fieldToLink = elements.pop();
                const tableToLink = elements.join('_');

                if( this.#tables[tableToLink] 
                    && this.#tables[tableToLink].schema.hasOwnProperty(fieldToLink) 
                ) {
                    const fkName = `FK_${tableStart.label}_${tableToLink}_${fieldToLink}`;
                    const query = `ALTER TABLE ${tableStart.label} 
                    ADD CONSTRAINT ${fkName}
                    FOREIGN KEY (${fk}) 
                    REFERENCES ${tableToLink}(${fieldToLink}); \n`;

                    try {
                        await this.query({ inquiry: query, debug: debug });
                        console.log(`${this.constructor.name} ${fkName} created if not exists.`);
                    } catch(error) {
                        console.error(`${this.constructor.name} CREATE FOREIGN KEY ${fkName}`, error);
                        throw error;
                    }
                } else {
                    console.log(`${this.constructor.name}: ${tableToLink}.${fieldToLink} not found.`);
                }                
            }

        } else {
            console.error(`${this.constructor.name} CREATE FOREIGN KEY: ${tableKey} not found.`);
        }
    }

    async createRow({ tableKey, inputs, debug=false }) {
        let output = { id: -1 };

        if( Object.keys(this.#tables).length === 0 ) {
            await this.loadTables();
        }

        const table = this.#tables[tableKey];
        if( table ) {
            try {
                let fieldsString = "";
                let valuesString = "";
                let valuesToEscape = [];
                for (const [field, value] of Object.entries(inputs)) {
                    if( table.schema.hasOwnProperty(field) ) {
                        fieldsString += `\`${field}\`,`;
                        valuesString += `?,`;
                        
                        valuesToEscape.push(MySQLTools.getFormatedValue({ schema: table.schema, field: field, value: value }));
                    }
                }
                if( fieldsString.length > 0 ) {
                    fieldsString = fieldsString.slice(0, -1);
                    valuesString = valuesString.slice(0, -1);
                }

                let query = `INSERT INTO \`${table.label}\` (${fieldsString})`;
                query += `\nVALUES (${valuesString})`;
    
            
                const response = await this.query({ inquiry: query, valuesToEscape: valuesToEscape, debug: debug });
                output.id = response.insertId;
                if(debug) {
                    console.log(`${this.constructor.name} CREATE ${response.insertId}`);
                }
            } catch(error) {
                console.error(`${this.constructor.name} CREATE`, inputs, error);
                output = { error: error.sqlMessage };
            }
        } else {
            console.error(`${this.constructor.name} CREATE ROW: ${tableKey} not found.`);
        }

        return output;
    }

    async list({ inputs, debug=false }) {
        let output;
        if( inputs.hasOwnProperty("count") ) {
            output = -1;
        } else {
            output = [];
        }

        if( Object.keys(this.#tables).length === 0 ) {
            await this.loadTables();
        }

        if( inputs.from && this.#tables[inputs.from] ) {
            try {
                const selectSQL = MySQLTools.getSelectFieldsQuery({ tables: this.#tables, inputs: inputs });
                const fromSQL = `FROM \`${this.#tables[inputs.from].label}\``;
                const joinsSQL = MySQLTools.getJoinsQuery({ tables: this.#tables, inputs: inputs });
                const {whereSQL, valuesToEscape} = MySQLTools.getSelectWhereQuery({ tables: this.#tables, inputs: inputs });

                let fullQuery = `${selectSQL}\n${fromSQL}`;
                if(joinsSQL.length > 0) {
                    fullQuery += `\n${joinsSQL}`;
                }
                fullQuery += `\n${whereSQL}`;

                const groupBySQL = MySQLTools.getGroupByQuery({ tables: this.#tables, inputs: inputs });
                if(groupBySQL.length > 0) { fullQuery += `\n${groupBySQL}`; }
                // console.log("groupBySQL", groupBySQL);

                const orderBySQL = MySQLTools.getSelectSortQuery({ tables: this.#tables, inputs: inputs });
                if(orderBySQL.length > 0) { fullQuery += `\n${orderBySQL}`; }
                // console.log("grouporderBySQLBySQL", orderBySQL);

                if( !inputs.hasOwnProperty("count") ) {
                    const skip = MySQLTools.getSelectSkipQuery({ inputs: inputs });
                    const limit = MySQLTools.getSelectlimitQuery({ inputs: inputs });
                    fullQuery += `\nLIMIT ${skip}, ${limit}`; // LIMIT 0, 20;
                    // console.log(skip, limit);
                }

                const result = await this.query({ inquiry: fullQuery, valuesToEscape: valuesToEscape, debug: debug });
                if( inputs.hasOwnProperty("count") && result.length === 1 && Object.keys(result[0]).length === 1 ) {
                    output = result[0].count;
                } else {
                    output = result;
                }
            } catch(error) {
                console.error(`${this.constructor.name} LIST`, inputs, error);
                output = { error: error.sqlMessage };
            }
        }
        

        return output;
    }

    async updateRow({ inputs, whereInputs={}, debug=false }) {
        let output = {};

        if( Object.keys(this.#tables).length === 0 ) {
            await this.loadTables();
        }

        const table = this.#tables[whereInputs.from];
        if( table ) {
            try {
                let valuesToEscape = [];
                let query = `UPDATE ${table.label}\nSET`;
                for (const [field, value] of Object.entries(inputs)) {
                    if( table.schema.hasOwnProperty(field) && field !== table.primaryKey ) {
                        query += ` \`${field}\` = ? ,`;

                        valuesToEscape.push(MySQLTools.getFormatedValue({ schema: table.schema, field: field, value: value }));
                    }
                }
                query = query.slice(0, -1);

                const whereQuery = MySQLTools.getSelectWhereQuery({ tables: this.#tables, inputs: whereInputs });
                query += `\n${whereQuery.whereSQL}`;
                valuesToEscape.push(...whereQuery.valuesToEscape);

                // console.log(`MySQLDAO UPDATE QUERY ${table.NAME}`, query, valuesToEscape);
                if(whereQuery.valuesToEscape.length > 0) {
                    output = await this.query({ inquiry: query, valuesToEscape: valuesToEscape, debug: debug });
                }
            } catch(e) {
                console.error(`MySQLDAO UPDATE ${table.label}`, inputs, whereInputs, e);
                output = { error: e.sqlMessage };
            }
        } else {
            console.error(`${this.constructor.name} UPDATE ROW: ${inputs.from} not found.`);
        }

        return output;
    }

    async upsertRow({ inputs, whereInputs = {}, debug=false }) {
        let output = {};

        if( Object.keys(this.#tables).length === 0 ) {
            await this.loadTables();
        }

        const table = this.#tables[whereInputs.from];
        if( table ) {
            try {
                const rows = await this.list({ tableKey: whereInputs.from, inputs: whereInputs, debug: debug });
                if( !rows.hasOwnProperty("error") ) {
                    
                    if( rows.length === 0 ) {
                        output = await this.createRow({ tableKey: whereInputs.from, inputs: inputs, debug: debug });
                        // console.log(`${this.constructor.name} UPSERT>Create ${table.NAME} ${output.insertId} ${whereInputs[`and_${table.PRIMARY_KEY}_like`]}`);
                    } else {
                        let updateInputs = {...inputs};
                        updateInputs.from = whereInputs.from;
                        delete updateInputs[table.primaryKey];

                        await this.updateRow({ inputs: updateInputs, whereInputs: whereInputs, debug: debug });

                        output = { [`${table.primaryKey}`]: rows[0][table.primaryKey] };
                    }

                } else {
                    output = rows;
                }
            } catch(e) {
                console.error(`${this.constructor.name} UPSERT ${table.label}`, inputs, e);
                output = { error: e.sqlMessage };
            }
        } else {
            console.error(`${this.constructor.name} UPSERT ROW: ${inputs.from} not found.`);
        }

        return output;
    }

    async deleteRow({ whereInputs = {}, debug=false }) {
        let output = {};

        if( Object.keys(this.#tables).length === 0 ) {
            await this.loadTables();
        }

        const table = this.#tables[whereInputs.from];
        if( table ) {
            try {
                let valuesToEscape = [];
                let query = `DELETE FROM ${table.label}\n`;

                const whereQuery = MySQLTools.getSelectWhereQuery({ tables: this.#tables, inputs: whereInputs });
                query += `\n${whereQuery.whereSQL}`;
                valuesToEscape.push(...whereQuery.valuesToEscape);

                // console.log(`${this.constructor.name} DELETE QUERY ${table.label}`, query, valuesToEscape);
                if(whereQuery.valuesToEscape.length > 0) {
                    output = await this.query({ inquiry: query, valuesToEscape: valuesToEscape, debug: debug });
                }
            } catch(e) {
                console.error(`${this.constructor.name} DELETE ${table.label}`, whereInputs, e);
                output = { error: e.sqlMessage };
            }
        } else {
            console.error(`${this.constructor.name} UPSERT ROW: ${inputs.from} not found.`);
        }

        return output;
    }

    // logState() {
    //     if(this.#connection === null) {
    //         console.error(`${this.constructor.name} - not initialised, please call the constructor`);
    //     } else {
    //         console.log(`${this.constructor.name} - state: ${this.#connection.state}`);
    //     }
    // }
}