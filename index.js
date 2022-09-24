const {
   default: makeWASocket,
   MessageType,
   MessageOptions,
   Mimetype,
   useMultiFileAuthState,
   downloadMediaMessage,
   downloadContentFromMessage,
   fetchLatestBaileysVersion,
   proto,
   DisconnectReason
} = require('@adiwajshing/baileys')
const {Boom} = require('@hapi/boom')
// const {
//    Sticker,
//    createSticker,
//    StickerTypes
// } = require('wa-sticker-formatter')
const axios = require('axios').default;
const fs = require('fs');
const readline = require('readline');
const ytSearch = require('yt-search');
const ytdl = require('ytdl-core');
const path = require('path');
const pino = require('pino')
const sharp = require('sharp');
const os = require('os')
const gTTS = require('@killovsky/gtts');
const userCommands = [".help",".hello",".system",".weather",".tts",".ytsearch",".song",".ytdl",".time",".sticker"]


// const {MAIN_LOGGER} = require('@adiwajshing/baileys')

// const logger = MAIN_LOGGER.child({ })
// logger.level = 'trace'
// let logger = P({ level: 'debug' });

async function connectToWhatsApp() {
   const {
      state,
      saveCreds
   } = await useMultiFileAuthState('baileys_auth_info')
   const {
      version,
      isLatest
   } = await fetchLatestBaileysVersion()
   console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

   const sock = makeWASocket({
      version,
      // can provide additional config here
      printQRInTerminal: true,
      auth: state,
      getMessage: async key => {
         if (store) {
            const msg = await store.loadMessage(key.remoteJid, key.id, undefined)
            return msg?.message || undefined
         }

         // only if store is present
         return {
            conversation: 'hello'
         }
      }
   })
   sock.ev.on('creds.update', saveCreds)
   sock.ev.on('connection.update', (update) => {

      const {
         connection,
         lastDisconnect
      } = update
      if (connection === 'close') {
         const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
         console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
         // reconnect if not logged out
         if (shouldReconnect) {
            connectToWhatsApp()
         }
      } else if (connection === 'open') {
         console.log('opened connection')
      }
   })
   let messages = []

   function saveMessageST(messageID, txt) {
      messages[messageID] = txt
   }


   sock.ev.on('messages.upsert', async (m) => {
      let jid = '';
      let msgkey = m.messages[0].key;
      let fromMe = m.messages[0].key.fromMe;

      for (var i = 0; i < m.messages[0].key.remoteJid.length; i++) {
         jid = jid + m.messages[0].key.remoteJid[i];
      }
      let command;
      let sCommand = '';
      try {
         command = m.messages[0].message.conversation
         sCommand = command.split(" ")
      } catch (err) {
         console.log(err)
      }
      //```````   HELP   ```````

      if(command==userCommands[0] && fromMe){
         var jid2 = jid
         await sock.sendMessage(jid2, {
            delete: msgkey
         });

         await sock.sendMessage(jid2, {
            text: '    *MENU*    \n'+
'\n'+
'*.help* - To get all the commands\n'+
'*.hello* - To check to bot is alive or not\n'+
'*.time* - To get the current time\n'+
'*.system* - To get all the system info\n'+
'*.weather* - To get the current weather(Currently Delhi,India only)\n'+
'*.tts* - to convert text to speech. Ex- .tts <arguments>\n'+
'*.ytsearch* - to get the youtube search results.  Ex- .ytsearch <arguments>\n'+
'*.ytdl* - to donwload the youtube video.  Ex- .ytdl  <youtube url>\n'+
'*.song* - to download the song. Ex - .song <youtube url>\n'+
'*.sticker* - To convert the replied image to sticker.'
         });
      }



      //```````   HELLO   ```````

      else if (command == userCommands[1] && fromMe) {
         var jid2 = jid
         await sock.sendMessage(jid2, {
            delete: msgkey
         });
         var msg = await sock.sendMessage(jid2, {
            text: "I am alive",
         });
      }
      //```````   TIME   ```````

       else if (command == userCommands[8]) {
         var jid2 = jid
         await sock.sendMessage(jid2, {
            delete: msgkey
         });
         var msg = await sock.sendMessage(jid2, {
            text: `*${new Date().toString()}*`,
         });
      }

      //```````   System Info   ```````
      else if (command == userCommands[2]) {
         let totalMem = ((os.totalmem()) / 1024) / 1024;
         let freeMem = ((os.freemem()) / 1024) / 1024;
         let botUptime = ((os.uptime()) / 60) / 60;
         let osType = os.type();
         let freeMemP = (os.freemem() / os.totalmem()) * 100

         var jid2 = jid
         await sock.sendMessage(jid2, {
            delete: msgkey
         });

         var msg = await sock.sendMessage(jid2, {
            text: `*SYSTEM INFO* \n\n*Memory:* ${100 - Math.floor(freeMemP)}%\n*Platform:* ${os.platform()}\n*Version:* ${os.version()}\n*Uptime:* ${Math.floor(botUptime)}hrs  `
         });
      }

      //```````   Weather   ```````
      else if (command == userCommands[3]) {
         let city = 'Delhi';
         let country = 'India';
         var jid2 = jid;
         let minTemp;
         let maxTemp;
         let humidity;
         let pressure, clouds, wind

         await sock.sendMessage(jid2, {
            delete: msgkey
         });
         let url = `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&appid=994077381a8dc8b7f9525dc80c39f999&units=metric`;

         try {
            let response = await axios.get(url);
            let mainInfo = response.data.main;
            clouds = response.data.clouds.all
            wind = response.data.wind.speed
            minTemp = mainInfo.temp_min
            minTemp = mainInfo.temp_max
            humidity = mainInfo.humidity
            pressure = mainInfo.pressure

         } catch (err) {}

         let msg = await sock.sendMessage(
            jid2, {
               text: `*WEATHER FORCAST* \n\n*City:* ${city}\n*Country:* ${country}\n*Minimum Temp:* ${minTemp}°C\n*Maximum Temp:* ${minTemp}°C\n*Pressure:* ${pressure}mb\n*Humidity:* ${humidity}%\n*Clouds:* ${clouds}%\n*Wind:* ${wind}km/h `
            })
      }

      //```````   .TTS   ```````
      else if (sCommand[0] == userCommands[4]) {
         var jid2 = jid
         await sock.sendMessage(jid2, {
            delete: msgkey
         });
         console.log(`sCommand_________${sCommand}`)
         console.log('sCommand[1] ' + sCommand[1])
         if (sCommand[1] === '' || sCommand[1] === undefined) {
            await sock.sendMessage(
               jid2, {
                  text: "Provide a valid argument"
               })

            return
         } else {
            try {
               let dpath = path.join(path.resolve(__dirname), 'abc.mp3')
               var cleanCommand1 = command.replace('.tts', '');
               var cleanCommand2 = cleanCommand1.replace('/n', '').trim();
               console.log(`CLEAN COMMAND_________${cleanCommand2}`)
               console.log(`dpathdpath_________${dpath}`)

               let bufferss = await gTTS.create("hi", cleanCommand2, false, dpath)
               await fs.writeFile(dpath, bufferss.gtts.buffer, async () => {
                  await sock.sendMessage(
                     jid2, {
                        audio: fs.readFileSync('abc.mp3'),
                        mimetype: 'audio/mp4'
                     })
                  console.log("successful")
               })


            } catch (err) {
               console.log(err)
            }
         }


      }

      //```````   YT Search   ```````
      else if (sCommand[0] == userCommands[5]) {
         if (sCommand[1] === '') {
            return
         };

         var jid2 = jid
         await sock.sendMessage(jid2, {
            delete: msgkey
         });
         let result = []
         let query = delete sCommand[0]
         try {
            async function yts() {
               const r = await ytSearch(`${sCommand}`.toString())
               const videos = r.videos
               for (let i = 0; i < 6; i++) {
                  // result.push(videos[i].title +' | ' +videos[i].timestamp +' | ' + videos[i].ago  +' | ' + videos[i].url);
                  let msg = await sock.sendMessage(jid2, {
                     text: `${videos[i].title} | ${videos[i].timestamp} | ${videos[i].ago}  | ${videos[i].url}\n`
                  })
               }
            }
            yts();

         } catch (err) {
            console.log(err)
         }

      }

      //```````   SONG   ```````
      else if (sCommand[0] == userCommands[6]) {
         let jid2 = jid
         let pathed = path.resolve(__dirname, 'audio.mp3');
         await sock.sendMessage(jid2, {
            delete: msgkey
         });
         if (sCommand[1] === "") {
            await sock.sendMessage(jid2, {
               text: 'Please Enter valid url'
            });
            return
         }
         try {
            url = sCommand[1];
            let audio = ytdl(url, {
               quality: 'highestaudio',
            })

            audio.pipe(fs.createWriteStream(pathed))
            audio.on('progress', (chunkLength, downloaded, total) => {
               const percent = downloaded / total;
               readline.cursorTo(process.stdout, 0);
               process.stdout.write(`${(percent * 100).toFixed(2)}% downloaded `);
               process.stdout.write(`(${(downloaded / 1024 / 1024).toFixed(2)}MB of ${(total / 1024 / 1024).toFixed(2)}MB)\n`);
               readline.moveCursor(process.stdout, 0, -1);
            })
            audio.on('end', async () => {
               process.stdout.write('\n\n');
               await sock.sendMessage(
                  jid2, {
                     audio: fs.readFileSync("audio.mp3"),
                     mimetype: 'audio/mp4'
                  }

               )
            })

         } catch (err) {
            console.log(err)
         }

      }

      //```````   YT DOWNLOAD   ```````
      else if (sCommand[0] == userCommands[7]) {
         let jid2 = jid
         await sock.sendMessage(jid2, {
            delete: msgkey
         });
         let url;
         if (sCommand[1] === "") {
            await sock.sendMessage(jid2, {
               text: 'Please Enter valid url'
            });
            return
         }
         url = sCommand[1];
         const output = path.resolve(__dirname, 'video.mp4');
         const video = ytdl(url);
         try {
            video.pipe(fs.createWriteStream(output));
            video.on('progress', (chunkLength, downloaded, total) => {
               const percent = downloaded / total;
               readline.cursorTo(process.stdout, 0);
               process.stdout.write(`${(percent * 100).toFixed(2)}% downloaded `);
               process.stdout.write(`(${(downloaded / 1024 / 1024).toFixed(2)}MB of ${(total / 1024 / 1024).toFixed(2)}MB)\n`);
               readline.moveCursor(process.stdout, 0, -1);
            });
            video.on('end', async () => {
               process.stdout.write('\n\n');
               await sock.sendMessage(
                  jid2, {
                     video: fs.readFileSync("video.mp4"),
                     Mimetype: "audio/mp4"
                  }
               )
            });

         } catch (err) {
            console.log(err)
         }

      }


      let replied = false
      let isReplied, command2, status1, msgType;
      try {
         status1 = m.messages[0].message.extendedTextMessage;
         command2 = status1.text
         msgType = Object.keys(m.messages[0].message.extendedTextMessage.contextInfo.quotedMessage);
         isReplied = true;
         replied = false;
      } catch {
         isReplied = false;
      }

      if (isReplied) {
         let jid2 = jid
         if (msgType == 'imageMessage') {

            //```````   Sticker   ```````

            if (command2 == userCommands[10]) {
               await sock.sendMessage(jid2, {
                  delete: msgkey
               });
               let buffer = Buffer.from([]);
               const stream = await downloadContentFromMessage(
                  m.messages[0].message.extendedTextMessage.contextInfo.quotedMessage.imageMessage,
                  "image")

               try {
                  for await (const chunk of stream) {
                     buffer = Buffer.concat([buffer, chunk])
                  }
                  await sharp(buffer)
                     .resize({
                        width: 512,
                        fit: 'cover'
                     })
                     .webp({
                        effort: 6
                     })
                     .toFile('output.webp', async (error, info) => {
                        if (error) {
                           console.log(error)
                        };
                        console.log(info)
                        await sock.sendMessage(jid2, {
                           sticker: fs.readFileSync('output.webp')
                        })
                     })

               } catch (err) {
                  console.log()
               }


            }

         }


      }


   })


}
// run in main file
connectToWhatsApp();