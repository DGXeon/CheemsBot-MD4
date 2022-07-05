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

const axios = require('axios')
const cheerio = require('cheerio')

const ApkDown = async (url) => {
const res = await axios.get(url) 
const $ = cheerio.load(res.data)
const total = []
$(`div.entry-inner`).each(function(e,hasil){
let desc = $(hasil).find('p').text()

let title = $('div.post-inner.group').find('h1.post-title').text()

let size = $('div#dlbox1').find('ul > li > span').text().split('size: ')[1].split('Update')[0]

let vers = $('div#dlbox1').find('ul > li > span').text().split('Version: ')[1].split('File')[0]

let up = $('div#dlbox1').find('ul > li > span').text().split('Update: ')[1]

let link = $('div#dlbox12').find('li > a').attr('href')

let thumb = $('div#dlbox').find('img').attr('data-src')

total.push({title,size,vers,up,link,thumb,desc})
console.log(total)
})
return (total)
}


module.exports = { ApkDown }