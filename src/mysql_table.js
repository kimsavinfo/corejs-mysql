import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import MySQLEnums from './mysql_enums.js';

export default class MySQLTable {
    static _label = ``;
    static _schema = {
        id: { dataType: MySQLEnums.DataTypes.BIGINT_UNSIGNED, nullable: false, unique: true, autoIncrement: true },
        
        // foreign_id: { dataType: MySQLEnums.DataTypes.BIGINT_UNSIGNED, nullable: false, linkedTo: "tableName.foreignKey" },

        updated: { dataType: MySQLEnums.DataTypes.TIMESTAMP, nullable: false, default: `CURRENT_TIMESTAMP`, onUpdate: `CURRENT_TIMESTAMP` },
        created: { dataType: MySQLEnums.DataTypes.TIMESTAMP, nullable: false, default: `CURRENT_TIMESTAMP` },
        state: { dataType: MySQLEnums.DataTypes.ENUM, values: Object.values(MySQLEnums.States), nullable: false, default: `"${MySQLEnums.States.ACTIVE}"` },
    }
    static _primaryKey = "id";

    // #region GETTERS

    static get label() { return this._label; }
    static get schema() { return this._schema; }
    static get primaryKey() { return this._primaryKey; }

    // #endregion GETTERS

    // #region TABLE

    static getCreateTableQuery() { 
        let query = `CREATE TABLE IF NOT EXISTS \`${this._label}\` (`;
        
        let uniqueFields = [];
        for (const [key, settings] of Object.entries(this._schema)) {
            const fieldQuery = this._getCreateTableFieldQuery({ key: key, settings: settings });
            query += `\n\t${fieldQuery},`;

            if( settings.unique ) {
                uniqueFields.push(`${key}`);
            }
        }
        
        query += `\n\tPRIMARY KEY(${this._primaryKey})`;
        for( const unique of uniqueFields ) {
            query += `,\n\tCONSTRAINT UC_${unique} UNIQUE(${unique})`;
        }
        
        query += `\n) CHARACTER SET utf8mb4;`;
        return query;
    }

    static _getCreateTableFieldQuery({ key, settings }) {
        let output = `\`${key}\` ${settings.dataType}`;

        if( settings.dataType === MySQLEnums.DataTypes.VARCHAR ) {
            output += `(${settings.length})`;
        } else if( settings.dataType === MySQLEnums.DataTypes.ENUM ) {
            output += `(`;
            for( const value of settings.values ) {
                output += `"${value}",`;
            }
            output = output.slice(0, -1);
            output += `)`;
        }

        if( settings.hasOwnProperty("nullable") ) {
            if( settings.nullable ) {
                output += ` NULL`;
            } else {
                output += ` NOT NULL`;
            }   
        }
        if( settings.autoIncrement ) {
            output += ` AUTO_INCREMENT`;
        }

        if( settings.hasOwnProperty("default") ) {
            output += ` DEFAULT ${settings.default}`;
        }
        if( settings.hasOwnProperty("onUpdate") ) {
            output += ` ON UPDATE ${settings.onUpdate}`;
        }

        // console.log(key, settings);
        // console.log(field);

        return output;
    }

    /*
        action: ADD or DROP
    */
    static getAlterTableQuery({ action, columnKey, columnSettings={} }) {
        let query = `ALTER TABLE ${this._label}`;

        if( action === "ADD" ) {
            query +=  `\n\t ADD ${this._getCreateTableFieldQuery({ key: columnKey, settings: columnSettings })}`;
        } else if( action === "DROP" ) {
            query += `\n\tDROP ${columnKey}`;
        }

        return query;
    }

    // #endregion TABLE

    // #region ROWS

    static getCreateRowQuery({ inputs={} }) {
        let fields = [];
        let values = [];
        for (const field of Object.keys(inputs)) {
            if( this._schema.hasOwnProperty(field) ) {
                fields.push(`\`${field}\``);
                values.push(`?`);
            }
        }
        let query = `INSERT INTO \`${this._label}\` (${fields.join(",")})`;
        query += `\nVALUES (${values.join(",")})`;

        return query;
    }

    static getValuesToEscapte({ inputs={} }) {
        let valuesToEscape = [];

        for (const [field, value] of Object.entries(inputs)) {
            if( this._schema.hasOwnProperty(field) ) {
                valuesToEscape.push(this._getFormatedValue({ field: field, value: value }));
            }
        }

        return valuesToEscape;
    }

    // #endregion ROWS

    // #region VALIDATOR

    static _getFormatedValue({ field, value }) {
        let output;

        switch( this._schema[field].dataType ) {
            case MySQLEnums.DataTypes.DATETIME:
                if( typeof value === "string" ){
                    output = new Date(value).toISOString().slice(0, 19).replace('T', ' ');
                }

                break;
            default:
                output = value;
                break;
        }

        return output;
    }

    // #endregion VALIDATOR
}