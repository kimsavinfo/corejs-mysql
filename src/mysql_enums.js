export default class MySQLEnums {
    //  Name                                                Storage (Bytes)     Minimum Value    	Maximum Value
    static DataTypes = {
        TINYINT:                "TINYINT",                  // 1                -128                127
        SMALLINT:               "SMALLINT",                 // 2                -32768              32767
        MEDIUMINT:              "MEDIUMINT",                // 3                -8388608            8388607
        INT:                    "INT",                      // 4                -2147483648         2147483647
        BIGINT:                 "BIGINT",                   // 8                -2^63               2^63-1
        TINYINT_UNSIGNED:       "TINYINT UNSIGNED",         // 1                0                   255
        SMALLINT_UNSIGNED:      "SMALLINT UNSIGNED",        // 2                0                   65535
        MEDIUMINT_UNSIGNED:     "MEDIUMINT UNSIGNED",       // 3                0                   16777215
        INT_UNSIGNED:           "INT UNSIGNED",             // 4                0                   4294967295
        BIGINT_UNSIGNED:        "BIGINT UNSIGNED",          // 8                0                   2^64-1
        DOUBLE:                 "DOUBLE",
        TIMESTAMP:              "TIMESTAMP",
        // DATETIME:               "DATETIME",
        ENUM:                   "ENUM",
        VARCHAR:                "VARCHAR",
        TEXT:                   "TEXT",
        MEDIUMTEXT:             "MEDIUMTEXT",
        LONGTEXT:               "LONGTEXT",
        BOOLEAN:                "BOOLEAN"
    };
    static Numerics = [
        this.DataTypes.TINYINT,
        this.DataTypes.SMALLINT,
        this.DataTypes.MEDIUMINT,
        this.DataTypes.INT,
        this.DataTypes.BIGINT,
        this.DataTypes.TINYINT_UNSIGNED,
        this.DataTypes.SMALLINT_UNSIGNED,
        this.DataTypes.MEDIUMINT_UNSIGNED,
        this.DataTypes.INT_UNSIGNED,
        this.DataTypes.BIGINT_UNSIGNED,
        this.DataTypes.DOUBLE,
        this.DataTypes.BOOLEAN,
    ];
    static Texts = [
        this.DataTypes.VARCHAR,
        this.DataTypes.TEXT,
        this.DataTypes.MEDIUMTEXT,
        this.DataTypes.LONGTEXT,
    ];

    static States = {
        ACTIVE: "active",
        ARCHIVED: "archived",
        DELETED: "deleted"
    };
    
    static DEFAULT_SUCCESS_MESSAGE = "Operation completed successfully!";
    static DEFAULT_ERROR_MESSAGE = "Sorry, something went wrong. Please contact the admins.";
    static DEFAULT_TOKEN_EXPIRED_MESSAGE = "Token has expired.";
    static DEFAULT_UNAUTHORISED_MESSAGE = "You are unauthorised to do this.";
    static DEFAULT_MISSING_FIELDS = "Some fields are missing. Please check the documentation.";

    static WHERE_KEYS_BLACKLIST = [
        "sort",
        "elements_per_page",
        "page",
        "from",
        "to",
        "count",
        "distinct",
        "fields_to_retrieve",
        "tables_joins",
        "group_by",
    ];
    static LOGICAL_OPERATORS = [
        "and",
        "or", // ex: or_label_like: '%lorem%#%ipsum%'
    ];
    static COMPARISON_OPERATORS_TEXT = [
        "like",
        "nlike",
        // "eq",
        // "ne",
        "in", // ex: and_label_in: 'lorem,ipsum'
        "nin"
    ];
    static COMPARISON_OPERATORS_NUMBERS = [
        "eq",
        "gt",
        "gte",
        "lt",
        "lte",
        "ne",
        "in",
        "nin"
    ];
    static COMPARISON_OPERATORS_BOOLEAN = [
        "eq",
        "ne"
    ];
    static SORT_DIRECTIONS = [
        "ASC",
        "DESC"
    ]
}