require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('standing')
        .setDescription('Submit a dinosaur evolution request for approval')
        .toJSON(),

    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show the top 10 members with the most accepted evolutionary standing submissions')
        .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Registering slash commands...');

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log('Slash commands registered successfully!');
    } catch (error) {
        console.error(error);
    }
})();