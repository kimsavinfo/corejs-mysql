# TABLES

## General

Each "_table.js" file serves as a model representation of a corresponding table in the database. These files are critical for maintaining consistency between the database schema and the application logic. Below are the core components of a typical "_table.js" file:

### Label

The label property is a string that represents the exact name of the table in the database. This ensures clear mapping and facilitates direct reference to the database table from the application code.

### Schema

The schema is an object that defines the structure of the data in the table. Each key in the schema corresponds to a column name in the table, and its value specifies the data type or validation rules for that column.

### Primary Key

The primaryKey property identifies the column in the schema that serves as the primary key for the table. This field uniquely identifies each record in the table.

### Example

```
export default class MySQLEnums {
    static States = {
        ACTIVE: "active",
        ARCHIVED: "archived",
        DELETED: "deleted"
    };
}

======================================================


import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import MySQLEnums from './mysql_enums.js';

export default class MySQLTable {
    static _label = ``;
    static _schema = {
        id: { dataType: MySQLEnums.DataTypes.BIGINT_UNSIGNED, nullable: false, unique: true, autoIncrement: true },
        
        // foreign_id: { dataType: MySQLEnums.DataTypes.BIGINT_UNSIGNED, nullable: false, linkTo: "tableName.foreignKey" },

        updated: { dataType: MySQLEnums.DataTypes.UNIX_TIMESTAMP, nullable: false, default: `(UNIX_TIMESTAMP())`, onUpdate: `(UNIX_TIMESTAMP())` },
        created: { dataType: MySQLEnums.DataTypes.UNIX_TIMESTAMP, nullable: false, default: `(UNIX_TIMESTAMP())` },
        state: { dataType: MySQLEnums.DataTypes.ENUM, values: Object.values(MySQLEnums.States), nullable: false, default: `"${MySQLEnums.States.ACTIVE}"` },
    }
    static _primaryKey = "id";

    // #region GETTERS

    static get label() { return this._label; }
    static get schema() { return this._schema; }
    static get primaryKey() { return this._primaryKey; }

    // #endregion GETTERS
}


======================================================


"use strict";

import MySQLEnums from "../../src/mysql_enums.js";
import MySQLTable from "../../src/mysql_table.js";

export default class ProductTable extends MySQLTable {
    static _label = `product`;

    static _schema = {
        id:                     { dataType: MySQLEnums.DataTypes.BIGINT_UNSIGNED, nullable: false, unique: true, autoIncrement: true },

        label:                  { dataType: MySQLEnums.DataTypes.VARCHAR, length: 255, nullable: false, unique: true },
        description:            { dataType: MySQLEnums.DataTypes.TEXT, nullable: true },
        price:                  { dataType: MySQLEnums.DataTypes.DOUBLE, default: 0.01 },

        merchant_id:            { dataType: MySQLEnums.DataTypes.BIGINT_UNSIGNED, nullable: false, linkTo: "merchant.id" },
        
        updated:                { dataType: MySQLEnums.DataTypes.UNIX_TIMESTAMP, nullable: false, default: `(UNIX_TIMESTAMP())`, onUpdate: `(UNIX_TIMESTAMP())` },
        created:                { dataType: MySQLEnums.DataTypes.UNIX_TIMESTAMP, nullable: false, default: `(UNIX_TIMESTAMP())` },
        state:                  { dataType: MySQLEnums.DataTypes.ENUM, values: Object.values(MySQLEnums.States), nullable: false, default: `"${MySQLEnums.States.ACTIVE}"` },
    }
    
    static _primaryKey = "id";
}
```

## Query system

### List: theory

The listRows({ inputs }) function in the MySQLDatabase Singleton class is a versatile tool for retrieving rows from a database table based on the provided inputs parameters. 

If no additional parameters are provided, the function:
- Retrieves the first 20 rows from the specified table.
- Orders the rows by the table's primary key in ascending (ASC) order.

The minimal request is:
```
const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label
} });

console.log(rows) // This retrieves the first 20 rows from the "product" table, ordered by the primary key in ascending order.
```

The function is highly customisable while maintaining a straightforward default behaviour, ensuring ease of use for developers. It is designed for seamless integration with APIs and supports manipulation of strings and numbers only.

By adhering to these guidelines, developers can efficiently query the database while maintaining consistency and avoiding unnecessary complexity.

### List: examples

#### Pagination and Sort

```
const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    elements_per_page: 10,
    page: 0,
} });
// This retrieves the first 0 to 10 rows from the "product" table, ordered by the primary key in ascending order.

const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    elements_per_page: 50,
    page: 2,
    sort: "price_ASC"
} });
// This retrieves the first 100 to 50 rows from the "product" table, ordered by the price in ascending order.

const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    elements_per_page: 50,
    page: 2,
    sort: "price_DESC"
} });
// This retrieves the first 100 to 50 rows from the "product" table, ordered by the price in descending order.
```

#### Count

```
const count = await MySQLDatabase.countRows({ inputs: {
    from: ProductTable.label,
    count: ProductTable.primaryKey
} })
// This return the total number of rows in the "product" table

const count = await MySQLDatabase.countRows({ inputs: {
    from: ProductTable.label,
    count: ProductTable.primaryKey,
    and_price_lte: 100
} })
// This return the number of rows in the "product" table with their price less than and equals to 100

const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    count: ProductTable.primaryKey,
    fields_to_retrieve: "state",
    group_by: "state"
} })
// This return the number of rows in the "product" table by state
```

#### Filter and In

```
const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    and_label_like: "%lorem%"
} });
// This retrieves the rows from the "product" table with the keyword "lorem" in its label :
rows = [
    { id: 1, label: "Lorem", ... },
    { id: 13, label: "Ipsum lorem", ... },
    ...
]


const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    and_label_like: "%lorem%",
    and_price_gt: 50
} });
// This retrieves the rows from the "product" table with the keywords "lorem" in its label AND a price above 50.

const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    or_label_like: "%lorem%",
    or_price_lt: 50
} });
// This retrieves the rows from the "product" table with the keywords "lorem" in its label OR a price under 50.

const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    and_label_in: "%lorem%,%ipsum%"
} });
// This retrieves the rows from the "product" table with the keywords "lorem" and "ipsum"
```

#### Fields to retrieve

```
const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    fields_to_retrieve: `id,${ProductTable.label}.label`
} });
// This retrieves the rows from the "product" table with only the fields id and label :
rows = [
    { product.id: 1, product.label: "Lorem" },
    { product.id: 2, product.label: "Ipsum" },
    ...
]
```

#### Distinct

```
const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    distinct: "state",
    elements_per_page: Number.MAX_SAFE_INTEGER,
    sort: "state_ASC"
} })
// This list all the distinct states present in "product" table by alphabetic order.
```

#### Inner join

```
const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    tables_joins: `${ProductTable.label}.merchant_id-${MerchantTable.label}.${MerchantTable.primaryKey}`,
} });
// This list the rows from "product" table with the "merchant" data

const rows = await MySQLDatabase.listRows({ inputs: {
    from: ProductTable.label,
    tables_joins: `${ProductTable.label}.merchant_id-${MerchantTable.label}.${MerchantTable.primaryKey}`,
    and_price_lt: 50,
    sort: "price_ASC",
    fields_to_retrieve: `${ProductTable.label}.id,${ProductTable.label}.label,${MerchantTable.label}.name`
} });
// This list the rows from "product" and "merchant" tables, with a price bellow 50 and from the lowest to hight price. Only the id and label fields with merchant name are retrieved.
```

## Available tags

### Schema

| DataTypes | SQL equivalent |
| :-: | :-: |
| TINYINT | TINYINT |
| SMALLINT | SMALLINT |
| MEDIUMINT | MEDIUMINT |
| INT | INT |
| BIGINT | BIGINT |
| TINYINT_UNSIGNED | TINYINT UNSIGNED |
| SMALLINT_UNSIGNED | SMALLINT UNSIGNED |
| MEDIUMINT_UNSIGNED | MEDIUMINT UNSIGNED |
| INT_UNSIGNED | INT UNSIGNED |
| BIGINT_UNSIGNED | BIGINT UNSIGNED |
| DOUBLE | DOUBLE |
| UNIX_TIMESTAMP | BIGINT UNSIGNED |
| ENUM | ENUM |
| VARCHAR | VARCHAR |
| TEXT | TEXT |
| MEDIUMTEXT | MEDIUMTEXT |
| LONGTEXT | LONGTEXT |
| BOOLEAN | BOOLEAN |
 
### Select / List

### Where

| Logical operators |
| :-: |
| and |
| or |

| Comparison operators | Data type |
| :-: | :-: |
| like | text |
| nlike | text |
| in | text, number |
| nin | text, number |
| eq | number, boolean |
| ne | number, boolean |
| gt | number |
| gte | number |
| lt | number |
| lte | number |