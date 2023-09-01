require("dotenv").config()
const { Telegraf } = require('telegraf')
const bot = new Telegraf(process.env.BOT_TOKEN)
const puppeteer = require('puppeteer');
const cron = require("node-cron");
const opts = require("./options");

let sumPrice = 0
let openedCases = {};
let allOpenedCases = 0;
let startParcing = false

let minutes;
let hours;

const updatePrice = async () => {
    sumPrice = 0;
    openedCases = {};
    allOpenedCases = 0;
}

const sendPrice = async (ctx) => {
    cron.schedule(`${minutes} ${hours} * * *`, async () => {
        let openedCasesString = ``;
        for (const [key, value] of Object.entries(openedCases)) {
            openedCasesString += `${key} : ${value}\n`;
        }
        await ctx.reply(`Заработок сайта за 24 часа (без Daily Case): ${Math.round(sumPrice * 100) / 100} $\n\n${openedCasesString}\nВсего открыто кейсов: ${allOpenedCases}`);
        await updatePrice()
    }, {
        scheduled: true,
        timezone: "Europe/Kiev"
    });
}

const saveInfo = async (price, caseName) => {
    if (!openedCases[caseName]) {
        openedCases[caseName] = 1;
    } else {
        openedCases[caseName] += 1;
    }
    allOpenedCases++;

    if (caseName != "Daily Case") {
        sumPrice += price;
    }
}

const getPrice = async (url) => {
    const browser = await puppeteer.launch(opts.LAUNCH_PUPPETEER_OPTS);
    const page = await browser.newPage();
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
    });
    page.setDefaultNavigationTimeout(0);
    await page.goto(url);
    await page.waitForSelector("body > app-root > div > div.topNavigation.dark-bg-1 > app-top-bar-vanilla > div > div.recentWinnings")
    page.exposeFunction('saveInfo', saveInfo)

    await page.evaluate(() => {
        const target = document.querySelector('body > app-root > div > div.topNavigation.dark-bg-1 > app-top-bar-vanilla > div > div.recentWinnings')
        const observer = new MutationObserver(async (mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type == "childList" && mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(element => {
                        if (element.children) {
                            let priceStr = element.children[0].children[1].children[2].innerText
                            let caseName = element.children[0].children[1].children[1].children[1].innerText
                            window.saveInfo(+priceStr.slice(priceStr.indexOf('$') + 1), caseName);
                        }
                    });
                }
            });
        });

        observer.observe(target, { childList: true });
    })
}

bot.start(async (ctx) => {
    if (!startParcing) {
        await ctx.reply('Парсинг начался')
        await getPrice('https://www.csgolive.com/home')
        sendPrice(ctx)
        startParcing = true;
        minutes = new Date(Date.now()).toLocaleTimeString("uk-UA", { timeZone: 'Europe/Kiev' }).slice(0, -3).slice(3);
        hours = new Date(Date.now()).toLocaleTimeString("uk-UA", { timeZone: 'Europe/Kiev' }).slice(0, -3).slice(0, 2);
    } else {
        ctx.reply('Парсинг уже идёт')
    }
});



process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
bot.launch();