//════════════════════════════//
//If you want to recode, reupload
//or copy the codes/script,
//pls give credit
//no credit? i will take action immediately
//© 2022 Xeon Bot Inc. Cheems Bot MD
//Thank you to Lord Buddha, Family and Myself
//════════════════════════════//
//recode kar ke youtube pe upload kar rhe ya
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

const {default: Axios} = require('axios')
const cheerio = require('cheerio')

function jadwaltv(query) {
	return new Promise(async (resolve, reject) => {
const channelna = query;
               let stasiun = [
                    "rcti",
                    "nettv",
                    "antv",
                    "gtv",
                    "indosiar",
                    "inewstv",
                    "kompastv",
                    "metrotv",
                    "mnctv",
                    "rtv",
                    "sctv",
                    "trans7",
                    "transtv",
                    "tvone",
                    "tvri",
               ];
               let isist = `*Available channels* :\n\n`;
               for (let i = 0;i < stasiun.length;i++) {
                    isist += `*➣*  ${stasiun[i]}\n`;
               }
               try {
                    // const tv_switch = stasiun[0]
                    Axios.get("https://www.jadwaltv.net/channel/" + channelna)
                         .then(({
                              data
                         }) => {
                              const $ = cheerio.load(data);
                              let isitable1 = [];
                              let isitable2 = [];
                              $("div > div > table:nth-child(3) > tbody > tr").each(function (
                                   i,
                                   result
                              ) {
                                   isitable1.push({
                                        jam: result.children[0].children[0].data,
                                        tayang: result.children[1].children[0].data,
                                   });
                              });
                              // console.log(isitable1)
                              $("div > div > table:nth-child(5) > tbody > tr").each(function (
                                   i,
                                   result
                              ) {
                                   isitable2.push({
                                        jam: result.children[0].children[0].data,
                                        tayang: result.children[1].children[0].data,
                                   });
                              });
                              const semuatable = [];

                              for (let i = 0;i < isitable1.length;i++) {
                                   semuatable.push(isitable1[i]);
                              }
                              for (let i = 0;i < isitable2.length;i++) {
                                   semuatable.push(isitable2[i]);
                              }
                              // console.log(semuatable)
                              let daftartay = `*Menampilkan daftar tayang channel ${channelna}*\n\n`;
                              for (let i = 0;i < semuatable.length;i++) {
                                   daftartay += `${semuatable[i].jam}  ${semuatable[i].tayang}\n`;
                              }
                              resolve(daftartay);
                              // console.log(semuatable)
                         })
                         .catch((e) => {
                              resolve(isist);
                              // console.log(e)
                         });
               } catch (e) {
                    resolve(isist);
                    console.log(e);
               }
	})
}

module.exports = {jadwaltv}