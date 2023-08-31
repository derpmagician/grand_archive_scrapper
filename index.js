import puppeteer from "puppeteer";
import fs from "fs/promises";
import { promises as fsPromises } from "fs";
import imageDownloader from 'image-downloader';
import inquirer from 'inquirer';

inquirer
  .prompt([
    {
      type: 'rawlist',
      name: 'rarity',
      message: 'Select a value for rarity:',
      choices: [
        'Common',
        'Uncommon',
        'Rare',
        'Super Rare',
        'Ultra Rare',
        'Promotinal Rare',
        'Collector Super Rare',
        'Collector Ultra Rare',
        'Collector Promo Rare'
      ],
    },
  ])
  .then(answers => {
    console.log("resp: ", answers);
    let rarity;
    switch (answers.rarity) {
      case "Common": rarity = 1; break;
      case "Uncommon": rarity = 2; break;
      case "Rare": rarity = 3; break;
      case "Super Rare": rarity = 4; break;
      case "Ultra Rare": rarity = 5; break;
      case "Promotinal Rare": rarity = 6; break;
      case "Collector Super Rare": rarity = 7; break;
      case "Collector Ultra Rare": rarity = 8; break;
      case "Collector Promo Rare": rarity = 9; break;
    }
    console.log("Please wait a moment while the images are being downloaded");
    // const rarity = answers.rarity

    const url = `https://index.gatcg.com/cards?rarity=${rarity}`
    handleDynamicWebPage(url, rarity);

  });


async function autoScroll(page){
  let elementsCount = 0;
  let newCount = 0;
  do {
    elementsCount = await page.evaluate(() => document.querySelectorAll('.card__image').length);
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitForTimeout(1000);  // espera para que se carguen los nuevos elementos
    newCount = await page.evaluate(() => document.querySelectorAll('.card__image').length);
  } while(elementsCount < newCount)
}

async function createDirectory(directory) {
  try {
    await fsPromises.access(directory);
    console.log('Directory already exists');
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        await fsPromises.mkdir(directory);
        console.log('Directory created successfully');
      } catch (error) {
        console.error('Failed to create directory:', error);
      }
    } else {
      console.error('Error accessing directory:', error);
    }
  }
}

async function downloadImgs(directory, data) {
  // console.log("data", data);
  for (const item of data) {
    const imageUrl = item.src;
    const options = {
      url: imageUrl,
      dest: `../../${directory}/${imageUrl.split('/').pop()}`, // the images will be saved at node_modules/image-downloader by default
    };
    try {
      await imageDownloader.image(options);
      console.log(`Image downloaded: ${imageUrl}`);
    } catch (error) {
      console.error(`Failed to download image: ${imageUrl}`);
      console.error(error);
    }
  }
}

async function handleDynamicWebPage(url, rarity) {
  const browser = await puppeteer.launch(
    {
    headless: true,
    slowMo: 2000,
    }
  );
  
  const page = await browser.newPage();

  await page.goto(url);

  await page.setViewport({width: 1080, height: 1024});

  // Función para simular el desplazamiento
  await autoScroll(page);
  
  const data = await page.evaluate(() => {
    const imgs = document.querySelectorAll(".card__image");
    const data = [...imgs].map((imgEl, index) => {
        return {
          index: index,
          alt: imgEl.alt,
          src: imgEl.src
        };
    });
    return data;

  });

  console.log("data to be downloaded: ", data);
  const jsonFile = `images${rarity}.json`

  try {
    // Convierte el objeto 'data' en formato JSON
    const jsonData = JSON.stringify(data, null, 2);

    // Escribe el JSON en el archivo
    await fs.writeFile(jsonFile, jsonData, 'utf-8');
    console.log('JSON file created successfully');
  } catch (error) {
      console.error('Failed to create JSON file:', error);
  }

  const directory = `./images${rarity}`;
  await createDirectory(directory);

  await downloadImgs(directory, data)

  await browser.close();
}



