const { create, Client } = require('@open-wa/wa-automate');
const fs = require('fs');
const axios = require('axios');

// Directory to store links files for different groups
const linksDirectory = './links/';

create().then((client) => start(client));

function start(client) {
  console.log('Bot is connected!');

  client.onMessage(async (message) => {
    if (message.body) {
      const body = message.body.toLowerCase().trim();
      const chatId = message.from;
      const groupId = message.chatId;

      // Create a links file for the group if it doesn't exist
      const groupLinksFile = `${linksDirectory}${groupId}.json`;
      if (!fs.existsSync(groupLinksFile)) {
        fs.writeFileSync(groupLinksFile, '[]', 'utf8');
      }

      if (body.startsWith('/add')) {
        const link = body.substring(5).trim();
        if (isValidTwitterLink(link)) {
          const timestamp = await getCurrentTime();
          if (timestamp) {
            addLinkToJSON(groupLinksFile, link, timestamp);
            await client.sendText(chatId, 'Link added successfully!');
          } else {
            await client.sendText(chatId, 'Error fetching time. Link not added.');
          }
        } else {
          await client.sendText(
            chatId,
            "Please check the URL and add only Twitter URLs starting with 'https://x.com/twitter'."
          );
        }
      } else if (body === '/links') {
        const links = getLinksFromJSON(groupLinksFile);
        if (links.length === 0) {
          await client.sendText(chatId, 'No links found.');
        } else {
          const formattedLinks = links
            .map((link) => `${link.url} (Added on ${link.timestamp})`)
            .join('\n');
          await client.sendText(chatId, `Here are the links:\n\n${formattedLinks}`);
        }
      }
    }
  });
}

function isValidTwitterLink(link) {
  // Check if the link is a valid Twitter link starting with 'https://x.com/twitter'
  return link.startsWith('https://x.com/twitter');
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

function addLinkToJSON(filename, url, timestamp) {
  // Read the existing links from the JSON file
  let links = [];
  if (fs.existsSync(filename)) {
    links = JSON.parse(fs.readFileSync(filename, 'utf8'));
  }

  // Add the new link with its timestamp
  links.push({ url, timestamp });

  // Write the updated links back to the JSON file
  fs.writeFileSync(filename, JSON.stringify(links, null, 2), 'utf8');
}

function getLinksFromJSON(filename) {
  // Read and return the links from the JSON file
  if (fs.existsSync(filename)) {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  }
  return [];
}
