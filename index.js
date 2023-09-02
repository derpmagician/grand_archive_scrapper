import puppeteer from "puppeteer";
import fs, { promises as fsPromises } from "fs";
import inquirer from 'inquirer';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const rarityChoices = [
  'Common',
  'Uncommon',
  'Rare',
  'Super Rare',
  'Ultra Rare',
  'Promotinal Rare',
  'Collector Super Rare',
  'Collector Ultra Rare',
  'Collector Promo Rare'
];
let directory;

inquirer
  .prompt([
    {
      type: 'rawlist',
      name: 'rarity',
      message: 'Select a value for rarity:',
      choices: rarityChoices,
    },
  ])
  .then(answers => {
    console.log("resp: ", answers);
    let rarity;
    switch (answers.rarity) {
      case rarityChoices[0]: rarity = 1; break;
      case rarityChoices[1]: rarity = 2; break;
      case rarityChoices[2]: rarity = 3; break;
      case rarityChoices[3]: rarity = 4; break;
      case rarityChoices[4]: rarity = 5; break;
      case rarityChoices[5]: rarity = 6; break;
      case rarityChoices[6]: rarity = 7; break;
      case rarityChoices[7]: rarity = 8; break;
      case rarityChoices[8]: rarity = 9; break;
    }
    console.log("Please wait a moment while the images are being downloaded");

    directory = `./images_${rarityChoices[rarity-1]}`;

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


function downloadImgs(imageDetails) {
  const jsonContent = JSON.stringify(imageDetails, null, 2);
  try {
    fs.writeFileSync('imageDetails.json', jsonContent);
    console.log('JSON file created successfully!');
  } catch (err) {
    console.error('Error writing JSON file:', err);
  }

  console.log(`Images to be downloaded: ${imageDetails.length}`);
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  for (const imageDetail of imageDetails) {
    https.get(imageDetail.src, (res) => {
      const filePath = path.resolve(__dirname, directory, path.basename(imageDetail.src));
      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
          fileStream.close();
          console.log(`Image downloaded: ${imageDetail.alt} ${imageDetail.src}`);
      });
    }).on('error', (error) => {
      console.error(`Failed to download image: ${imageDetail.alt} ${imageDetail.src}`);
      console.error(error);
    });
  }
}

async function handleDynamicWebPage(url) {

  await createDirectory(directory);

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

  const imageDetails = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll(".card__image"));
    return imgs.map(img => ({ src: img.src, alt: img.alt }));
  });

  downloadImgs(imageDetails)

  await browser.close();
}


