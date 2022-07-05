//════════════════════════════//
//If you want to recode, reupload
//or copy the codes/script,
//pls give credit
//no credit? i will take action immediately
//© 2022 Xeon Bot Inc. Cheems Bot MD
//Thank you to Lord Buddha, Family and Myself
//════════════════════════════//
//recode kar ke youtube pe upload kar rhe hai ya
//codes copy kar ke apne script me dal rhe
//hai to, description me xeon ka yt channel
// ka link paste kr dena as a cradit or github 
//repo me bhi tag kardena baki jo
//bhi karna hai apki marzi, thank you!🦄
//════════════════════════════//
//If you recode and uploading on your channel
//or copy pasting the codes in ur script, 
//i give permission to do as long as you
//put Xeons youtube channel link in the video
//description and tag me on githuh repo, 
//thank you🦄
//════════════════════════════//
const path = require('path')
const _fs = require('fs')
const { promises: fs } = _fs

class Database {
    /**
     * Create new Database
     * @param {String} filepath Path to specified json database
     * @param  {...any} args JSON.stringify arguments
     */
    constructor(filepath, ...args) {
        this.file = path.resolve(filepath)
        this.logger = console
        
        this._load()

        this._jsonargs = args
        this._state = false
        this._queue = []
        this._interval = setInterval(async () => {
          if (!this._state && this._queue && this._queue[0]) {
            this._state = true
            await this[this._queue.shift()]().catch(this.logger.error)
            this._state = false
          }
        }, 1000)
        
    }

    get data() {
        return this._data
    }

    set data(value) {
        this._data = value
        this.save()
    }

    /**
     * Queue Load
     */
    load() {
        this._queue.push('_load')
    }

    /**
     * Queue Save
     */
    save() {
        this._queue.push('_save')
    }

    _load() {
        try {
          return this._data = _fs.existsSync(this.file) ? JSON.parse(_fs.readFileSync(this.file)) : {}
        } catch (e) {
          this.logger.error(e)
          return this._data = {}
        }
    }

    async _save() {
        let dirname = path.dirname(this.file)
        if (!_fs.existsSync(dirname)) await fs.mkdir(dirname, { recursive: true })
        await fs.writeFile(this.file, JSON.stringify(this._data, ...this._jsonargs))
        return this.file
    }
}

module.exports = Database

