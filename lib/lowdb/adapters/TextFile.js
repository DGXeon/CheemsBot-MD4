//═══════════════════════════════════════════════════════//
//If you want to recode, reupload
//or copy the codes/script,
//pls give credit
//no credit? i will take action immediately
//© 2022 Xeon Bot Inc. Cheems Bot MD
//Thank you to Lord Buddha, Family and Myself
//════════════════════════════//
const fs = require('fs');
const { Writer } = require('steno');
class TextFile {
    constructor(filename) {
        this.filename = filename;
        this.writer = new Writer(filename);
    }
    async read() {
        let data;
        try {
            data = await fs.promises.readFile(this.filename, 'utf-8');
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                return null;
            }
            throw e;
        }
        return data;
    }
    write(str) {
        return this.writer.write(str);
    }
}
module.exports = { TextFile };