import MySQLEnums from "../../src/mysql_enums.js";
import MySQLTable from "../../src/mysql_table.js";

export default class MerchantTable extends MySQLTable {
    static _label = `merchant`;

    static _schema = {
        id:                     { dataType: MySQLEnums.DataTypes.BIGINT_UNSIGNED, nullable: false, unique: true, autoIncrement: true },

        name:                   { dataType: MySQLEnums.DataTypes.VARCHAR, length: 255, nullable: false, unique: true },
        
        updated:                { dataType: MySQLEnums.DataTypes.UNIX_TIMESTAMP, nullable: false, default: `(UNIX_TIMESTAMP())`, onUpdate: `(UNIX_TIMESTAMP())` },
        created:                { dataType: MySQLEnums.DataTypes.UNIX_TIMESTAMP, nullable: false, default: `(UNIX_TIMESTAMP())` },
        state:                  { dataType: MySQLEnums.DataTypes.ENUM, values: Object.values(MySQLEnums.States), nullable: false, default: `"${MySQLEnums.States.ACTIVE}"` },
    }
    
    static _primaryKey = "id";
}