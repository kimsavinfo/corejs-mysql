import fs from "node:fs";
import dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

function getFilesPaths({ inputPath, recursive = true, whitelist = ["*"], output = []  }) {
    if ( fs.existsSync(inputPath) ) {
        const files = fs.readdirSync(inputPath);

        for( const file of files ) {
            const path = `${inputPath}/${file}`;

            if( fs.lstatSync(path).isDirectory() ) {
                getFilesPaths({ inputPath: path, recursive: recursive, whitelist: whitelist, output: output} );

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

async function main() {
    const outputFilePath = `${process.cwd()}/documentation/01_SCHEMAS.md`;
    if( fs.existsSync(outputFilePath) ) {
        fs.unlinkSync(outputFilePath);
    }
    
    fs.appendFileSync( outputFilePath, `# SCHEMAS\n\n`);

    const tablesFilesPaths = getFilesPaths({ inputPath: `${process.cwd()}/unittests/annexes` });
    for(const tableFilePath of tablesFilesPaths) {
        try {
            const table = (await import(tableFilePath)).default;
            if( table.label?.length > 0 ) {
                fs.appendFileSync( outputFilePath, `## ${table.label}\n\n`);

                fs.appendFileSync( outputFilePath, `### Schema \n\n`);
                fs.appendFileSync( outputFilePath, `\`\`\`\n`);
                fs.appendFileSync( outputFilePath, `${JSON.stringify(table.schema, null, 4)}\n\n`);
                fs.appendFileSync( outputFilePath, `\`\`\`\n`);
                fs.appendFileSync( outputFilePath, `Primary key: ${table.primaryKey} \n\n`);
            }
        } catch(error) {
            console.error(tableFilePath, error);
        }
    }
    
    

}
main();