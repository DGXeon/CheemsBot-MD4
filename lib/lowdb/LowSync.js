//═══════════════════════════════════════════════════════//
//If you want to recode, reupload
//or copy the codes/script,
//pls give credit
//no credit? i will take action immediately
//© 2022 Xeon Bot Inc. Cheems Bot MD
//Thank you to Lord Buddha, Family and Myself
//════════════════════════════//
const { MissingAdapterError } = require('./MissingAdapterError.js');
class LowSync {
    constructor(adapter) {
        this.data = null;
        if (adapter) {
            this.adapter = adapter;
        }
        else {
            throw new MissingAdapterError();
        }
    }
    read() {
        this.data = this.adapter.read();
    }
    write() {
        if (this.data !== null) {
            this.adapter.write(this.data);
        }
    }
}
module.exports = { LowSync };
