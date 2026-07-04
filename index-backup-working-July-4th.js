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
    ButtonStyle
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

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

// Slash command: /orphan
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

// Slash command: /skinrandomizer
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

// Slash command: /leaderboard
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

    // Slash command: /standing
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

    // When user submits the form
    if (interaction.isModalSubmit()) {
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
            ephemeral: true
        });
    }

   if (interaction.customId.startsWith('denialReasonModal_')) {
    const submittedUserId = interaction.customId.split('_')[1];
    const denialReason = interaction.fields.getTextInputValue('denialReason');
    
    await interaction.deferReply({ ephemeral: true });

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
        ephemeral: true
    });
}
}

    // Button clicks
    if (interaction.isButton()) {

        const member = interaction.member;

        const allowedRoleIds = process.env.STAFF_ROLE_IDS.split(',');

const hasAllowedRole = allowedRoleIds.some(roleId =>
    member.roles.cache.has(roleId)
);

if (!hasAllowedRole) {
            return interaction.reply({
                content: 'You do not have permission to review submissions.',
                ephemeral: true
            });
        }

        const [action, submittedUserId] = interaction.customId.split('_');

        const oldEmbed = interaction.message.embeds[0];

        const newEmbed = EmbedBuilder.from(oldEmbed);

        if (action === 'accept') {
            newEmbed
                .setColor(0x57F287)
                .setFields(
                    oldEmbed.fields.filter(field => field.name !== 'Status')
                )
                .addFields({
                    name: 'Status',
                    value: `Accepted by <@${interaction.user.id}>`,
                    inline: false
                });
try {
await appendSubmissionToSheet({
    discordId: submittedUserId,
    displayName: oldEmbed.fields.find(f => f.name === 'Display Name')?.value || 'Unknown',
    species: oldEmbed.fields.find(f => f.name === 'Species')?.value || 'Unknown',
    evolution: oldEmbed.fields.find(f => f.name === 'Evolutionary Standing')?.value || 'Unknown',
    evidence: oldEmbed.fields.find(f => f.name === 'Evidence Link')?.value || 'Unknown',
    characterSheet: oldEmbed.fields.find(f => f.name === 'Character Sheet')?.value || 'Unknown',
    status: 'Accepted',
    reviewedBy: interaction.user.tag
});
} catch (error) {
    console.error('Failed to write to Google Sheets:', error.message);
}
const acceptedSpecies = oldEmbed.fields.find(f => f.name === 'Species')?.value || 'Unknown';
const acceptedEvolution = oldEmbed.fields.find(f => f.name === 'Evolutionary Standing')?.value || 'Unknown';

try {
    const submittedUser = await client.users.fetch(submittedUserId);

    await submittedUser.send(
        `<:Meteorite:1504809803791335517> Your evolution submission was accepted!\n\n` +
        `**Species:** ${acceptedSpecies}\n` +
        `**Evolutionary Standing:** ${acceptedEvolution}\n\n` +
        `Congratulations! Your submission has been approved.`
    );
} catch (error) {
    console.log('Could not DM user:', error.message);
}
            await interaction.update({
                embeds: [newEmbed],
                components: []
            });
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
}
    }
});
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

});
client.login(process.env.DISCORD_TOKEN);