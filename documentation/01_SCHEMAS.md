# SCHEMAS

## merchant

### Schema 

```
{
    "id": {
        "dataType": "BIGINT UNSIGNED",
        "nullable": false,
        "unique": true,
        "autoIncrement": true
    },
    "name": {
        "dataType": "VARCHAR",
        "length": 255,
        "nullable": false,
        "unique": true
    },
    "updated": {
        "dataType": "BIGINT UNSIGNED",
        "nullable": false,
        "default": "(UNIX_TIMESTAMP())",
        "onUpdate": "(UNIX_TIMESTAMP())"
    },
    "created": {
        "dataType": "BIGINT UNSIGNED",
        "nullable": false,
        "default": "(UNIX_TIMESTAMP())"
    },
    "state": {
        "dataType": "ENUM",
        "values": [
            "active",
            "archived",
            "deleted"
        ],
        "nullable": false,
        "default": "\"active\""
    }
}

```
Primary key: id 

## product

### Schema 

```
{
    "id": {
        "dataType": "BIGINT UNSIGNED",
        "nullable": false,
        "unique": true,
        "autoIncrement": true
    },
    "label": {
        "dataType": "VARCHAR",
        "length": 255,
        "nullable": false,
        "unique": true
    },
    "description": {
        "dataType": "TEXT",
        "nullable": true
    },
    "price": {
        "dataType": "DOUBLE",
        "default": 0.01
    },
    "merchant_id": {
        "dataType": "BIGINT UNSIGNED",
        "nullable": false,
        "linkTo": "merchant.id"
    },
    "updated": {
        "dataType": "BIGINT UNSIGNED",
        "nullable": false,
        "default": "(UNIX_TIMESTAMP())",
        "onUpdate": "(UNIX_TIMESTAMP())"
    },
    "created": {
        "dataType": "BIGINT UNSIGNED",
        "nullable": false,
        "default": "(UNIX_TIMESTAMP())"
    },
    "state": {
        "dataType": "ENUM",
        "values": [
            "active",
            "archived",
            "deleted"
        ],
        "nullable": false,
        "default": "\"active\""
    }
}

```
Primary key: id 

