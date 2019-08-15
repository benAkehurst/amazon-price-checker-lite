const puppeteer = require('puppeteer');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
require('dotenv').config();

const url = 'https://www.amazon.co.uk/Canon-EOS-250D-Body-Black/dp/B07QDB3LQ9';
const targetPrice = 450;

let scraper = async url => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitFor(1000);
  const result = await page.evaluate(() => {
    let title = document.querySelector('#productTitle').innerText;
    let imgUrl = document.querySelector('#imgTagWrapperId > img').src;
    let priceStr = document.querySelector('#priceblock_ourprice').innerText;
    let priceInt = parseInt(priceStr.replace(/£/g, ''));
    return {
      title,
      imgUrl,
      priceInt
    };
  });
  browser.close();
  return result;
};

function sendEmail(result) {
  const mailOptions = {
    from: process.env.GMAIL_LOGIN, // sender address
    to: process.env.GMAIL_LOGIN, // list of receivers
    subject: `AMAZON PRICE TRACK - ${result.title} - PRICE: ${result.priceInt}`, // Subject line
    html: `<p>Go and buy it now <a href="${url}">HERE</a></p>` // plain text body
  };
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_LOGIN,
      pass: process.env.GMAIL_PASSWORD
    }
  });
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
    }
    console.log('Email Sent Successfully');
  });
}

function init() {
  scraper(url)
    .then(result => {
      let currentPrice = result.priceInt;
      if (currentPrice < targetPrice) {
        sendEmail(result);
      }
    })
    .catch(err => {
      console.log('Fatal Error', err);
    });
}

cron.schedule('1 * * * *', () => {
  console.log('Looking for a new price');
  init();
});
