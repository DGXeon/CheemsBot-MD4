//═══════════════════════════════════════════════════════//
//If you want to recode, reupload
//or copy the codes/script,
//pls give credit
//no credit? i will take action immediately
//© 2022 Xeon Bot Inc. Cheems Bot MD
//Thank you to Lord Buddha, Family and Myself
//════════════════════════════//
const { TextFileSync } = require('./TextFileSync.js');
class JSONFileSync {
    constructor(filename) {
        this.adapter = new TextFileSync(filename);
    }
    read() {
        const data = this.adapter.read();
        if (data === null) {
            return null;
        }
        else {
            return JSON.parse(data);
        }
    }
    write(obj) {
        this.adapter.write(JSON.stringify(obj, null, 2));
    }
}
module.exports = { JSONFileSync };
