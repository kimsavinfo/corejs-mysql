import fs from "node:fs";
import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

export default class MySQLLogger {
    static instance;
    static #outputDirPath = `${process.cwd()}${process.env.DB_LOGS_DIR_PATH_RELATIVE}`;
    static #maxFileSize = parseInt(process.env.DB_LOGS_MAX_SIZE_BYTES);
    static #rootName = this.#getRootName();
    static #fileIndex = 0;

    static #getRootName() {
        const today   = new Date();
        const year    = today.getUTCFullYear();
        const month   = (today.getUTCMonth() + 1).toString().padStart(2,"0");
        const day     = (today.getUTCDate()).toString().padStart(2,"0");
        return `${year}${month}${day}_mysql`;
    }

    static #getDate() {
        const now           = new Date();
        const year          = now.getUTCFullYear();
        const month         = (now.getUTCMonth() + 1).toString().padStart(2,"0");
        const day           = (now.getUTCDate()).toString().padStart(2,"0");
        const hours         = (now.getUTCHours()).toString().padStart(2,"0");
        const seconds       = (now.getUTCSeconds()).toString().padStart(2,"0");
        const milliseconds  = (now.getMilliseconds()).toString().padStart(3,"0");
        return `${year}${month}${day} ${hours}:${seconds}:${milliseconds}`;
    }

    static write({ text }) {
        fs.mkdirSync(this.#outputDirPath, { recursive: true });
        let filePath = `${this.#outputDirPath}`;

        const rootName = this.#getRootName();
        if(rootName != this.#rootName) {
            this.#rootName = rootName;
            this.#fileIndex = 0;
        }
        filePath += `/${rootName}`;

        let pathToTest = `${filePath}_${this.#fileIndex}.log`;
        if( fs.existsSync( pathToTest ) ) {
            const stats = fs.statSync(pathToTest);
            if(stats.size > this.#maxFileSize) {
                ++this.#fileIndex;
            }
        }
        filePath += `_${this.#fileIndex}.log`;

        fs.appendFileSync( filePath, `${this.#getDate()}\n${text}\n`);
    }
}