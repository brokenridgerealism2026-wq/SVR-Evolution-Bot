//==================================================//
//                    IMPORTS                       //
//==================================================//
require('dotenv').config();
const { google } = require('googleapis');
const cron = require('node-cron');
const {
    Client,
    GatewayIntentBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    Partials
} = require('discord.js');

//==================================================//
//                  CLIENT SETUP                    //
//==================================================//

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

//==================================================//
//             GOOGLE SHEETS HELPERS                //
//==================================================//

async function appendSubmissionToSheet(data) {
    const credentials = process.env.GOOGLE_CREDENTIALS_JSON
    ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
    : require('./google-credentials.json');

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SHEET_ID,
        range: 'Submissions!A:J',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[
    new Date().toLocaleString(),
    data.discordId,
    data.displayName,
    data.species,
    data.evolution,
    data.evidence,
    data.characterSheet,
    data.status,
    data.reviewedBy,
    data.rejectionReason || ''
]]
        }
    });
}

async function getSpeciesList() {

    const credentials = process.env.GOOGLE_CREDENTIALS_JSON
        ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
        : require('./google-credentials.json');

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({
        version: 'v4',
        auth
    });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: 'AtAGlance!A:A'
    });

    const rows = response.data.values || [];

    return rows
        .slice(1)           // Skip header
        .map(row => row[0]) // First column only
        .filter(Boolean);
}

async function getSpeciesProfile(species) {

    const credentials = process.env.GOOGLE_CREDENTIALS_JSON
        ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
        : require('./google-credentials.json');

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({
        version: 'v4',
        auth
    });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: 'AtAGlance!A:R'
    });

    const rows = response.data.values || [];

    return rows
        .slice(1)
        .find(row =>
            row[0]?.toLowerCase() === species.toLowerCase()
        );
}

async function getOrphanSkins(species) {
    const credentials = process.env.GOOGLE_CREDENTIALS_JSON
        ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
        : require('./google-credentials.json');

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: 'OrphanSkins!A:C'
    });

    const rows = response.data.values || [];

    return rows.slice(1).filter(row =>
        row[0]?.toLowerCase() === species.toLowerCase()
    );
}

async function getLeaderboardFromSheet() {
    const credentials = process.env.GOOGLE_CREDENTIALS_JSON
    ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
    : require('./google-credentials.json');

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: "'Submissions'!A:J"
    });

    const rows = response.data.values || [];

    const counts = {};

    // skip header row
    for (const row of rows.slice(1)) {
        const discordId = row[1];
        const displayName = row[2];
        const status = row[7];

        if (status === 'Accepted') {
            if (!counts[discordId]) {
                counts[discordId] = {
                    displayName: displayName,
                    count: 0
                };
            }

            counts[discordId].count++;
        }
    }

    return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
}

async function getApplicationQuestions() {
    const credentials = process.env.GOOGLE_CREDENTIALS_JSON
        ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
        : require('./google-credentials.json');

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: 'ApplicationQuestions!A:G'
    });

    const rows = response.data.values || [];

    return rows.slice(1).map(row => ({
        id: row[0],
        section: row[1],
        type: row[2],
        question: row[3],
        answer: row[4],
        required: row[5],
        active: row[6]
    }));
}

async function addPlayerToRegistry(data) {
    const credentials = process.env.GOOGLE_CREDENTIALS_JSON
        ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
        : require('./google-credentials.json');

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SHEET_ID,
        range: 'PlayerRegistry!A1:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[
                data.discordUsername,
                data.discordId,
                data.alderonId,
                data.alderonIgn,
                data.approvedOn,
                data.approvedBy
            ]]
        }
    });
}
//======================//
// Application Sessions //
//======================//

const applicationSessions = new Map();
const pendingApplications = new Map();
const processedDmMessages = new Set();

const OPTIONAL_QUESTION_COUNT = 10;

//======================//
// Test Questions       //
//======================//

const demoQuestions = [
    {
        section: 'Discord Information',
        question: 'What is your Discord Name?'
    },
    {
        section: 'Discord Information',
        question: 'What is your Discord ID? (Right click your name and select "Copy ID")'
    }
];

//==================================================//
//               INTERACTION HANDLER                //
//==================================================//

client.on('interactionCreate', async interaction => {

    if (interaction.isAutocomplete()) {

        if (interaction.commandName !== 'ataglance')
            return;

        const focused = interaction.options.getFocused();

        const species = await getSpeciesList();

        const filtered = species
            .filter(s =>
                s.toLowerCase().includes(focused.toLowerCase())
            )
            .slice(0, 25);

        await interaction.respond(
            filtered.map(s => ({
                name: s,
                value: s
            }))
        );

        return;
    }

//======================//
// DM Message Handler   //
//======================//

client.on('messageCreate', async message => {

    if (message.author.bot) return;
    if (message.guild) return;

    if (processedDmMessages.has(message.id)) return;
    processedDmMessages.add(message.id);

    const session = applicationSessions.get(message.author.id);

    if (!session) return;

    const question = session.questions[session.currentQuestion];

    session.answers.push({
        section: question.section,
        question: question.question,
        applicantAnswer: message.content,
        expectedAnswer: question.answer || 'Staff review required',
        required: question.required || 'No',
        type: question.type || 'Short'
    });

    session.currentQuestion++;

    if (session.currentQuestion >= session.questions.length) {
    const reviewChannel = await client.channels.fetch(process.env.APPLICATION_REVIEW_CHANNEL_ID);

    const submittedAt = new Date();

    const applicationEmbed = new EmbedBuilder()
    .setColor(0xD6A84F)
    .setTitle('<:Meteorite:1504809803791335517> Silent Valley Application <:Meteorite:1504809803791335517>')
    .setDescription(
        `### Applicant File\n\n` +
        `👤 **Applicant:** <@${session.applicant.id}>\n` +
        `🏷️ **Username:** ${session.applicant.username}\n` +
        `🆔 **Discord ID:** ${session.applicant.id}\n\n` +
        `🕒 **Started:** ${session.startedAt.toLocaleString()}\n` +
        `📨 **Submitted:** ${submittedAt.toLocaleString()}\n` +
        `📋 **Questions Answered:** ${session.answers.length}`
    )
    .setFooter({
        text: 'Silent Valley Office • Pending Staff Review'
    })
    .setTimestamp();

    for (const [index, entry] of session.answers.entries()) {

    applicationEmbed.addFields({
        name: `${index + 1}. ${entry.question}`.slice(0, 256),
        value:
            `📁 **Section:** ${entry.section}\n\n` +
            `📝 **Applicant Response:**\n${entry.applicantAnswer}\n\n` +
            `📌 **Answer Reference:**\n${entry.expectedAnswer}`,
        inline: false
    });

}

    const applicationButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId(`applicationAccept_${session.applicant.id}`)
        .setLabel('Accept Application')
        .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
        .setCustomId(`applicationDeny_${session.applicant.id}`)
        .setLabel('Deny Application')
        .setStyle(ButtonStyle.Danger)
);

    await reviewChannel.send({
        embeds: [applicationEmbed],
        components: [applicationButtons]
});

    pendingApplications.set(
        session.applicant.id,
        session
);

    applicationSessions.delete(message.author.id);

    await message.reply(
        '✅ **Application Received**\n\n' +
        'Your entrance examination has been submitted to the Silent Valley staff team for review.'
    );

    return;
}

    const nextQuestion = session.questions[session.currentQuestion];

    await message.reply(
        `✅ Response added to your application!\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `<:Meteorite:1504809803791335517> **Silent Valley Office** <:Meteorite:1504809803791335517>\n\n` +
        `📋 Question ${session.currentQuestion + 1} of ${session.questions.length}\n\n` +
        `📁 **${nextQuestion.section}**\n\n` +
        `❓ ${nextQuestion.question}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Reply with your answer below.`
    );

});

//==================================================//
//                   /AtAGlance                     //
//==================================================/
if (interaction.commandName === 'ataglance') {
    await interaction.deferReply();

    const species = interaction.options.getString('species');
    const profile = await getSpeciesProfile(species);

    if (!profile) {
        return interaction.editReply({
            content: `No field guide entry found for **${species}**.`
        });
    }

    const profileLink = profile[1] || '';
    const imageUrl = profile[2] || '';
    const embedColor = profile[3] || '#D6A84F';

    const diet = profile[4] || 'Not listed';
    const tier = profile[5] || 'Not listed';
    const activity = profile[6] || 'Not listed';

    const maleDimorphism = profile[7] || 'Not listed';
    const femaleDimorphism = profile[8] || 'Not listed';

    const habitats = profile[9] || 'Not listed';
    const nestingHabitats = profile[10] || 'Not listed';

    const spring = profile[11] || '-';
    const summer = profile[12] || '-';
    const autumn = profile[13] || '-';
    const winter = profile[14] || '-';

    const grouping = profile[15] || 'Not listed';
    const engagement = profile[16] || 'Not listed';

    const rangers = profile[17] || 'Not listed';

    const profileEmbed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`🧬 ${species}`)
    .setDescription(
        `🍽️ **${diet}** • 📶 **${tier}** • ⏰ **${activity}**`
    )
    .addFields(
{
    name: '<:Meteorite:1504809803791335517> ━━━━━━━━━━━━━━━━━━━ <:Meteorite:1504809803791335517>',
    value: '\u200B',
    inline: false
},
        {
            name: '♂️ Male',
            value: maleDimorphism,
            inline: true
        },
        {
            name: '♀️ Female',
            value: femaleDimorphism,
            inline: true
        },
        {
            name: '\u200B',
            value: '\u200B',
            inline: true
        },
{
    name: '<:Meteorite:1504809803791335517> ━━━━━━━━━━━━━━━━━━━ <:Meteorite:1504809803791335517>',
    value: '\u200B',
    inline: false
},
        {
            name: '🌍 Habitats',
            value: habitats,
            inline: true
        },
        {
            name: '🪺 Nesting Habitats',
            value: nestingHabitats,
            inline: true
        },
        {
            name: ' Seasonal Egg Counts ',
            value:
            `🌸 **Spring:** ${spring}
            ☀️ **Summer:** ${summer}
            🍂 **Autumn:** ${autumn}
            ❄️ **Winter:** ${winter}`,
            inline: false
        },
{
    name: '<:Meteorite:1504809803791335517> ━━━━━━━━━━━━━━━━━━━ <:Meteorite:1504809803791335517>',
    value: '\u200B',
    inline: false
},
        {
            name: '👥 Grouping Limits',
            value: grouping,
            inline: true
        },
        {
            name: '⚔️ Engagement Limits',
            value: engagement,
            inline: true
        },
        {
            name: '\u200B',
            value: '\u200B',
            inline: true
        },    )
    .setFooter({
        text: 'Silent Valley Field Guide'
    })
    .setTimestamp();

if (imageUrl) {
    profileEmbed.setImage(imageUrl);
}

const components = [];

if (profileLink) {
    const profileButton = new ButtonBuilder()
        .setLabel('📖 View Full Profile')
        .setStyle(ButtonStyle.Link)
        .setURL(profileLink);

    const row = new ActionRowBuilder()
        .addComponents(profileButton);

    components.push(row);
}

await interaction.editReply({
    embeds: [profileEmbed],
    components
});

   }

//==================================================//
//                      /Orphan                     //
//==================================================//

if (interaction.commandName === 'orphan') {

    await interaction.deferReply();

    const species = interaction.options.getString('species');

    const rows = await getOrphanSkins(species);

    if (rows.length === 0) {
        return interaction.editReply({
            content: `No skins found for **${species}**.`
        });
    }

    // Build weighted skin pool
    const skinPool = [];

    for (const row of rows) {

        const skin = row[1];
        const weight = Number(row[2]) || 1;

        for (let i = 0; i < weight; i++) {
            skinPool.push(skin);
        }
    }

    // Roll dominant skin
        const skin =
        skinPool[Math.floor(Math.random() * skinPool.length)];

    // Roll 1 or 2 recessive skins from unique remaining skins
        const uniqueSkins = [...new Set(skinPool)];

        const recessivePool = uniqueSkins.filter(
        possibleSkin => possibleSkin !== skin
);

        let recessiveSkins = [];

if (recessivePool.length > 0) {
    const recessiveCount = recessivePool.length === 1
        ? 1
        : Math.floor(Math.random() * 2) + 1; // 1 or 2

    while (recessiveSkins.length < recessiveCount) {
        const randomSkin = recessivePool[
            Math.floor(Math.random() * recessivePool.length)
        ];

        if (!recessiveSkins.includes(randomSkin)) {
            recessiveSkins.push(randomSkin);
        }
    }
}
    // Roll pattern
    const pattern =
        Math.floor(Math.random() * 3) + 1;

    // Roll 6 colors (5 zones + eye color)
    const colors = Array.from(
        { length: 6 },
        () => Math.floor(Math.random() * 5) + 1
    ).join('');

    const orphanEmbed = new EmbedBuilder()
        .setColor(0xD6A84F)
        .setTitle('🥚 Orphan Genetics')
        .setDescription('⚠️ While this does give you genetics for your orphan please make sure that you are adhering to species dimorphism requirements! This may mean that you have to deviate slightly from what the bot gives you.⚠️  ')
        .addFields(
            {
                name: 'Species',
                value: species,
                inline: false
            },
            {
                name: 'Dominant Skin',
                value: `• ${skin}`,
                inline: false
            },
            {
                name: 'Recessive Skins',
                value: recessiveSkins.length > 0
                    ? recessiveSkins.map(skin => `• ${skin}`).join('\n')
                    : 'None',
                inline: false
            },
            {
                name: 'Pattern & Colors',
                value: `${pattern} (${colors})`,
                inline: false
            }
        )
        .setImage('https://cdn.discordapp.com/attachments/1481648385076236442/1519501842835439626/PathOfTitans-Win64-Shipping_Screenshot_2026.06.24_-_19.32.31.16.png?ex=6a3dc9de&is=6a3c785e&hm=49640dd445752d68755e18a3e846f19d862c0cb41725ff5fe0ee9bd1e443d8d2'
        )
        .setFooter({
            text: 'Silent Valley Office thanks you for your visit'
        })
        .setTimestamp();

    await interaction.editReply({
        embeds: [orphanEmbed]
    });

}

//==================================================//
//                /SkinRandomizer                   //
//==================================================//

if (interaction.commandName === 'skinrandomizer') {

    const motherDominant = interaction.options.getString('mother_dominant');
    const motherRecessive1 = interaction.options.getString('mother_recessive_1');
    const motherRecessive2 = interaction.options.getString('mother_recessive_2');
    const motherRecessive3 = interaction.options.getString('mother_recessive_3');

    const fatherDominant = interaction.options.getString('father_dominant');
    const fatherRecessive1 = interaction.options.getString('father_recessive_1');
    const fatherRecessive2 = interaction.options.getString('father_recessive_2');
    const fatherRecessive3 = interaction.options.getString('father_recessive_3');

    const motherEyes = interaction.options.getString('mother_eyes');
    const fatherEyes = interaction.options.getString('father_eyes');

    // Build weighted skin pool
    const skinPool = [
        motherDominant,
        motherDominant,
        motherRecessive1,
        motherRecessive2,
        motherRecessive3,

        fatherDominant,
        fatherDominant,
        fatherRecessive1,
        fatherRecessive2,
        fatherRecessive3
    ].filter(Boolean);

    // Roll dominant skin
    const dominantSkin =
        skinPool[Math.floor(Math.random() * skinPool.length)];

    // Roll recessive skins
    const uniqueSkinPool = [...new Set(skinPool)];

    const recessivePool = uniqueSkinPool.filter(
        skin => skin !== dominantSkin
    );

    let recessiveOne = 'None';
    let recessiveTwo = 'None';

    if (recessivePool.length >= 1) {
    recessiveOne = recessivePool[Math.floor(Math.random() * recessivePool.length)];
    }

    if (recessivePool.length >= 2) {
    const recessiveTwoPool = recessivePool.filter(
        skin => skin !== recessiveOne
    );

    recessiveTwo = recessiveTwoPool[Math.floor(Math.random() * recessiveTwoPool.length)];
    }

    // Roll eye color
    const eyeColor =
        [motherEyes, fatherEyes][Math.floor(Math.random() * 2)];

    // Roll pattern
    const pattern = Math.floor(Math.random() * 3) + 1;

    // Roll color zones
    const colorZones = Array.from(
        { length: 5 },
        () => Math.floor(Math.random() * 5) + 1
    ).join('');

    const geneticsEmbed = new EmbedBuilder()
    .setColor(0xD6A84F)
    .setTitle('<:Meteorite:1504809803791335517> Hatchling Genetics <:Meteorite:1504809803791335517>')
    .setDescription('──────⋆｡ﾟ☄｡⋆｡ ﾟ☾ ﾟ｡⋆──────')
    .addFields(
        {
            name: '🧬 Dominant Skin',
            value: dominantSkin,
            inline: false
        },
        {
            name: '🧬 Recessive Skins',
            value: `• ${recessiveOne}\n• ${recessiveTwo}`,
            inline: false
        },
        {
            name: '🎨 Pattern & Colors',
            value: `• ${pattern} (${colorZones})`,
            inline: true
        },
        {
            name: '🎨 Eye Color',
            value: `• ${eyeColor}`,
            inline: true
        }
    )
    .setFooter({
        text: 'Silent Valley Genetics'
    })
    .setTimestamp();

await interaction.reply({
    embeds: [geneticsEmbed]
});
}

//====================//
//    /Leaderboard    //
//===================//
if (interaction.commandName === 'leaderboard') {
    await interaction.deferReply();

    const leaderboard = await getLeaderboardFromSheet();

    if (leaderboard.length === 0) {
        return interaction.editReply({
    content: 'No accepted submissions have been recorded yet.'
});
    }

    const leaderboardText = leaderboard
        .map((entry, index) => {
            const medals = ['<:GoldComet:1518241418269823186>', '<:SilverComet:1518241462137913426>', '<:BronzeComet:1518241523483807994>'];
            const rank = medals[index] || `${index + 1}.`;

            return `${rank} ${entry.displayName} — ${entry.count}`;
        })
        .join('\n');

    return interaction.editReply({
    content:
        `<:Meteorite:1504809803791335517> **Evolution Leaderboard**\n` +
        `───────────⋆｡ﾟ☄｡⋆｡ ﾟ☾ ﾟ｡⋆───────────\n\n` +
        leaderboardText
});
}

//==================//
//    /Standing     //
//==================//
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'standing') {

            const modal = new ModalBuilder()
                .setCustomId('evolutionSubmitModal')
                .setTitle('Dinosaur Evolution Submission');

            const speciesInput = new TextInputBuilder()
                .setCustomId('species')
                .setLabel('Dinosaur Species')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const evolutionInput = new TextInputBuilder()
                .setCustomId('evolution')
                .setLabel('Evolutionary Standing')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const evidenceInput = new TextInputBuilder()
                .setCustomId('evidence')
                .setLabel('Video or Screenshot Message Link')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const sheetInput = new TextInputBuilder()
                .setCustomId('characterSheet')
                .setLabel('Dinosaur Character Sheet Link')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(speciesInput),
                new ActionRowBuilder().addComponents(evolutionInput),
                new ActionRowBuilder().addComponents(evidenceInput),
                new ActionRowBuilder().addComponents(sheetInput)
            );

            await interaction.showModal(modal);
        }
    }

// When user submits the form //
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'simpleApplication') {

    const name = interaction.fields.getTextInputValue('discordName');

    await interaction.reply({
        content: `Success! You entered **${name}**`,
        flags: MessageFlags.Ephemeral
    });

    return;
}
    if (interaction.customId === 'evolutionSubmitModal') {

        const species = interaction.fields.getTextInputValue('species');
        const evolution = interaction.fields.getTextInputValue('evolution');
        const evidence = interaction.fields.getTextInputValue('evidence');
        const characterSheet = interaction.fields.getTextInputValue('characterSheet');

        const reviewChannel = await client.channels.fetch(process.env.REVIEW_CHANNEL_ID);

        const embed = new EmbedBuilder()
            .setTitle('<:Meteorite:1504809803791335517> New Evolution Submission <:Meteorite:1504809803791335517>')
            .setColor(0xD6A84F)
            .addFields(
                { name: 'Submitted By', value: `<@${interaction.user.id}>`, inline: false },
                { name: 'Display Name', value: interaction.member.displayName, inline: false },
                { name: 'Discord ID', value: interaction.user.id, inline: false },
                { name: 'Species', value: species, inline: false },
                { name: 'Evolutionary Standing', value: evolution, inline: false },
                { name: 'Evidence Link', value: evidence, inline: false },
                { name: 'Character Sheet', value: characterSheet, inline: false },
                { name: 'Status', value: 'Pending Review', inline: false }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`accept_${interaction.user.id}`)
                .setLabel('Accepted')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(`deny_${interaction.user.id}`)
                .setLabel('Not Accepted')
                .setStyle(ButtonStyle.Danger)
        );

        await reviewChannel.send({
            embeds: [embed],
            components: [buttons]
        });

        await interaction.reply({
            content: 'Your evolution submission has been sent for staff review!',
            flags: MessageFlags.Ephemeral
        });
    }

   if (interaction.customId.startsWith('denialReasonModal_')) {
    const submittedUserId = interaction.customId.split('_')[1];
    const denialReason = interaction.fields.getTextInputValue('denialReason');
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const message = interaction.message;
    const oldEmbed = message.embeds[0];
    const newEmbed = EmbedBuilder.from(oldEmbed);

    const deniedSpecies = oldEmbed.fields.find(f => f.name === 'Species')?.value || 'Unknown';
    const deniedEvolution = oldEmbed.fields.find(f => f.name === 'Evolutionary Standing')?.value || 'Unknown';
    const deniedDisplayName = oldEmbed.fields.find(f => f.name === 'Display Name')?.value || 'Unknown';
    const deniedCharacterSheet = oldEmbed.fields.find(f => f.name === 'Character Sheet')?.value || 'Unknown';
    const deniedEvidence = oldEmbed.fields.find(f => f.name === 'Evidence Link')?.value || 'Unknown';

    newEmbed
        .setColor(0xED4245)
        .setFields(
            oldEmbed.fields.filter(field =>
                field.name !== 'Status' &&
                field.name !== 'Rejection Reason'
            )
        )
        .addFields(
            {
                name: 'Status',
                value: `Not Accepted by <@${interaction.user.id}>`,
                inline: false
            },
            {
                name: 'Rejection Reason',
                value: denialReason,
                inline: false
            }
        );
try {
    await appendSubmissionToSheet({
        discordId: submittedUserId,
        displayName: deniedDisplayName,
        species: deniedSpecies,
        evolution: deniedEvolution,
        evidence: deniedEvidence,
        characterSheet: deniedCharacterSheet,
        status: 'Not Accepted',
        reviewedBy: interaction.user.tag,
        rejectionReason: denialReason
    });
} catch (error) {
     console.error('Failed to write to Google Sheets',error.message);
}
    try {
        const submittedUser = await client.users.fetch(submittedUserId);

        await submittedUser.send(
            `<:Meteorite:1504809803791335517> Your evolution submission was not accepted.\n\n` +
            `**Species:** ${deniedSpecies}\n` +
            `**Evolutionary Standing:** ${deniedEvolution}\n\n` +
            `**Reason:**\n${denialReason}\n\n` +
            `You may resubmit after correcting the issue.`
        );
    } catch (error) {
        console.log('Could not DM user:', error.message);
    }

    await message.edit({
        embeds: [newEmbed],
        components: []
    });

    await interaction.editReply({
        content: 'Submission marked as not accepted. The reason was logged and I attempted to DM the user.',
        flags: MessageFlags.Ephemeral
    });
}
}

//==================================================//
//                      /Apply                      //
//==================================================//

if (interaction.commandName === 'apply') {
    const applyEmbed = new EmbedBuilder()
        .setColor(0xD6A84F)
        .setTitle('<:Meteorite:1504809803791335517> Silent Valley Application <:Meteorite:1504809803791335517>')
        .setDescription(
            `Welcome to the Silent Valley application.\n\n` +
            `Click the button below to begin.`
        )
        .setFooter({ text: 'Silent Valley Service Desk' })
        .setTimestamp();

    const startButton = new ButtonBuilder()
        .setCustomId(`startSimpleApplication_${interaction.user.id}`)
        .setLabel('Begin Application')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(startButton);

    await interaction.reply({
        embeds: [applyEmbed],
        components: [row],
        flags: MessageFlags.Ephemeral
    });

    return;
}

//======================//
// Button Interactions  //
//======================//

if (interaction.isButton()) {

    //==============================//
    // Begin Application Button     //
    //==============================//

    if (interaction.customId.startsWith('startSimpleApplication_')) {
    const applicantId = interaction.customId.split('_')[1];

    if (interaction.user.id !== applicantId) {
        return interaction.reply({
            content: 'This application button is not for you.',
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.reply({
        content: '📬 Opening your application file...',
        flags: MessageFlags.Ephemeral
    });

    try {
    const sheetQuestions = await getApplicationQuestions();

    const activeQuestions = sheetQuestions.filter(q =>
    q.active?.toLowerCase() === 'yes'
    );

    const requiredQuestions = activeQuestions.filter(q =>
    q.required?.toLowerCase() === 'yes'
    );

    const optionalQuestions = activeQuestions.filter(q =>
    q.required?.toLowerCase() !== 'yes'
    );

    const shuffledOptional = optionalQuestions.sort(() => Math.random() - 0.5);

    const selectedOptional = shuffledOptional.slice(
    0,
    OPTIONAL_QUESTION_COUNT
    );

    const applicationQuestions = [
    ...requiredQuestions,
    ...selectedOptional
    ];
console.log(
    `Application built: ${requiredQuestions.length} required + ${selectedOptional.length} optional`
);

        applicationSessions.set(interaction.user.id, {
            startedAt: new Date(),
            currentQuestion: 0,
            questions: applicationQuestions,
            answers: [],
            applicant: {
                id: interaction.user.id,
                username: interaction.user.username,
                displayName: interaction.user.displayName,
                tag: interaction.user.tag
        }
});

        await interaction.user.send(
            `🌠 **Silent Valley Entrance Examination**

Welcome!

Thank you for applying to Silent Valley.

Let's begin!

━━━━━━━━━━━━━━━━━━━━━━`
        );

        const question = activeQuestions[0];

        await interaction.user.send(
            `━━━━━━━━━━━━━━━━━━━━━━

<:Meteorite:1504809803791335517> **Silent Valley Office** <:Meteorite:1504809803791335517>

📋 Question 1 of 1

📁 **${question.section}**

❓ ${question.question}

━━━━━━━━━━━━━━━━━━━━━━

Reply with your answer below.`
        );

        await interaction.editReply({
            content: "📬 I've sent you a DM to begin your application!"
        });

    } catch (error) {
        console.error('Application DM failed:', error);

        await interaction.editReply({
            content: "❌ I couldn't send you a DM.\n\nPlease enable Direct Messages from server members and try again."
        });
    }

    return;
}

//==============================//
// Application Review Buttons   //
//==============================//

if (interaction.customId.startsWith('applicationAccept_')) {
    const applicantId = interaction.customId.split('_')[1];

    const application = pendingApplications.get(applicantId);

    if (!application) {
        return interaction.reply({
            content: 'This application could not be found. It may have already been processed.',
            flags: MessageFlags.Ephemeral
        });
    }

    const discordUsername = application.answers.find(
        a => a.type === 'discord_username'
    )?.applicantAnswer || application.applicant.username;

    const alderonIgn = application.answers.find(
        a => a.type === 'alderon_ign'
    )?.applicantAnswer || 'Unknown';

    const alderonId = application.answers.find(
        a => a.type === 'alderon_id'
    )?.applicantAnswer || 'Unknown';

    const oldEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(oldEmbed)
        .setColor(0x57F287)
        .setFooter({
            text: `Silent Valley Office • Accepted by ${interaction.user.username}`
        });

    await addPlayerToRegistry({
        discordUsername,
        discordId: applicantId,
        alderonId,
        alderonIgn,
        approvedOn: new Date().toLocaleString(),
        approvedBy: interaction.user.username
    });

    const guild = interaction.guild;
    const member = await guild.members.fetch(applicantId);

    await member.roles.add(process.env.APPROVED_MEMBER_ROLE_ID);

    await interaction.update({
        embeds: [newEmbed],
        components: []
    });

    const applicant = await client.users.fetch(applicantId);

    await applicant.send(
        '✅ **Application Accepted**\n\n' +
        'Your Silent Valley application has been accepted!'
    ).catch(() => {});

        pendingApplications.delete(applicantId);

    return;
}

if (interaction.customId.startsWith('applicationDeny_')) {
    const applicantId = interaction.customId.split('_')[1];

    const oldEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(oldEmbed)
        .setColor(0xED4245)
        .setFooter({
            text: `Silent Valley Office • Denied by ${interaction.user.username}`
        });

    await interaction.update({
        embeds: [newEmbed],
        components: []
    });

    const applicant = await client.users.fetch(applicantId);

    await applicant.send(
        '❌ **Application Denied**\n\n' +
        'Your Silent Valley application was not accepted at this time.'
    ).catch(() => {});

    return;
}

    //==============================//
    // Evolution Review Buttons     //
    //==============================//

    const member = interaction.member;
    const allowedRoleIds = process.env.STAFF_ROLE_IDS.split(',');

    const hasAllowedRole = allowedRoleIds.some(roleId =>
        member.roles.cache.has(roleId)
    );

    if (!hasAllowedRole) {
        return interaction.reply({
            content: 'You do not have permission to review submissions.',
            flags: MessageFlags.Ephemeral
        });
    }

    const [action, submittedUserId] = interaction.customId.split('_');
    const oldEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(oldEmbed);

    if (action === 'accept') {
        newEmbed
            .setColor(0x57F287)
            .setFields(oldEmbed.fields.filter(field => field.name !== 'Status'))
            .addFields({
                name: 'Status',
                value: `Accepted by <@${interaction.user.id}>`,
                inline: false
            });

        await interaction.update({
            embeds: [newEmbed],
            components: []
        });

        return;
    }

    if (action === 'deny') {
        const denialModal = new ModalBuilder()
            .setCustomId(`denialReasonModal_${submittedUserId}`)
            .setTitle('Reason for Not Accepting');

        const reasonInput = new TextInputBuilder()
            .setCustomId('denialReason')
            .setLabel('Why was this submission not accepted?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        denialModal.addComponents(
            new ActionRowBuilder().addComponents(reasonInput)
        );

        await interaction.showModal(denialModal);
        return;
    }
}
});

//==================//
//   CRON JOBS     //
//=================//

cron.schedule('0 14 * * *', async () => {

    console.log('Posting daily leaderboard...');

    try {

        const leaderboard = await getLeaderboardFromSheet();

        if (leaderboard.length === 0) return;

        const leaderboardText = leaderboard
            .map((entry, index) => {

                const medals = ['<:GoldComet:1518241418269823186>', '<:SilverComet:1518241462137913426>', '<:BronzeComet:1518241523483807994>'];
                const rank = medals[index] || `${index + 1}.`;

                return `${rank} ${entry.displayName} — ${entry.count}`;
            })
            .join('\n');

        const channel = await client.channels.fetch(
            process.env.LEADERBOARD_CHANNEL_ID
        );

        await channel.send(
            `<:Meteorite:1504809803791335517> **Daily Evolution Leaderboard**\n\n${leaderboardText}`
        );

    } catch (error) {
        console.error(error);
    }
//=================//
//     LOGIN      //
//================//

});
client.login(process.env.DISCORD_TOKEN);