import fetch from "node-fetch";
import puppeteer from "puppeteer";
import fs, { promises as fsPromises } from "fs";
import inquirer from 'inquirer';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

let directory;
let rarity;
let set;


const searchUrl ="https://api.gatcg.com/option/search"

const searchValues = async () => {
  const response = await fetch(searchUrl)
  if (response.status === 200) {
    const data = await response.json()
    // console.log("la data", data)
    return data
  } else {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

try {
  const data = await searchValues()
  const classCollection = data.class
  const elementCollection = data.element
  const gameFormatCollection = data.gameFormat
  const rarityCollection = data.rarity
  const setCollection = data.set
  const subtypeCollection = data.subtype
  const typeCollection = data.type

  let rarityTextArray = rarityCollection.map(item => item.text);
  let rarityValueArray = rarityCollection.map(item => item.value);
  rarityTextArray = ["none"].concat(rarityTextArray);
  rarityValueArray = [""].concat(rarityValueArray);

  let setTextArray = setCollection.map(item => item.text);
  let setValueArray = setCollection.map(item => item.value);
  setTextArray = ["none"].concat(setTextArray);
  setValueArray = [""].concat(setValueArray);

  // console.log(setTextArray)
  // console.log(setValueArray)

  inquirer
  .prompt([
    {
      type: 'rawlist',
      name: 'rarity',
      message: 'Select the type of rarity, (choose none to skip this filter)',
      choices: rarityTextArray,
    },
    {
      type: 'rawlist',
      name: 'set',
      message: 'Select the type of set, (choose none to skip this filter)',
      choices: setTextArray,
    },

  ])
  .then(answers => {
    console.log("Active filters ", answers);
    console.log("Wait a moment please while the images links are being collected");

    rarityTextArray.forEach((rText, index) => {
      if (rText === answers.rarity) rarity = rarityValueArray[index]
    })

    setTextArray.forEach((sText, index) => {
      if (sText === answers.set) set = setValueArray[index]
    })

    console.log("It could take a while depending on the numbers of cards with the selected settings");
    console.log("rarity :", rarity, " set ", set);

    if ((rarity === undefined) && (set === undefined)) {
      directory = `./images`;
    } else if ((rarity === undefined) && (set !== undefined))  {
      directory = `./images_${set}`;
    } else if ((rarity !== undefined) && (set === undefined)) {
      directory = `./images_${rarity}`;
    } else {
      directory = `./images_${rarity}_${set}`;
    }


    const url = `https://index.gatcg.com/cards?rarity=${rarity}&prefix=${set}`
    console.log(url)

    handleDynamicWebPage(url, rarity);

  });

} catch (error) {
  console.error("Error:", error)
}

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
    console.log('Folder already exists');
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        await fsPromises.mkdir(directory);
        console.log('Folder created successfully');
      } catch (error) {
        console.error('Failed to create Folder:', error);
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

  console.log(`Number of images to be downloaded: ${imageDetails.length}`);
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  for (const imageDetail of imageDetails) {
    https.get(imageDetail.src, (res) => {
      const filePath = path.resolve(__dirname, directory, path.basename(imageDetail.src));
      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
          fileStream.close();
          console.log(`Downloaded: ${imageDetail.alt} ${imageDetail.src}`);
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


