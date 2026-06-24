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

new SlashCommandBuilder()
    .setName('skinrandomizer')
    .setDescription('Roll hatchling genetics from parent skins and eye colors')
    .addStringOption(option =>
        option.setName('mother_dominant')
            .setDescription('Mother dominant skin - required')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('mother_recessive_1')
            .setDescription('Mother recessive skin 1 - required')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('father_dominant')
            .setDescription('Father dominant skin - required')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('father_recessive_1')
            .setDescription('Father recessive skin 1 - required')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('mother_eyes')
            .setDescription('Mother eye color - required')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('father_eyes')
            .setDescription('Father eye color - required')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('mother_recessive_2')
            .setDescription('Mother recessive skin 2')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('mother_recessive_3')
            .setDescription('Mother recessive skin 3')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('father_recessive_2')
            .setDescription('Father recessive skin 2')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('father_recessive_3')
            .setDescription('Father recessive skin 3')
            .setRequired(false))
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