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

const fs = require('fs')
const chalk = require('chalk')

//Api Website\\
global.APIs = {
	zenz: 'https://zenzapis.xyz',
}

//Api Key\\
global.APIKeys = {
	'https://zenzapis.xyz': 'your key',
}


//aumto functioner
global.autoTyping = false //auto tying in gc (true to on, false to off)
global.autoreadpmngc = false //auto reading in gc and pm (true to on, false to off)
global.autoReadGc = false //auto reading in gc (true to on, false to off)
global.autoRecord = false //auto recording (true to on, false to off)
global.available = true //auto available (true to on, false to off)

//semt menu variants
global.vidmenu = fs.readFileSync("./XeonMedia/theme/Cheems-bot.mp4") //gif and video menu

//documents variants
global.doc1 = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
global.doc2 = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
global.doc3 = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
global.doc4 = 'application/zip'
global.doc5 = 'application/pdf'
global.doc6 = 'application/vnd.android.package-archive'

//owmner v card
global.vcardowner = ['94742265843'] //ur owner number
global.ownername = "samith dilshan" //ur owner name
global.ytname = "YT: YAKA MODZ" //ur yt chanel name
global.socialm = "Grouo link" //ur github or insta name
global.location = "Sri lanka" //ur location

//bot bomdy 
global.owner = ['94742265843']
global.ownertag = '94742265843' //ur tag number
global.botname = 'Devil Bot MD' //ur bot name
global.linkz = "https://youtube.com/channel/UCDc_vYQFGHznliwSypY_5CA" //your theme url which will be displayed on whatsapp
global.websitex = "https://youtube.com/channel/UCDc_vYQFGHznliwSypY_5CA" //ur website to be displayed
global.botscript = 'https://chat.whatsapp.com/FRVSjuGywmUHs5rc3Xi4vV' //script link
global.reactmoji = "🥰" //ur menu react emoji
global.themeemoji = "🎀" //ur theme emoji
global.packname = "Devil Bot Stickers\n\n\n\n\n\n\n\n\n\n\n🦄🦄🦄 " //ur sticker watermark packname
global.author = "samith dilsham" //ur sticker watermark author

//Bot theme media
global.thum = fs.readFileSync("./XeonMedia/theme/cheemspic1.jpg") //ur thumb pic
global.log0 = fs.readFileSync("./XeonMedia/theme/cheemspic1.jpg") //ur logo pic
global.err4r = fs.readFileSync("./XeonMedia/theme/cheemspic1.jpg") //ur error pic
global.thumb = fs.readFileSync("./XeonMedia/theme/cheemspic1.jpg") //ur thumb pic

//damtabase
global.premium = ['94742265843'] //ur premium numbers
global.ntilinkytvid = []
global.ntilinkytch = []
global.ntilinkig = []
global.ntilinkfb = []
global.ntilinktg = []
global.ntilinktt = []
global.ntilinktwt = []
global.ntilinkall = []
global.nticall = []
global.ntwame = []
global.nttoxic = []
global.ntnsfw = []
global.ntvirtex = []
global.rkyt = []
global.wlcm = []
global.gcrevoke = []
global.autorep = []
global.ntilink = []

//omther
global.sessionName = 'session'
global.antitags = true
global.prefa = ['','!','.','🐋','🍃','🎯']
global.sp = '◉'
global.mess = {
    success: 'හරි ✓',
    admin: 'මෙම විශේෂාංගය පරිපාලක සඳහා පමණි!',
    botAdmin: 'මම ඇඩ්මින් නොවේ',
    owner: 'මෙම විශේෂාංගය හිමිකරු සඳහා පමණි!',
    group: 'විශේෂාංගය කණ්ඩායම් සඳහා පමණක් භාවිතා වේ!',
    private: 'පුද්ගලික කතාබස් සඳහා පමණක් භාවිතා කරන විශේෂාංග!',
    bot: 'මෙම විශේෂාංගය බොට්‍ට පමනි',
    wait: 'ක්‍රියාවලියේ...',
    linkm: 'කෝ ලින්ක් එක?',
    error: 'දෝශයක්!!',
    endLimit: 'ඔබගේ දෛනික සීමාව කල් ඉකුත් වී ඇත, සීමාව සෑම පැය 12 කට වරක් නැවත සකසනු ලැබේ',
    ban: 'ඔබ අයිතිකරු විසින් තහනම් කර ඇත, ඔබට තහනම් නොකිරීමට අවශ්‍ය නම්, කතාබස් හිමිකරු.',
    nsfw: 'nsfw විශේෂාංගය සක්‍රිය කර නැත, කරුණාකර සක්‍රිය කිරීමට පරිපාලක අමතන්න',
    banChat: 'මෙම සමූහයේ බොට් තහනම් කර ඇත, කරුණාකර තහනම් නොකිරීමට හිමිකරු අමතන්න
}
    global.limitawal = {
    premium: "Infinity",
    free: 12,
    monayawal: 1000
}
   global.rpg = {
   darahawal: 100,
   besiawal: 15,
   goldawal: 10,
   emeraldawal: 5,
   umpanawal: 5,
   potionawal: 1
}
global.thumb = fs.readFileSync('./XeonMedia/theme/cheemspic1.jpg')
global.flaming = 'https://www6.flamingtext.com/net-fu/proxy_form.cgi?&imageoutput=true&script=sketch-name&doScale=true&scaleWidth=800&scaleHeight=500&fontsize=100&text='
global.fluming = 'https://www6.flamingtext.com/net-fu/proxy_form.cgi?&imageoutput=true&script=fluffy-logo&doScale=true&scaleWidth=800&scaleHeight=500&fontsize=100&text='
global.flarun = 'https://www6.flamingtext.com/net-fu/proxy_form.cgi?&imageoutput=true&script=runner-logo&doScale=true&scaleWidth=800&scaleHeight=500&fontsize=100&text='
global.flasmurf = 'https://www6.flamingtext.com/net-fu/proxy_form.cgi?&imageoutput=true&script=smurfs-logo&doScale=true&scaleWidth=800&scaleHeight=500&fontsize=100&text='
let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update'${__filename}'`))
	delete require.cache[file]
	require(file)
})
