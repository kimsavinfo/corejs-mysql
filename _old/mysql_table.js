"use strict";

import MySQLEnums from './mysql_enums.js';

export default class MySQLTable {
    static _label = ``;
    static _schema = {
        id: { dataType: MySQLEnums.DataTypes.BIGINT_UNSIGNED, nullable: false, unique: true, autoIncrement: true },
        
        // foreign_id: { dataType: MySQLEnums.DataTypes.BIGINT_UNSIGNED, nullable: false},

        updated: { dataType: MySQLEnums.DataTypes.TIMESTAMP, nullable: false, default: `CURRENT_TIMESTAMP`, onUpdate: `CURRENT_TIMESTAMP` },
        created: { dataType: MySQLEnums.DataTypes.TIMESTAMP, nullable: false, default: `CURRENT_TIMESTAMP` },
        state: { dataType: MySQLEnums.DataTypes.ENUM, values: Object.values(MySQLEnums.States), nullable: false, default: `"${MySQLEnums.States.ACTIVE}"` },
    }
    static _primaryKey = "id";
    static _foreignKeys = [/*"foreign_id*/];

    static get label() { return this._label; }
    static get schema() { return this._schema; }
    static get primaryKey() { return this._primaryKey; }
    static get foreignKeys() { return this._foreignKeys; }
}