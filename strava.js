/**
 * @name StravaKudos
 *
 * @desc Logs into Strava and gives kudos to your followers.
 * Provide your username and password as environment variables when running the script, i.e:
 * `STRAVA_USER=myuser STRAVA_PWD=mypassword node strava.js`
 *
 */

const secrets = require("./secrets.json")

const username = (process.env.STRAVA_USER || secrets.STRAVA_USER)
const password = (process.env.STRAVA_PWD || secrets.STRAVA_PWD)

const INIT_WAIT_TIME = 3;

const {
  performance,
  PerformanceObserver
} = require('perf_hooks');

async function spinTimer(timeToWait){
  let CLI = require('clui'),
      Spinner = CLI.Spinner;

  let countdown = new Spinner(`Waiting ${timeToWait} seconds...  `, ['⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷']);

  countdown.start();

  let number = timeToWait;
  for(;;){
    await new Promise(resolve => setTimeout(resolve, 1000))
    number--;
    countdown.message('Waiting ' + number + ' seconds...  ');
    if (number === 0) {
      process.stdout.write('\n');
      countdown.stop();
      return
    }
  } 
}

class InflightRequests {
  constructor(page) {
    this._page = page;
    this._requests = new Set();
    this._onStarted = this._onStarted.bind(this);
    this._onFinished = this._onFinished.bind(this);
    this._page.on('request', this._onStarted);
    this._page.on('requestfinished', this._onFinished);
    this._page.on('requestfailed', this._onFinished);
  }

  _onStarted(request) { this._requests.add(request); }
  _onFinished(request) { this._requests.delete(request); }
 
  inflightRequests() { return Array.from(this._requests); }  

  dispose() {
    this._page.removeListener('request', this._onStarted);
    this._page.removeListener('requestfinished', this._onFinished);
    this._page.removeListener('requestfailed', this._onFinished);
  }
}

require('console-stamp')(console, '[HH:MM:ss.l]');

const puppeteer = require('puppeteer-core')
const request_client = require('request-promise-native');
const chalk = require('chalk');
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36'

const debug = false;

async function interceptNeedlessRequests(page){
  await page.setRequestInterception(true);
    page.on('request', (req) => {
        if( resourceTypeBlock(req.resourceType()) ){
            req.abort();
        }
        else {
            req.continue();
        }
    })
}

function resourceTypeBlock(resourceType){
  return resourceType == 'image' || resourceType == 'stylesheet'
}
function resourceTypeKeep(resourceType){
  return resourceType == 'document' || resourceType == 'xhr'
}

(async () => {
  const headless = !(debug === true)
  const browser = await puppeteer.launch({
    userDataDir: '/tmp/user-data-dir',
    headless: headless,
    executablePath: '/usr/bin/google-chrome-unstable',
    args: [
      // Required for Docker version of Puppeteer
      '--no-sandbox',

      //'--disable-setuid-sandbox',
      // This will write shared memory files into /tmp instead of /dev/shm,
      // because Docker’s default for /dev/shm is 64MB
      //'--disable-dev-shm-usage'
    ],
    userAgent: userAgent
  })
  const page = await browser.newPage();
  await interceptNeedlessRequests(page);
  const tracker = new InflightRequests(page);

  if(debug===true){
    await page.setRequestInterception(true);
  }
  
  await page.setUserAgent(userAgent);

  page
    .on('console', async msg => {
      const args = await msg.args()

      args.forEach(async (arg) => {
        const val = await arg.jsonValue()
        // value is serializable
        if (JSON.stringify(val) !== JSON.stringify({})) console.log(val)
        // value is unserializable (or an empty oject)
        else {
          const { type, subtype, description } = arg._remoteObject
          const colorType = subtype.substr(0, 3).toUpperCase()
          const colors = {
            LOG: text => text,
            ERR: chalk.red,
            WAR: chalk.yellow,
            INF: chalk.cyan
          }
          const color = colors[colorType] || chalk.blue
          console.log(color(`type: ${type}, subtype: ${subtype}, description:\n ${description}`))
        }
      })
    })
    .on('pageerror', ({ message }) => console.log(chalk.red(message)))
    .on('response', response =>{
      let resourceType = response.request().resourceType();
      if( resourceTypeKeep(resourceType) ){
        console.log(chalk.green(`${response.status()} ${response.url()}`))
      }
    })
    .on('requestfailed', request =>{
      let resourceType = request.resourceType();
      if(resourceTypeKeep(resourceType)){
        console.log(chalk.magenta(`${request.failure().errorText} ${request.url()}`));
      }
    })
    if(debug==true){
      page.on('request', request => {
          request_client({
            uri: request.url(),
            resolveWithFullResponse: true,
            }).then(response => {
              // if(debug===true && request.url() == "https://www.strava.com/session") {
              //   console.log("REQUEST_URL")
              //   console.log(chalk.magenta(request.url()));
              //   const request_headers = request.headers();
              //   console.log("REQUEST_HEADERS");
              //   console.log(request.headers());
              //   console.log("POST_DATA");
              //   console.log(request.postData());
              //   console.log("RESPONSE_HEADERS")
              //   const response_headers = response.headers;
              //   console.log(response_headers);
              //   console.log("RESPONSE");
              //   console.log(response)
              //   console.log("RESPONSE_LENGTH");
              //   console.log(chalk.magenta(response_headers['content-length']));
              // }300
              request.continue();
            }).catch(error => {
              console.error(error);
              request.abort();
            });
        });
    }

  try {
    let howManyLooped = 0
    let howManySecondsPuppeting = 0
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
    
    await spinTimer(INIT_WAIT_TIME);
    for(;;) {
      var t0 = performance.now()
      await page.goto('https://www.strava.com/dashboard/following/300', {
        waitUntil: 'networkidle2',
        timeout: 3000000}).catch(e => {
          console.log('Navigation failed: ' + e.message);
          const inflight = tracker.inflightRequests();
          console.log(inflight.map(request => '  ' + request.url()).join('\n'))
      });
      tracker.dispose();
      
      console.log(await browser.userAgent());
      console.log('Got to strava')

      try {
        await page.waitForSelector('#login-button', {
          timeout: 2000
        })
        try {
          await page.waitForSelector('#stravaCookieBanner', {
            timeout: 2000
          })
          await page.click('.btn-accept-cookie-banner')
          console.log('Clicked Cookie Button')
        } catch (error) {
          console.log("Looks like we've already agreed to cookies")
        }
  

        await page.click('#email')
        await page.keyboard.type(username)
        console.log('Entered Username')

        await page.click('#password')
        await page.keyboard.type(password)
        console.log('Entered Password')
        
    
        await page.click('#login-button')
        console.log('Submitted Form')
    
        await page.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout: 3000000
        });
        console.log('Waited Now Kudo')

      } catch (error) {
        console.log("Looks like we were already logged in :D.")
      }


      // const cookies = await page.cookies()
      // console.log(b4cookies)
      // process.exit(0);


      console.log('Lets Click Some Buttons')
      await page.evaluate(() => {
        let howManyClicked = 0
        const kudosButtons = Array.from(document.querySelectorAll('button.js-add-kudo'))
        for (let i = 0; i < kudosButtons.length; i++) {
          try {
            console.log(`clicking ${i}`)
            howManyClicked++
            kudosButtons[i].click()
          } catch (error) {
            console.log(error)
          }
        }
        console.log(howManyClicked)
      })
      // if (debug === true) {page.waitForSelectora.png', fullPage: true })
      //   await new Promise(resolve => setTimeout(resolve, 5000))
      // }
      const ceiling = 1800
      const weWillWait = Math.floor(Math.random() * ceiling) + 1 ;
      var t1 = performance.now()

      if (howManySecondsPuppeting != 0) {
        let averagePupeteeringTime = howManySecondsPuppeting/howManyLooped;
        console.log(`Average Pupeteering Time ${averagePupeteeringTime} milliseconds`);
      }
      console.log(`we will wait ${weWillWait} seconds`);
      await spinTimer(weWillWait);
      howManySecondsPuppeting += (t1 - t0)
      howManyLooped++;
      console.log(`we've looped ${howManyLooped}`);
    }
  } catch (error) {
    console.log(error)
  }
  try {
    await new Promise(resolve => setTimeout(resolve, 2000))
    await browser.close()
  } catch (error) {
    console.log('Couldnt close browser', error)
  }
})()
