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

const puppeteer = require('puppeteer')
const debug = false;

(async () => {
  const headless = !(debug === true)
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: headless,
    args: [
      // Required for Docker version of Puppeteer
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // This will write shared memory files into /tmp instead of /dev/shm,
      // because Docker’s default for /dev/shm is 64MB
      '--disable-dev-shm-usage'
    ]
  })
  const page = await browser.newPage()
  const tracker = new InflightRequests(page);

  try {
    await page.goto('https://www.strava.com/login').catch(e => {
      console.log('Navigation failed: ' + e.message);
      const inflight = tracker.inflightRequests();
      console.log(inflight.map(request => '  ' + request.url()).join('\n'));
    });
    tracker.dispose();
    await page.click('#email')

    await page.keyboard.type(process.env.STRAVA_USER)

    await page.click('#password')
    await page.keyboard.type(process.env.STRAVA_PWD)

    await page.$eval('#login_form', form => form.submit())
    await new Promise(resolve => setTimeout(resolve, 20000))

    await page.goto('https://www.strava.com/dashboard/following/300', {waitUntil: 'networkidle2',
      timeout: 3000000}).catch(e => {
        console.log('Navigation failed: ' + e.message);
        const inflight = tracker.inflightRequests();
        console.log(inflight.map(request => '  ' + request.url()).join('\n'));
      });
      tracker.dispose();

    await new Promise(resolve => setTimeout(resolve, 20000))
  

    await page.evaluate(() => {
      const kudosButtons = Array.from(document.querySelectorAll('button.js-add-kudo'))
      for (let i = 0; i < kudosButtons.length; i++) {
        try {
          kudosButtons[i].click()
        } catch (error) {
          console.log(error)
        }
      }
    })
    if (debug === true) {
      await page.screenshot({ path: 'strava.png', fullPage: true })
      await new Promise(resolve => setTimeout(resolve, 2000))
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
