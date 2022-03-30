// This program reads and writes to Aquarium.json

const fs = require("node:fs");
const readline = require("node:readline");

function Player(IGN, userID, nbAcc) {
    this.IGN = IGN,
    this.userID = userID,
    this.nbAcc = nbAcc
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = prompt => {
    return new Promise((resolve, reject) => {
      rl.question(prompt, resolve)
    })
};

(async () => {
    const database = [];
    const nbPlayers = await question("How many players in the clan?");
    for (let i = 0; i < nbPlayers; ++i) {

        const IGNAnswer = await question("What is the IGN?\n");
        
        const userIDAnswer = await question("What is their Discord ID?\n");

        const nbAcc = parseInt(await question("How many accounts do they have?\n"));
        
        const newPlayer = new Player(IGNAnswer, userIDAnswer, nbAcc);

        database.push(newPlayer);

        console.log(`Added ${newPlayer.IGN} with Discord ID ${newPlayer.userID} with ${newPlayer.nbAcc} account(s)\n`);
    }
    rl.close()
    fs.writeFile('database/Aquarium.json', JSON.stringify(database, null, 4), (err) => {
        if (err) {
            console.log(`Error writing file: ${err}`);
        }
    })
}) ()