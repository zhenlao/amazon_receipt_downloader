const readLineSync = require("readline-sync");
const fs = require('fs');
const exec = require('child_process').exec;

const puppeteer = require('puppeteer');
const year = '2018'
const url = 'https://www.amazon.co.jp/gp/your-account/order-history?opt=ab&digitalOrders=1&unifiedOrders=1&orderFilter=year-' + year;

const cookie_path = './cookie.txt';


(async function(){

  // cookie
  let cookie_exist = false
  try{
    fs.statSync(cookie_path)
    cookie_exist = true
  }catch(e){ }

  if(!cookie_exist) {

    // 初回ログイン
    const _browser = await puppeteer.launch({headless: false});
    const _page = await _browser.newPage();
    await _page.goto(url);

    while(_page.url().match(/^https:\/\/www\.amazon\.co\.jp\/ap\/signin/) || _page.url().match(/^https:\/\/www\.amazon\.co\.jp\/ap\/mfa/)){
      await _page.waitFor(3000);
    }

    let cookies = await _page.cookies();
    fs.writeFileSync(cookie_path, JSON.stringify(cookies));
    console.log("Re-run this")
    await _browser.close();
    return
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  let cookies = JSON.parse(fs.readFileSync(cookie_path, 'utf-8'));
  for (let cookie of cookies) {
    await page.setCookie(cookie);
  }

  await page.goto(url);
  await page.waitFor(500)

  if(page.url().match(/^https:\/\/www\.amazon\.co\.jp\/ap\/signin/)) {
    fs.unlinkSync(cookie_path);
    console.log("Re-run this")
    await browser.close();
    return
  }


  // let html = await page.evaluate(() => { return document.getElementsByTagName('html')[0].innerHTML });
  // await fs.writeFileSync('page.html', html);


  console.log("Get invoice urls")
  have_next_page = true
  let invoice_urls = []
  let index = 10
  while(have_next_page) {
    let _urls = await page.evaluate(() => { return Array.from(document.querySelectorAll('span.hide-if-js a')).map(x => x.href) });
    have_next_page = _urls.length == 10
    // console.log(_urls.length)
    Array.prototype.push.apply(invoice_urls, _urls);

    await page.goto(url + '&startIndex=' + index)
    await page.waitFor(500)
    index += 10

  }

  console.log("Receive "+invoice_urls.length+" invoices rendering")
  invoice_index = 1;

  for(const url of invoice_urls) {
    await page.goto(url).catch(() => {
      console.log("error " + invoice_index + ".pdf")
    })
    await page.waitFor(500)
    await page.pdf({path: 'invoice-'+invoice_index+'.pdf' , format: 'A4'});

    invoice_index++
    if(invoice_index % 10 == 0) {
      console.log("Rendered " + invoice_index + " pdfs")
    }


  }
  console.log("Rendered all pdfs")

  await browser.close();
})();

