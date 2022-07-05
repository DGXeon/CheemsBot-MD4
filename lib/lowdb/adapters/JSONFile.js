//═══════════════════════════════════════════════════════//
//If you want to recode, reupload
//or copy the codes/script,
//pls give credit
//no credit? i will take action immediately
//© 2022 Xeon Bot Inc. Cheems Bot MD
//Thank you to Lord Buddha, Family and Myself
//════════════════════════════//
const { TextFile } = require('./TextFile.js');
class JSONFile {
    constructor(filename) {
        this.adapter = new TextFile(filename);
    }
    async read() {
        const data = await this.adapter.read();
        if (data === null) {
            return null;
        }
        else {
            return JSON.parse(data);
        }
    }
    write(obj) {
        return this.adapter.write(JSON.stringify(obj, null, 2));
    }
}
module.exports = { JSONFile };
