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
    .setDescription('Roll Skin Genetics from your nest - DO NOT list mutated skin names')
    .addStringOption(option =>
        option.setName('mother_dominant')
            .setDescription('Mother dominant skin - Do not list mutated skin names')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('mother_recessive_1')
            .setDescription('Mother recessive skin 1 - Do not list mutated skin names')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('father_dominant')
            .setDescription('Father dominant skin - Do not list mutated skin names')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('father_recessive_1')
            .setDescription('Father recessive skin 1 - Do not list mutated skin names')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('mother_eyes')
            .setDescription('Mother eye color - Do not list mutated skin names')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('father_eyes')
            .setDescription('Father eye color - Do not list mutated skin names')
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

new SlashCommandBuilder()
    .setName('orphan')
    .setDescription('Hatch your Baby with predetermined Genetics - Mutated skins are not included')
    .addStringOption(option =>
        option.setName('species')
            .setDescription('Species name')
            .setRequired(true))
    .toJSON(),

new SlashCommandBuilder()
    .setName('ataglance')
    .setDescription('Shows the field guide for the requested species.')
    .addStringOption(option =>
        option.setName('species')
            .setDescription('Full species name')
            .setRequired(true)
            .setAutocomplete(true))
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