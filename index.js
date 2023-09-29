const { create, Client } = require('@open-wa/wa-automate');
const fs = require('fs');
const axios = require('axios');

// Directory to store links files
const linksDirectory = './links/';
const friendlyLinksFile = `${linksDirectory}links_friendly.json`;
const enemyLinksFile = `${linksDirectory}links_enemy.json`;
let currentLinks = [];

create().then((client) => start(client));

function start(client) {
  console.log('Bot is connected!');

  client.onMessage(async (message) => {
    if (message.body) {
      const body = message.body.toLowerCase().trim();
      const chatId = message.from;

      if (body.startsWith('/add')) {
        const link = body.substring(5).trim();
        const linkCategory = 'friendly'; // Default to 'friendly' category
        if (isValidTwitterLink(link)) {
          const timestamp = await getCurrentTime();
          if (timestamp) {
            addLinkToJSON(link, timestamp, linkCategory, chatId, client);
            await client.sendText(chatId, 'Link added successfully to friendly links!');
          } else {
            await client.sendText(chatId, 'Error fetching time. Link not added.');
          }
        } else {
          await client.sendText(
            chatId,
            "Please check the URL and add only Twitter URLs starting with 'https://x.com/'."
          );
        }
      } else if (body.startsWith('/report')) {
        const link = body.substring(8).trim();
        const linkCategory = 'enemy'; // Report links go to 'enemy' category
        if (isValidTwitterLink(link)) {
          const timestamp = await getCurrentTime();
          if (timestamp) {
            addLinkToJSON(link, timestamp, linkCategory, chatId, client);
            await client.sendText(chatId, 'Links  successfully added to enemy links!');
          } else {
            await client.sendText(chatId, 'Error fetching time. Link not reported.');
          }
        } else {
          await client.sendText(
            chatId,
            "Please check the URL and report only Twitter URLs starting with 'https://x.com/'."
          );
        }
      } else if (body === '/links') {
        // Ask the user which category to get links from
        await client.sendText(
          chatId,
          'Choose the category to get links from:\n1. Friendly Links\n2. Enemy Links'
        );

        // Listen for user's category choice
        client.onMessage(async (choiceMessage) => {
          if (choiceMessage.body === '1') {
            const links = getAllLinksFromJSON('friendly');
            await client.sendText(chatId,'Friendly links:' )
            await sendLinksInGroupsOf8(client, chatId, links);
          } else if (choiceMessage.body === '2') {
            const links = getAllLinksFromJSON('enemy');
            await client.sendText(chatId,'Report links:' )
            await sendLinksInGroupsOf8(client, chatId, links);
          }
        });
      }
    }
  });
}

function isValidTwitterLink(link) {
  // Check if the link is a valid Twitter link starting with 'https://x.com/twitter'
  return link.startsWith('https://x.com/');
}

async function getCurrentTime() {
  try {
    const response = await axios.get('http://worldtimeapi.org/api/timezone/Asia/Kolkata');
    const { datetime } = response.data;
    return datetime;
  } catch (error) {
    console.error('Error fetching time:', error);
    return null;
  }
}

function addLinkToJSON(url, timestamp, category, chatId, client) {
    // Determine the appropriate JSON file based on the category
    const linksFile = category === 'friendly' ? friendlyLinksFile : enemyLinksFile;
  
    // Read the existing links from the current links file
    if (!fs.existsSync(linksDirectory)) {
      fs.mkdirSync(linksDirectory);
    }
  
    if (fs.existsSync(linksFile)) {
      currentLinks = JSON.parse(fs.readFileSync(linksFile, 'utf8'));
    }
  
    // Check if the link already exists
    const existingLink = currentLinks.find((linkObj) => linkObj.url === url);
    if (existingLink) {
      // Link already exists, notify the user
      const message = `Link '${url}' is already in the list (Added on ${existingLink.timestamp}).`;
      client.sendText(chatId, message);
      return; // Return here to prevent adding duplicate links
    }
  
    // Add the new link with its timestamp
    currentLinks.push({ url, timestamp });
  
    // Write all links back to the appropriate JSON file
    fs.writeFileSync(linksFile, JSON.stringify(currentLinks, null, 2), 'utf8');
  
    // Send the "Link added successfully" message
    const successMessage = 'Link added successfully!';
    client.sendText(chatId, successMessage);
  }
  


function getAllLinksFromJSON(category) {
  // Determine the appropriate JSON file based on the category
  const linksFile = category === 'friendly' ? friendlyLinksFile : enemyLinksFile;

  // Read and return all links from the selected links file
  if (fs.existsSync(linksFile)) {
    return JSON.parse(fs.readFileSync(linksFile, 'utf8'));
  }
  return [];
}

function sendLinksInGroupsOf8(client, chatId, links) {
  // Send links in groups of 8 per message
  const linkChunks = chunkArray(links, 8);
  for (const chunk of linkChunks) {
    const formattedLinks = chunk
      .map((link) => `${link.url} (Added on ${link.timestamp})`)
      .join('\n');
    client.sendText(chatId, `Here are the links:\n\n${formattedLinks}`);
  }
}

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
