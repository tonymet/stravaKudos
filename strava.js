/**
 * @name StravaKudos
 *
 * @desc Logs into Strava and gives kudos to your followers.
 * Provide your username and password as environment variables when running the script, i.e:
 * `STRAVA_USER=myuser STRAVA_PWD=mypassword node strava.js`
 *
 */

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

const puppeteer = require('puppeteer')
const chalk = require('chalk')

const debug = false;

(async () => {
  const headless = !(debug === true)
  const browser = await puppeteer.launch({
    headless: headless,
    args: [
      // Required for Docker version of Puppeteer
      //'--no-sandbox',
      '--disable-setuid-sandbox',
      // This will write shared memory files into /tmp instead of /dev/shm,
      // because Docker’s default for /dev/shm is 64MB
      '--disable-dev-shm-usage'
    ]
  })
  const page = await browser.newPage()
  const tracker = new InflightRequests(page);


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
        }const chalk = require('chalk')
      })
    })
    .on('pageerror', ({ message }) => console.log(chalk.red(message)))
    .on('response', response =>
      console.log(chalk.green(`${response.status()} ${response.url()}`)))
    .on('requestfailed', request =>
      console.log(chalk.magenta(`${request.failure().errorText} ${request.url()}`)))

  try {
    await page.goto('https://www.strava.com/login').catch(e => {
      console.log('Navigation failed: ' + e.message);
      const inflight = tracker.inflightRequests();
      console.log(inflight.map(request => '  ' + request.url()).join('\n'))
    });
    tracker.dispose();
    console.log('Got to strava')

    await page.click('#email')
    await page.keyboard.type(process.env.STRAVA_USER)
    console.log('Entered Username')


    await page.click('#password')
    await page.keyboard.type(process.env.STRAVA_PWD)
    console.log('Entered Password')

    await page.$eval('#login_form', form => form.submit())
    console.log('Submitted Form')
    await new Promise(resolve => setTimeout(resolve, 20000))
    console.log('Waited Now Navigating')

    await page.goto('https://www.strava.com/dashboard/following/300', {waitUntil: 'networkidle2',
      timeout: 3000000}).catch(e => {
        console.log('Navigation failed: ' + e.message);
        const inflight = tracker.inflightRequests();
        console.log(inflight.map(request => '  ' + request.url()).join('\n'));
      });
      tracker.dispose();

    await new Promise(resolve => setTimeout(resolve, 20000))


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
    if (debug === true) {
      console.log('taking a screenshot')
      await new Promise(resolve => setTimeout(resolve, 5000))
      await page.screenshot({ path: 'strava.png', fullPage: true })
      await new Promise(resolve => setTimeout(resolve, 5000))
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
