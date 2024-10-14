const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ComponentType } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('racing_data.db');
const { token } = require("./config.json")
const { Pagination } =  require('pagination.js');


client.on('ready', () => {
    // Executes when the Discord client is ready.
    console.log(`Logged in as ${client.user.tag}`);
    const logChannel = client.channels.cache.get('1210926663978983484');
    logChannel.send("Gentlemen Start Your Engines!");
});

client.on('messageCreate', async function(message){
    
    // Handles Discord bot commands for storing, displaying and editing racing lap times.
    if (message.author.bot) return;
    
    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if(command === '!store') {
        const inputData = args.join(' ');
        const [car, track, lapTime, category] = inputData.split('|').map(item => item.trim());
        
        if(!car || !track || !lapTime) {
            message.channel.send(`${message.author} Invalid input format! Please use the format: TRACK | CAR | LAP_TIME | CATEGORY`);
            return;
        }
        
        const userId = message.author.id;
        
        db.run('INSERT INTO racing_data (user_id, track, car, lap_time, category) VALUES (?, ?, ?, ?, ?)', [userId, car, track, lapTime, category || "Default"], (err) => {
            // Executes an SQL query to insert data into a database table.
            if(err) {
                console.error('Error storing data:', err)
                return;
            }
        });
        
        message.channel.send(`${message.author} Lap time stored successfully! :)`);
    }

    if (command === '!show') {
            
        const userId = message.author.id;
        db.all('SELECT * FROM racing_data WHERE user_id = ? ORDER BY track, lap_time', [userId], async (err, rows) => {
            // Executes a SQL query to retrieve data from a database.
            if (err) {
                console.error('Error retrieving data', err);
                return;
            }
	    
	    const pageSize = 1;
	    const pageCount = Math.ceil(rows.length / pageSize);
	    let currentPage = 0;

	    const embeds = rows.map(row => {
        // Builds an embed for each row in the data.
        return new EmbedBuilder()
		    	.addFields({ name: `Lap Times for:`, value: `${message.author}` },
			          { name: `Id:`, value: `${row.id}` },
		    	          { name: `Track:`, value: `${row.track}` },
		                  { name: `Car:`, value: `${row.car}` },
		    	          { name: `Lap Time:`, value: `${row.lap_time}` },
				  { name: `Category:`, value: `${row.category}` })
	    });

	    
	    const messageInstance = await message.channel.send({ embeds: [embeds[currentPage]], components: [createButtons(currentPage, pageCount)] });
	    
	    const collector = messageInstance.createMessageComponentCollector({ componentType: ComponentType.Button });
	    collector.on('collect', async interaction => {    
        // Handles button clicks in a pagination system.
        // 
        // When a button click event is triggered, the function checks the button's custom
        // ID to determine whether it's a 'prev' or 'next' button.
        // 
        // Based on the button ID, it adjusts the current page number accordingly. If the
        // button is 'prev', it decrements the current page number if it's greater than 0.
        // If the button is 'next', it increments the current page number if it's less than
        // the total page count minus 1.
        // 
        // After adjusting the current page number, the function updates the interaction with
        // a new embed and a new set of buttons corresponding to the new page.
        if(interaction.customId === 'prev' && currentPage > 0) {
          currentPage = currentPage - 1;

        }else if(interaction.customId === 'next' && currentPage < pageCount - 1) {
          currentPage = currentPage + 1;
        }
        await interaction.update({ embeds: [embeds[currentPage]], components: [createButtons(currentPage, pageCount)] });    
      });
          collector.on('end', () => {
            // Triggers when a collector ends, editing a message.
            messageInstance.edit({ components: [] });
          });	
		    
        });
    }
	
  if (command === '!searchcar') {
    const userId = message.author.id;
    const inputData = args.join(' ');
        
    if(!inputData) {
      message.channel.send(`${message.author} Provide a car to search for`);
      return;
    }
        
    db.all('SELECT id, car, track, lap_time, category FROM racing_data WHERE car LIKE ? AND user_id = ?', [`%${inputData}%`, userId], (err, rows) => {
      // Executes a SQL query to retrieve racing data from a database.
      if(err) {
        console.error('Error fetching data');
        return;
      }
            
      if(rows.length === 0) {
        message.channel.send(`No times found for ${inputData}`)
        return;
      }
            
      const lapTimes = rows.map(row => `ID: ${row.id} | Car: ${row.car} | Track: ${row.track} | Time: ${row.lap_time} | Category: ${row.category}`).join('\n');
      message.channel.send(`${message.author}\nLap Times for:\n${lapTimes}`)
    });
  }

  if (command === '!searchcategory') {
    const userId = message.author.id;
    const inputData = args.join(' ');
        
    if(!inputData) {
      message.channel.send(`${message.author} Provide a category to search for`);
      return;
    }
        
    db.all('SELECT id, car, track, lap_time, category FROM racing_data WHERE category LIKE ? AND user_id = ?', [`%${inputData}%`, userId], (err, rows) => {
      // Fetches database data based on user input and category.
      if(err) {
        console.error('Error fetching data');
        return;
      }

      if(rows.length === 0) {
        message.channel.send(`No times found for ${inputData}`)
        return;
      }
            
      const lapTimes = rows.map(row => `ID: ${row.id} | Car: ${row.car} | Track: ${row.track} | Time: ${row.lap_time} | Category: ${row.category}`).join('\n');
      message.channel.send(`${message.author}\nLap Times for:\n${lapTimes}`)
    });
  }

  if (command === '!searchtrack') {
    const userId = message.author.id;
    const inputData = args.join(' ');
        
    if(!inputData) {
      message.channel.send(`${message.author} Provide a track to search for`);
      return;
    }
        
    db.all('SELECT id, car, track, lap_time, category FROM racing_data WHERE track LIKE ? AND user_id = ?', [`%${inputData}%`, userId], (err, rows) => {
      // Executes a SQL query to retrieve racing data from a database.
      if(err) {
        console.error('Error fetching data');
        return;
      }
            
      if(rows.length === 0) {
        message.channel.send(`No times found for ${inputData}`)
        return;
      }
            
      const lapTimes = rows.map(row => `ID: ${row.id} | Car: ${row.car} | Track: ${row.track} | Time: ${row.lap_time} | Category: ${row.category}`).join('\n');
      message.channel.send(`${message.author}\nLap Times for:\n${lapTimes}`)
    });
  }

  if (command == "!edittime") {
    const userId = message.author.id;
    const inputData = args.join(' ');
    const [ID, time] = inputData.split(' ').map(item => item.trim());

    if(!inputData) {
      message.channel.send(`${message.author} Provide an ID to edit`);
      return;
    }

    db.run('UPDATE racing_data SET lap_time = ? WHERE id = ? and user_id = ?', [time, ID, userId], (err) => {
      // Executes an SQL UPDATE query.
      if(err) {
        console.error('Error editing data data:', err)
        return;
      }

      message.channel.send(`${message.author} Successfully updated lap time.`)
    });
  }

  if (command == "!editcar") {
    const userId = message.author.id;
    const inputData = args.join(' ');
    const [ID, car] = inputData.split('|').map(item => item.trim());

    if(!inputData) {
      message.channel.send(`${message.author} Provide an ID to edit`);
      return;
    }

    db.run('UPDATE racing_data SET car = ? WHERE id = ? and user_id = ?', [car, ID, userId], (err) => {
      // Executes an SQL UPDATE query on a database.
      if(err) {
        console.error('Error editing data data:', err)
        return;
      }

      message.channel.send(`${message.author} Successfully updated car name.`)
    });
  }

  if (command == "!edittrack") {
    const userId = message.author.id;
    const inputData = args.join(' ');
    const [ID, track] = inputData.split('|').map(item => item.trim());

    if(!inputData) {
      message.channel.send(`${message.author} Provide an ID to edit`);
      return;
    }

    db.run('UPDATE racing_data SET track = ? WHERE id = ? and user_id = ?', [track, ID, userId], (err) => {
      // Executes a SQL UPDATE query, updating the 'track' field in the 'racing_data' table.
      if(err) {
        console.error('Error editing data data:', err)
        return;
      }

      message.channel.send(`${message.author} Successfully updated track name.`)
    });
  }

  if (command == "!editcategory") {
    const userId = message.author.id;
    const inputData = args.join(' ');
    const [ID, category] = inputData.split('|').map(item => item.trim());

    if(!inputData) {
      message.channel.send(`${message.author} Provide an ID to edit`);
      return;
    }

    db.run('UPDATE racing_data SET category = ? WHERE id = ? and user_id = ?', [category, ID, userId], (err) => {
      // Executes an SQL query to update a database.
      if(err) {
        console.error('Error editing data data:', err)
        return;
      }

      message.channel.send(`${message.author} Successfully updated category.`)
    });
  }
  

  if (command === '!delete') {
    if(!args[0]) {
      message.channel.send(`${message.author} Provide an Lap ID to delete!`);
      return;
    }

    const id = parseInt(args[0])
    const userId = message.author.id;

    db.get('SELECT user_id FROM racing_data WHERE id = ?', [id], (err, row) => {
      // Fetches data from a database and deletes it if it matches certain conditions.
      if(err) {
        console.error('Error fetching data');
        return;
      }
      if(!row) {
        message.channel.send(`${message.author} Entry with ID ${id} not found!`);
      }else if(row.user_id !== userId) {
        message.channel.send(`${message.author} This time is not yours try again!`);
      }else {
        db.run('DELETE FROM racing_data WHERE id = ?', [id], (err) => {
          // Executes a database query to delete data.
          if(err) {
            console.error("Error Deleting Data");
            return;
          }
                    
                    
          message.channel.send(`${message.author} Lap at ID ${id} deleted successfully!`);
                    
        });
      }
    })
  }
    
    
});

db.serialize(() => {
  // Executes a SQL query to create a table in a database.
  db.run("CREATE TABLE IF NOT EXISTS racing_data (id INTEGER PRIMARY KEY, user_id TEXT, track TEXT, car TEXT, lap_time TEXT, \"category\" text DEFAULT 'Default')")
});
client.login(token);

/**
 * @description Generates a Discord action row with two buttons, 'Previous' and 'Next',
 * for navigating through pages. The buttons are disabled when the current page is
 * the first or last page, respectively.
 *
 * @param {number} currentPage - Indicating the current page number being displayed.
 *
 * @param {number} pageCount - Used to determine the maximum page number for pagination
 * buttons.
 *
 * @returns {ActionRowBuilder[]} An ActionRowBuilder object containing two ButtonBuilder
 * objects, representing the "Previous" and "Next" buttons.
 */
function createButtons(currentPage, pageCount) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('Previous')
      .setStyle('Primary')
      .setDisabled(currentPage === 0),
      new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setStyle('Primary')
      .setDisabled(currentPage === pageCount - 1)
    );
  return row;
}
