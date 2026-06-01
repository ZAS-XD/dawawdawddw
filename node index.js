const { Client, GatewayIntentBits, Events, ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');

const TOKEN = 'Hai salman';
const PREFIX = '.'; 

const DB_FILE = './database.json';

function loadDB() { 
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({})); 
    return JSON.parse(fs.readFileSync(DB_FILE)); 
}

function saveDB(data) { 
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); 
}

function getDBPlayer(db, userId) {
    if (!db[userId]) db[userId] = { wins: 0, losses: 0, coins: 0, inventory: { kacamata: 0, radar: 0, kopi: 0 } };
    if (!db[userId].inventory) db[userId].inventory = { kacamata: 0, radar: 0, kopi: 0 };
    return db[userId];
}

function processGameEnd(game, winTeam) {
    const db = loadDB();
    let rewardList = [];

    const impostorFaction = ['IMPOSTOR', 'HACKER', 'TRICKSTER', 'PROVOCATEUR', 'SWAPPER', 'SNIPER'];
    const neutralFaction = ['JOKER', 'COPYCAT'];

    game.players.forEach(p => {
        const pData = getDBPlayer(db, p);
        let isWin = false;
        let coins = 5; 
        const roleId = game.playerRoles[p].id;

        if (winTeam === 'JOKER' && roleId === 'JOKER') { isWin = true; coins = 150; }
        else if (winTeam === 'IMPOSTOR' && impostorFaction.includes(roleId)) { isWin = true; coins = 100; }
        else if (winTeam === 'CREWMATE' && !impostorFaction.includes(roleId) && !neutralFaction.includes(roleId)) { isWin = true; coins = 50; }

        if (isWin) pData.wins += 1;
        else pData.losses += 1;
        pData.coins += coins;

        rewardList.push(`> <@${p}> : ${isWin ? '🏆 Menang' : '💀 Kalah'} (+${coins} 🪙)`);
    });
    
    saveDB(db);
    return rewardList.join('\n');
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

let connection = null;
const activeGames = new Map(); 

function connectToChannel(channel) {
    connection = joinVoiceChannel({ 
        channelId: channel.id, 
        guildId: channel.guild.id, 
        adapterCreator: channel.guild.voiceAdapterCreator, 
        selfDeaf: true, 
        selfMute: true 
    });
    
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try { connection.destroy(); } catch (e) {}
        setTimeout(() => { connectToChannel(channel); }, 2000);
    });
}

process.on('unhandledRejection', err => {});
process.on('uncaughtException', err => {});

client.once(Events.ClientReady, async c => {
    console.log(`[SUKSES] Bot nyala sebagai ${c.user.tag}`);
    client.user.setActivity(`Ketik .help buat mabar!`, { type: ActivityType.Playing }); 
});

const ROLES = {
    IMPOSTOR_BASE: { id: 'IMPOSTOR', name: '🔪 Impostor', desc: 'Kamu tahu letak BOMB. Hasut Kru agar memotong kabel tersebut!' },
    HACKER: { id: 'HACKER', name: '💻 Hacker', desc: 'Rekan Impostor! Punya skill [Hack] untuk menggeser Bomb diam-diam (1x).' },
    TRICKSTER: { id: 'TRICKSTER', name: '🌪️ Pengacau', desc: 'Rekan Impostor! Punya skill [Acak] untuk merombak total antrian giliran (1x).' },
    PROVOCATEUR: { id: 'PROVOCATEUR', name: '🧨 Provokator', desc: 'Rekan Impostor! Punya skill [Paksa Potong] untuk memaksa pemain di giliran selanjutnya memotong kabel acak (1x).' },
    SWAPPER: { id: 'SWAPPER', name: '🔄 Swapper', desc: 'Rekan Impostor! Punya skill [Tukar Nasib] untuk menukar Role-mu dengan pemain acak (1x).' },
    SNIPER: { id: 'SNIPER', name: '🎯 Sniper', desc: 'Rekan Impostor! Punya skill [Tembak] untuk menghapus 1 pemain acak dari antrian bermain secara permanen (1x).' },
    
    JOKER: { id: 'JOKER', name: '🃏 Joker', desc: 'Tugasmu adalah MATI. Hasut Kru supaya kamu sendiri yang memotong BOMB!' },
    COPYCAT: { id: 'COPYCAT', name: '🤡 Peniru', desc: 'Netral! Punya skill [Tiru] untuk mengcopy Role pemain lain secara acak (1x).' },
    
    SEER: { id: 'SEER', name: '👁️ Peramal', desc: 'Kamu punya penerawangan 1 kabel yang 100% AMAN. Pandu Kru lain!' },
    DETECTIVE: { id: 'DETECTIVE', name: '🕵️ Detektif', desc: 'Insting Sheriff: Kamu dijamin tahu 1 orang yang pasti MUSUH.' },
    MECHANIC: { id: 'MECHANIC', name: '🔧 Mekanik', desc: 'Punya skill [Scan Kabel] untuk mengecek apakah 1 kabel acak itu aman/bomb (1x).' },
    MAYOR: { id: 'MAYOR', name: '🎖️ Walikota', desc: 'Kru VIP! Punya skill [Rebut Giliran] untuk mencuri giliran siapa saja (1x).' },
    SPY: { id: 'SPY', name: '🕵️‍♂️ Mata-Mata', desc: 'Kru Rahasia! Punya skill [Intai] untuk melihat role asli 1 pemain acak (1x).' },
    DEFUSER: { id: 'DEFUSER', name: '🛡️ Penjinak', desc: 'Kru Spesialis! Punya skill [Jinakkan] untuk otomatis memotong 1 kabel AMAN dari jarak jauh (1x).' },
    TINKERER: { id: 'TINKERER', name: '🛠️ Teknisi', desc: 'Kru Ahli! Punya skill [Bongkar] untuk mengumumkan 1 warna kabel AMAN secara publik ke chat (1x).' },
    CREWMATE: { id: 'CREWMATE', name: '🧑‍🚀 Spacecrew', desc: 'Kru biasa. Potong semua kabel aman dan hindari BOMB!' }
};

const CABLE_COLORS = [
    { id: 'Merah', emoji: '🔴', style: ButtonStyle.Danger }, { id: 'Biru', emoji: '🔵', style: ButtonStyle.Primary },
    { id: 'Hijau', emoji: '🟢', style: ButtonStyle.Success }, { id: 'Kuning', emoji: '🟡', style: ButtonStyle.Secondary },
    { id: 'Putih', emoji: '⚪', style: ButtonStyle.Secondary }, { id: 'Hitam', emoji: '⚫', style: ButtonStyle.Secondary },
    { id: 'Ungu', emoji: '🟣', style: ButtonStyle.Primary }, { id: 'Oranye', emoji: '🟠', style: ButtonStyle.Danger },
    { id: 'Coklat', emoji: '🟤', style: ButtonStyle.Secondary }
];

function startKabelTimer(guildId) {
    const game = activeGames.get(guildId);
    if (!game) return;
    
    if (game.turnTimer) clearTimeout(game.turnTimer);
    
    game.turnTimer = setTimeout(async () => {
        const currentGame = activeGames.get(guildId);
        if (!currentGame || currentGame.status !== 'playing') return;
        
        const currentTurnUser = currentGame.turnQueue[currentGame.turnIndex];
        currentGame.turnIndex = (currentGame.turnIndex + 1) % currentGame.turnQueue.length;
        
        const state = buildGameState(currentGame, `⏰ **WAKTU HABIS (AFK)!**\n<@${currentTurnUser}> kelamaan mikir, gilirannya otomatis di-skip!`, "https://media.giphy.com/media/tXL4FHPSnVJ0A/giphy.gif"); 
        
        try {
            const channel = await client.channels.fetch(currentGame.channelId);
            const oldMsg = await channel.messages.fetch(currentGame.mainMessageId).catch(()=>null);
            if (oldMsg) await oldMsg.delete().catch(()=>{});
            
            const expireUnix = Math.floor((Date.now() + 30000) / 1000);
            const newMsg = await channel.send({ content: `🔔 Giliran: <@${currentGame.turnQueue[currentGame.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(currentGame) });
            currentGame.mainMessageId = newMsg.id;
            
            startKabelTimer(guildId); 
        } catch(e) {}
    }, 30000); 
}

function buildGameState(game, extraText = "", gifUrl = "https://media.giphy.com/media/RkEai40XGxaG0eR5E8/giphy.gif") {
    let desc = extraText ? `${extraText}\n\n` : "";
    desc += `⚠️ Ada **1 Kabel Bomb** tersembunyi.\nSisa kabel aman: **${game.safeCablesLeft}**\n\n📝 **ROLE DI RONDE INI:**\n${game.activeRolesText}`;
    const embed = new EmbedBuilder().setColor('#34495e').setTitle('🚀 KABEL BERBAHAYA (SUPER SUS)').setDescription(desc).setImage(gifUrl);
    return { embeds: [embed] };
}

function getGameComponents(game) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('game_cek_role').setLabel('🕵️ Cek Role & Skill').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('game_inventory').setLabel('🎒 Tas Item').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('game_skip').setLabel('⏭️ Skip Giliran').setStyle(ButtonStyle.Primary)
    );
    
    let wireRows = [];
    let currentRow = new ActionRowBuilder();
    
    game.cables.forEach(c => {
        if (!game.cutCables.includes(c.id)) {
            if (currentRow.components.length === 5) {
                wireRows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }
            currentRow.addComponents(new ButtonBuilder().setCustomId(`wire_${c.id}`).setLabel(`Potong ${c.id}`).setEmoji(c.emoji).setStyle(c.style));
        }
    });
    if (currentRow.components.length > 0) wireRows.push(currentRow);

    return [row1, ...wireRows];
}

client.on(Events.MessageCreate, async message => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'help') {
        const embed = new EmbedBuilder().setColor('#2ecc71').setTitle('📌 Bantuan Bot (Kabel Berbahaya)')
            .addFields(
                { name: '💣 Game Kabel & Toko', value: `\`${PREFIX}mabar\` - Buka Lobby Game.\n\`${PREFIX}toko\` - Beli Item (Kacamata, Radar, Kopi).` },
                { name: '📊 Profil & Koin', value: `\`${PREFIX}profile\` - Cek Koin & Tas.\n\`${PREFIX}lb\` - Papan Peringkat.` },
                { name: '🎙️ Utilitas', value: `\`${PREFIX}join\` - Bot AFK VC.\n\`${PREFIX}leave\` - Usir Bot.\n\`${PREFIX}batal\` - Hapus lobby nyangkut.` }
            );
        message.reply({ embeds: [embed] });
    }

    else if (command === 'toko') {
        const db = loadDB();
        const pData = getDBPlayer(db, message.author.id);
        const embed = new EmbedBuilder().setColor('#f1c40f').setTitle('🛒 TOKO ITEM KABEL BERBAHAYA').setDescription(`Koin kamu: **${pData.coins} 🪙**\nBeli item untuk dibawa ke dalam mabar!\n\n🥽 **Kacamata Las (100 Koin)**\nMenahan 1 ledakan BOMB secara otomatis.\n\n📡 **Radar Mini (75 Koin)**\nBisa dipakai 1x untuk men-scan 1 kabel acak.\n\n☕ **Kopi Stamina (50 Koin)**\nBisa dipakai untuk Auto-Skip giliranmu secara paksa.`);
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buy_kacamata').setLabel('Beli Kacamata (100)').setStyle(ButtonStyle.Primary).setEmoji('🥽'),
            new ButtonBuilder().setCustomId('buy_radar').setLabel('Beli Radar (75)').setStyle(ButtonStyle.Primary).setEmoji('📡'),
            new ButtonBuilder().setCustomId('buy_kopi').setLabel('Beli Kopi (50)').setStyle(ButtonStyle.Primary).setEmoji('☕')
        );
        message.reply({ embeds: [embed], components: [row] });
    }

    else if (command === 'join') {
        if (!message.member?.voice.channel) return message.reply('❌ Masuk voice channel dulu bang!');
        connectToChannel(message.member.voice.channel);
        message.reply(`✅ Target dikunci! **${message.member.voice.channel.name}**! 🚀`);
    }
    
    else if (command === 'leave') {
        if (connection) { connection.destroy(); connection = null; message.reply('👋 Auto-reconnect dimatikan. Cabut dulu dari VC.'); }
    }

    else if (command === 'batal') {
        const guildId = message.guild.id;
        if (activeGames.has(guildId)) { clearTimeout(activeGames.get(guildId).turnTimer); activeGames.delete(guildId); return message.reply('✅ Lobby Kabel berhasil dibubarkan!'); }
        message.reply('❌ Gak ada game yang lagi jalan.');
    }

    else if (command === 'mabar') {
        const guildId = message.guild.id;
        if (activeGames.has(guildId)) return message.reply('❌ Udah ada game Kabel yang jalan.');
        activeGames.set(guildId, { host: message.author.id, players: [message.author.id], status: 'lobby', playerRoles: {} });
        
        const embed = new EmbedBuilder().setColor('#e74c3c').setTitle('💣 LOBBY KABEL BERBAHAYA').setDescription(`Main sambil on mic di VC biar saling fitnah!\n**Pemain (1/8):**\n<@${message.author.id}>`).setImage('https://media.giphy.com/media/RkEai40XGxaG0eR5E8/giphy.gif');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('game_join').setLabel('Ikut (Join)').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('game_start').setLabel('Mulai Game!').setStyle(ButtonStyle.Primary));
        message.reply({ embeds: [embed], components: [row] });
    }

    else if (command === 'leaderboard' || command === 'lb') {
        const db = loadDB();
        const sortedPlayers = Object.keys(db).map(userId => ({ userId, data: db[userId] })).sort((a, b) => b.data.coins - a.data.coins).slice(0, 10); 
        if (sortedPlayers.length === 0) return message.reply('Belum ada yang main woy.');
        let lbText = "";
        for (let i = 0; i < sortedPlayers.length; i++) {
            const pInfo = sortedPlayers[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            try { const userObj = await client.users.fetch(pInfo.userId); lbText += `${medal} **${userObj.username}** - 🪙 ${pInfo.data.coins} Koin\n`; } 
            catch (e) { lbText += `${medal} **ID: ${pInfo.userId}** - 🪙 ${pInfo.data.coins}\n`; }
        }
        message.reply({ embeds: [new EmbedBuilder().setColor('#f1c40f').setTitle('🏆 Top 10 Pemain Terkaya').setDescription(lbText)] });
    }

    else if (command === 'profile') {
        const user = message.mentions.users.first() || message.author;
        const db = loadDB();
        const pData = getDBPlayer(db, user.id);
        const totalMatches = pData.wins + pData.losses;
        const winrate = totalMatches > 0 ? ((pData.wins / totalMatches) * 100).toFixed(1) : 0;
        
        const invText = `🥽 Kacamata: ${pData.inventory.kacamata}\n📡 Radar: ${pData.inventory.radar}\n☕ Kopi: ${pData.inventory.kopi}`;
        const text = `🪙 **Koin:** ${pData.coins}\n🏆 **Menang:** ${pData.wins}\n💀 **Kalah:** ${pData.losses}\n📈 **Winrate:** ${winrate}%`;
        
        const embed = new EmbedBuilder().setColor('#3498db').setTitle(`Profil: ${user.username}`).setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields({ name: '🎮 Statistik Game', value: text, inline: true }, { name: '🎒 Tas Item', value: invText, inline: true });
        message.reply({ embeds: [embed] });
    }
});

client.on(Events.InteractionCreate, async interaction => {
    
    if (interaction.customId && interaction.customId.startsWith('buy_')) {
        const db = loadDB();
        const pData = getDBPlayer(db, interaction.user.id);
        
        if (interaction.customId === 'buy_kacamata') {
            if (pData.coins < 100) return interaction.reply({ content: '❌ Koin kamu gak cukup (Butuh 100).', ephemeral: true });
            pData.coins -= 100; pData.inventory.kacamata += 1; saveDB(db);
            return interaction.reply({ content: '✅ Membeli **🥽 1x Kacamata Las**! Item otomatis aktif menahan bomb.', ephemeral: true });
        }
        else if (interaction.customId === 'buy_radar') {
            if (pData.coins < 75) return interaction.reply({ content: '❌ Koin kamu gak cukup (Butuh 75).', ephemeral: true });
            pData.coins -= 75; pData.inventory.radar += 1; saveDB(db);
            return interaction.reply({ content: '✅ Membeli **📡 1x Radar Mini**! Gunakan di tombol [Tas Item].', ephemeral: true });
        }
        else if (interaction.customId === 'buy_kopi') {
            if (pData.coins < 50) return interaction.reply({ content: '❌ Koin kamu gak cukup (Butuh 50).', ephemeral: true });
            pData.coins -= 50; pData.inventory.kopi += 1; saveDB(db);
            return interaction.reply({ content: '✅ Membeli **☕ 1x Kopi Stamina**! Gunakan di tombol [Tas Item].', ephemeral: true });
        }
    }

    if (interaction.customId === 'game_join') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        if (!game) return;
        if (game.status !== 'lobby') return interaction.reply({ content: 'Game udah mulai.', ephemeral: true });
        if (game.players.length >= 8) return interaction.reply({ content: 'Lobby penuh (Maks 8)!', ephemeral: true });
        if (game.players.includes(interaction.user.id)) return interaction.reply({ content: 'Udah join bang.', ephemeral: true });
        game.players.push(interaction.user.id);
        await interaction.update({ embeds: [new EmbedBuilder().setColor('#e74c3c').setTitle('🎮 LOBBY KABEL BERBAHAYA').setDescription(`**Pemain (${game.players.length}/8):**\n${game.players.map(p => `<@${p}>`).join('\n')}`).setImage('https://media.giphy.com/media/RkEai40XGxaG0eR5E8/giphy.gif')] });
    }

    else if (interaction.customId === 'game_start') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        if (interaction.user.id !== game.host) return interaction.reply({ content: 'Cuma host yang bisa start!', ephemeral: true });
        if (game.players.length < 2) return interaction.reply({ content: 'Minimal 2 orang bang kalo mau main.', ephemeral: true });

        game.status = 'playing';
        game.channelId = interaction.channel.id; 
        game.turnQueue = [...game.players].sort(() => Math.random() - 0.5);
        game.turnIndex = 0;
        game.cutCables = []; 
        game.skillsUsed = { mechanic: false, mayor: false, hacker: false, spy: false, trickster: false, defuser: false, copycat: false, provocateur: false, tinkerer: false, swapper: false, sniper: false }; 

        let roleAssignPlayers = [...game.players].sort(() => Math.random() - 0.5);
        game.playerRoles[roleAssignPlayers.shift()] = ROLES.IMPOSTOR_BASE;

        let activeRolesText = `> ${ROLES.IMPOSTOR_BASE.name}\n> ${ROLES.CREWMATE.name}`;

        if (game.players.length >= 3) {
            const specialRoles = [ROLES.JOKER, ROLES.SEER, ROLES.DETECTIVE, ROLES.MECHANIC, ROLES.MAYOR, ROLES.HACKER, ROLES.SPY, ROLES.TRICKSTER, ROLES.DEFUSER, ROLES.COPYCAT, ROLES.PROVOCATEUR, ROLES.SWAPPER, ROLES.TINKERER, ROLES.SNIPER].sort(() => Math.random() - 0.5);
            let numSpecials = Math.min(game.players.length - 1, specialRoles.length); 
            
            for(let i = 0; i < numSpecials; i++) {
                if(roleAssignPlayers.length > 0) {
                    game.playerRoles[roleAssignPlayers[0]] = specialRoles[i];
                    activeRolesText += `\n> ${specialRoles[i].name}`;
                    roleAssignPlayers.shift();
                }
            }
        }
        roleAssignPlayers.forEach(p => game.playerRoles[p] = ROLES.CREWMATE);
        game.activeRolesText = activeRolesText;

        const wireCount = Math.min(9, Math.max(3, game.players.length + 1));
        game.cables = [...CABLE_COLORS].sort(() => Math.random() - 0.5).slice(0, wireCount);
        game.bombCable = game.cables[Math.floor(Math.random() * game.cables.length)].id;
        game.safeCablesLeft = game.cables.length - 1;

        const safeWires = game.cables.filter(c => c.id !== game.bombCable);
        game.seerVision = safeWires[Math.floor(Math.random() * safeWires.length)].id;
        
        let impostors = game.players.filter(p => ['IMPOSTOR', 'HACKER', 'TRICKSTER', 'PROVOCATEUR', 'SWAPPER', 'SNIPER'].includes(game.playerRoles[p].id));
        let jokers = game.players.filter(p => game.playerRoles[p].id === 'JOKER');
        let susPool = impostors.concat(jokers);
        let innocentPool = game.players.filter(p => !susPool.includes(p));
        game.detectiveVision = [susPool[Math.floor(Math.random() * susPool.length)], (innocentPool.length > 0 ? innocentPool[Math.floor(Math.random() * innocentPool.length)] : susPool[0])].sort(() => Math.random() - 0.5);

        await interaction.deferUpdate().catch(()=>{});
        await interaction.message.delete().catch(()=>{});
        
        const state = buildGameState(game, "🎉 **Game Dimulai! Jangan asal potong!**");
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const msg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = msg.id; 
        startKabelTimer(guildId); 
    }

    else if (interaction.customId === 'game_cek_role') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        const userId = interaction.user.id;
        if (!game.players.includes(userId)) return interaction.reply({ content: 'Lu gak ikut main bang.', ephemeral: true });
        
        const role = game.playerRoles[userId];
        let infoTambahan = "";
        let skillComponents = [];
        
        const isImpostorFaction = ['IMPOSTOR', 'HACKER', 'TRICKSTER', 'PROVOCATEUR', 'SWAPPER', 'SNIPER'].includes(role.id);

        if (isImpostorFaction) infoTambahan = `\n\n⚠️ **BOMB ADA DI: ${game.bombCable}**\nSuruh orang potong kabel itu!`;
        else if (role.id === 'SEER') infoTambahan = `\n\n🔮 Penerawangan: Kabel **${game.seerVision}** itu 100% AMAN.`;
        else if (role.id === 'DETECTIVE') infoTambahan = `\n\n🔍 Insting Sheriff: <@${game.detectiveVision[0]}> atau <@${game.detectiveVision[1]}> adalah MUSUH!`;
        else if (role.id === 'JOKER') infoTambahan = `\n\n🤡 Berlagak sus aja biar mereka nyuruh lu motong kabel bomb.`;
        
        if (role.id === 'MECHANIC') {
            if (!game.skillsUsed.mechanic) skillComponents = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('skill_mechanic').setLabel('🔍 Pakai Skill Scan').setStyle(ButtonStyle.Success))];
            else infoTambahan += `\n\n*(Skill Scan udah lu pake)*`;
        } else if (role.id === 'MAYOR') {
            if (!game.skillsUsed.mayor) skillComponents = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('skill_mayor').setLabel('📢 Rebut Giliran').setStyle(ButtonStyle.Success))];
            else infoTambahan += `\n\n*(Skill Wewenang udah lu pake)*`;
        } else if (role.id === 'HACKER') {
            if (!game.skillsUsed.hacker) skillComponents = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('skill_hacker').setLabel('💻 Hack & Geser Bomb').setStyle(ButtonStyle.Danger))];
            else infoTambahan += `\n\n*(Skill Hack udah lu pake)*`;
        } else if (role.id === 'SPY') {
            if (!game.skillsUsed.spy) skillComponents = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('skill_spy').setLabel('🕵️‍♂️ Intai Role Pemain').setStyle(ButtonStyle.Primary))];
            else infoTambahan += `\n\n*(Skill Intai udah lu pake)*`;
        } else if (role.id === 'TRICKSTER') {
            if (!game.skillsUsed.trickster) skillComponents = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('skill_trickster').setLabel('🌪️ Acak Giliran Semua').setStyle(ButtonStyle.Danger))];
            else infoTambahan += `\n\n*(Skill Pengacau udah lu pake)*`;
        } else if (role.id === 'DEFUSER') {
            if (!game.skillsUsed.defuser) skillComponents = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('skill_defuser').setLabel('🛡️ Potong 1 Aman Instan').setStyle(ButtonStyle.Success))];
            else infoTambahan += `\n\n*(Skill Jinak udah lu pake)*`;
        } else if (role.id === 'COPYCAT') {
            if (!game.skillsUsed.copycat) skillComponents = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('skill_copycat').setLabel('🤡 Tiru Role Orang').setStyle(ButtonStyle.Primary))];
            else infoTambahan += `\n\n*(Skill Tiru udah lu pake)*`;
        } else if (role.id === 'PROVOCATEUR') {
            if (!game.skillsUsed.provocateur) skillComponents = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('skill_provocateur').setLabel('🧨 Paksa Orang Potong').setStyle(ButtonStyle.Danger))];
            else infoTambahan += `\n\n*(Skill Paksa udah lu pake)*`;
        } else if (role.id === 'TINKERER') {
            if (!game.skillsUsed.tinkerer) skillComponents = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('skill_tinkerer').setLabel('🛠️ Bongkar 1 Kabel Aman').setStyle(ButtonStyle.Success))];
            else infoTambahan += `\n\n*(Skill Bongkar udah lu pake)*`;
        } else if (role.id === 'SWAPPER') {
            if (!game.skillsUsed.swapper) skillComponents = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('skill_swapper').setLabel('🔄 Tukar Nasib (Role)').setStyle(ButtonStyle.Danger))];
            else infoTambahan += `\n\n*(Skill Tukar udah lu pake)*`;
        } else if (role.id === 'SNIPER') {
            if (!game.skillsUsed.sniper) skillComponents = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('skill_sniper').setLabel('🎯 Tembak Antrian Pemain').setStyle(ButtonStyle.Danger))];
            else infoTambahan += `\n\n*(Skill Tembak udah lu pake)*`;
        }

        interaction.reply({ content: `**ROLE LU: ${role.name}**\n${role.desc}${infoTambahan}`, ephemeral: true, components: skillComponents });
    }

    else if (interaction.customId === 'game_inventory') {
        const userId = interaction.user.id;
        const db = loadDB();
        const pData = getDBPlayer(db, userId);
        
        let invDesc = `🎒 **ISI TAS KAMU:**\n🥽 Kacamata Las: ${pData.inventory.kacamata}x (Otomatis dipakai jika kena BOMB)\n📡 Radar Mini: ${pData.inventory.radar}x\n☕ Kopi Stamina: ${pData.inventory.kopi}x`;
        
        const row = new ActionRowBuilder();
        if (pData.inventory.radar > 0) row.addComponents(new ButtonBuilder().setCustomId('item_radar').setLabel('Pakai Radar').setStyle(ButtonStyle.Primary).setEmoji('📡'));
        if (pData.inventory.kopi > 0) row.addComponents(new ButtonBuilder().setCustomId('item_kopi').setLabel('Minum Kopi (Skip)').setStyle(ButtonStyle.Primary).setEmoji('☕'));
        
        if (row.components.length === 0) return interaction.reply({ content: `${invDesc}\n\n*(Kamu tidak punya item aktif yang bisa ditekan)*`, ephemeral: true });
        interaction.reply({ content: invDesc, ephemeral: true, components: [row] });
    }

    else if (interaction.customId === 'item_radar') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        const db = loadDB();
        const pData = getDBPlayer(db, interaction.user.id);
        
        if (pData.inventory.radar < 1) return interaction.reply({ content: 'Radar habis bro.', ephemeral: true });
        
        pData.inventory.radar -= 1; saveDB(db);
        const uncutCables = game.cables.filter(c => !game.cutCables.includes(c.id));
        const scannedCable = uncutCables[Math.floor(Math.random() * uncutCables.length)];
        const isBomb = scannedCable.id === game.bombCable;
        
        await interaction.update({ content: `📡 **HASIL RADAR MINI:**\nKabel **${scannedCable.id}** statusnya: **${isBomb ? '💥 BOMB BERBAHAYA' : '✅ AMAN'}**!`, components: [] });
    }

    else if (interaction.customId === 'item_kopi') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        const userId = interaction.user.id;
        if (game.turnQueue[game.turnIndex] !== userId) return interaction.reply({ content: 'Cuma bisa dipakai pas giliran lu bang!', ephemeral: true });
        
        const db = loadDB();
        const pData = getDBPlayer(db, userId);
        if (pData.inventory.kopi < 1) return interaction.reply({ content: 'Kopi lu habis.', ephemeral: true });
        
        pData.inventory.kopi -= 1; saveDB(db);
        
        await interaction.update({ content: '☕ Kopi diteguk! Lu langsung lari dari giliran ini!', components: [] });
        
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});
        
        game.turnIndex = (game.turnIndex + 1) % game.turnQueue.length;
        const state = buildGameState(game, `☕ **ITEM AKTIF!**\n<@${userId}> meminum Kopi Stamina dan kabur dari gilirannya!`);
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = newMsg.id;
        startKabelTimer(guildId); 
    }

    else if (interaction.customId === 'skill_mechanic') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        game.skillsUsed.mechanic = true;
        const uncutCables = game.cables.filter(c => !game.cutCables.includes(c.id));
        const scannedCable = uncutCables[Math.floor(Math.random() * uncutCables.length)];
        const isBomb = scannedCable.id === game.bombCable;
        
        await interaction.update({ content: `🔍 **HASIL SCAN:**\nKabel **${scannedCable.id}** statusnya: **${isBomb ? '💥 BOMB' : '✅ AMAN'}**!`, components: [] });
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});
        const state = buildGameState(game, `🔧 **MEKANIK BERAKSI!**\nSeseorang memindai kabel secara rahasia!`);
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = newMsg.id;
        startKabelTimer(guildId);
    }
    else if (interaction.customId === 'skill_mayor') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        const userId = interaction.user.id;
        if (game.turnQueue[game.turnIndex] === userId) return interaction.reply({ content: '❌ Sekarang emang giliran lu!', ephemeral: true });
        game.skillsUsed.mayor = true;
        game.turnIndex = game.turnQueue.indexOf(userId); 
        await interaction.update({ content: '✅ Giliran berhasil direbut!', components: [] });
        
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});
        const state = buildGameState(game, `📢 **WALIKOTA BERAKSI!**\n<@${userId}> merebut giliran secara paksa!`);
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = newMsg.id;
        startKabelTimer(guildId); 
    }
    else if (interaction.customId === 'skill_hacker') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        const availableCables = game.cables.filter(c => !game.cutCables.includes(c.id) && c.id !== game.bombCable);
        if (availableCables.length === 0) return interaction.reply({ content: '❌ Gak ada kabel sisa buat mindahin bomb!', ephemeral: true });
        game.skillsUsed.hacker = true;
        game.bombCable = availableCables[Math.floor(Math.random() * availableCables.length)].id;
        await interaction.update({ content: '✅ Sukses nge-hack letak bomb!', components: [] });
        
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});
        const state = buildGameState(game, `⚠️ **HACKER BERAKSI!**\nSistem diretas! Letak bomb kemungkinan pindah tempat!`);
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = newMsg.id;
        startKabelTimer(guildId); 
    }
    else if (interaction.customId === 'skill_spy') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        game.skillsUsed.spy = true;
        const otherPlayers = game.players.filter(p => p !== interaction.user.id);
        const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        await interaction.update({ content: `🕵️‍♂️ **HASIL INTAIAN:**\nRole asli <@${randomTarget}> adalah **${game.playerRoles[randomTarget].name}**!`, components: [] });
        
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});
        const state = buildGameState(game, `🕵️‍♂️ **MATA-MATA BERAKSI!**\nSeseorang mengetahui identitas asli pemain lain!`);
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = newMsg.id;
        startKabelTimer(guildId); 
    }
    else if (interaction.customId === 'skill_trickster') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        game.skillsUsed.trickster = true;
        game.turnQueue = game.turnQueue.sort(() => Math.random() - 0.5);
        game.turnIndex = 0;
        await interaction.update({ content: '✅ Sukses mengacak giliran!', components: [] });
        
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});
        const state = buildGameState(game, `🌪️ **PENGACAU BERAKSI!**\nUrutan bermain diacak total secara paksa!`);
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = newMsg.id;
        startKabelTimer(guildId); 
    }
    else if (interaction.customId === 'skill_copycat') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        game.skillsUsed.copycat = true;
        const otherPlayers = game.players.filter(p => p !== interaction.user.id);
        const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        game.playerRoles[interaction.user.id] = game.playerRoles[randomTarget]; 
        await interaction.update({ content: `🤡 **HASIL PENIRUAN:**\nKamu meniru identitas <@${randomTarget}>! Role barumu: **${game.playerRoles[randomTarget].name}**!`, components: [] });

        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});
        const state = buildGameState(game, `🤡 **PENIRU BERAKSI!**\nSeseorang telah menjiplak identitas role pemain lain secara rahasia!`);
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = newMsg.id;
        startKabelTimer(guildId); 
    }
    else if (interaction.customId === 'skill_defuser') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        const uncutSafeCables = game.cables.filter(c => !game.cutCables.includes(c.id) && c.id !== game.bombCable);
        if (uncutSafeCables.length === 0) return interaction.reply({ content: '❌ Gak ada kabel aman sisa!', ephemeral: true });
        
        game.skillsUsed.defuser = true;
        const defusedCable = uncutSafeCables[Math.floor(Math.random() * uncutSafeCables.length)];
        game.cutCables.push(defusedCable.id);
        game.safeCablesLeft -= 1;
        await interaction.update({ content: `🛡️ **PENJINAKAN SUKSES:** Memotong kabel **${defusedCable.id}** dari jauh!`, components: [] });
        
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});

        if (game.safeCablesLeft === 0) {
            const rewardData = processGameEnd(game, 'CREWMATE');
            const embed = new EmbedBuilder().setColor('#2ecc71').setTitle('🎉 GAME SELESAI!').setDescription(`Semua aman berkat Penjinak!\n\n🧑‍🚀 **KRU MENANG!**\n\n💰 **Hadiah:**\n${rewardData}`).setImage('https://media.giphy.com/media/9DkQ5G1lHkK78rD0qS/giphy.gif');
            clearTimeout(game.turnTimer); activeGames.delete(guildId);
            await interaction.channel.send({ embeds: [embed] });
        } else {
            const state = buildGameState(game, `🛡️ **PENJINAK BERAKSI!**\nSatu kabel AMAN telah dipotong dari jauh!`);
            const expireUnix = Math.floor((Date.now() + 30000) / 1000);
            const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
            game.mainMessageId = newMsg.id;
            startKabelTimer(guildId); 
        }
    }
    else if (interaction.customId === 'skill_provocateur') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        const targetId = game.turnQueue[(game.turnIndex + 1) % game.turnQueue.length]; 
        if (interaction.user.id === targetId) return interaction.reply({ content: '❌ Lu mau maksa diri lu sendiri potong kabel? Kocak!', ephemeral: true });
        
        game.skillsUsed.provocateur = true;
        await interaction.update({ content: `🧨 **PROVOKASI SUKSES:** Kamu memaksa <@${targetId}> memotong kabel secara otomatis!`, components: [] });
        
        const uncutCables = game.cables.filter(c => !game.cutCables.includes(c.id));
        const forcedCable = uncutCables[Math.floor(Math.random() * uncutCables.length)].id;
        game.cutCables.push(forcedCable);

        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});

        const targetRole = game.playerRoles[targetId];
        const db = loadDB();
        const pData = getDBPlayer(db, targetId);

        if (forcedCable === game.bombCable) {
            if (pData.inventory.kacamata > 0 && targetRole.id !== 'JOKER') {
                pData.inventory.kacamata -= 1; saveDB(db);
                game.safeCablesLeft -= 1;
                game.bombCable = 'NEUTRALIZED';
                if (game.safeCablesLeft === 0) {
                    const rewardData = processGameEnd(game, 'CREWMATE');
                    const embed = new EmbedBuilder().setColor('#2ecc71').setTitle('🎉 GAME SELESAI!').setDescription(`🧨 **PROVOKATOR BERAKSI!**\n<@${targetId}> dipaksa memotong BOMB! TAPI 🥽 **Kacamata Las** menahan ledakan!\n\n🧑‍🚀 **KRU MENANG!**\n\n💰 **Hadiah:**\n${rewardData}`).setImage('https://media.giphy.com/media/9DkQ5G1lHkK78rD0qS/giphy.gif');
                    clearTimeout(game.turnTimer); activeGames.delete(guildId);
                    return await interaction.channel.send({ embeds: [embed] });
                } else {
                    const state = buildGameState(game, `🧨 **PROVOKATOR BERAKSI!**\n<@${targetId}> dipaksa memotong BOMB! Tapi 🥽 **Kacamata Las** menahan ledakan! Kabel bomb jinak.`);
                    const expireUnix = Math.floor((Date.now() + 30000) / 1000);
                    const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
                    game.mainMessageId = newMsg.id;
                    return startKabelTimer(guildId);
                }
            }

            let winText = "";
            let rewardData = "";
            if (targetRole.id === 'JOKER') {
                winText = `🃏 **JOKER MENANG SOLO!** <@${targetId}> (Joker) dipaksa motong bomb dan dia mati bahagia!`;
                rewardData = processGameEnd(game, 'JOKER');
            } else {
                winText = `💥 **DUARR! KAPAL MELEDAK!**\n<@${targetId}> dipaksa motong bomb oleh Provokator!\n🔪 **IMPOSTOR MENANG:** <@${game.impostor}>`;
                rewardData = processGameEnd(game, 'IMPOSTOR');
            }
            const embed = new EmbedBuilder().setColor('#000000').setTitle('💥 KABEL BOMB DIPOTONG!').setDescription(`${winText}\n\n**Daftar Role Tadi:**\n${game.players.map(p => `<@${p}> : ${game.playerRoles[p].name}`).join('\n')}\n\n💰 **Distribusi Koin:**\n${rewardData}`).setImage('https://media.giphy.com/media/oe33xf3B50fsc/giphy.gif');
            clearTimeout(game.turnTimer); activeGames.delete(guildId);
            await interaction.channel.send({ embeds: [embed] });
        } else {
            game.safeCablesLeft -= 1;
            if (game.safeCablesLeft === 0) {
                const rewardData = processGameEnd(game, 'CREWMATE');
                const embed = new EmbedBuilder().setColor('#2ecc71').setTitle('🎉 GAME SELESAI!').setDescription(`Provokator salah perhitungan! Kabel aman terpotong.\n\n🧑‍🚀 **KRU MENANG!**\n\n💰 **Hadiah:**\n${rewardData}`).setImage('https://media.giphy.com/media/9DkQ5G1lHkK78rD0qS/giphy.gif');
                clearTimeout(game.turnTimer); activeGames.delete(guildId);
                await interaction.channel.send({ embeds: [embed] });
            } else {
                game.turnIndex = (game.turnIndex + 1) % game.turnQueue.length;
                const state = buildGameState(game, `🧨 **PROVOKATOR BERAKSI!**\n<@${targetId}> dipaksa memotong kabel **${forcedCable}** dan ternyata aman!`);
                const expireUnix = Math.floor((Date.now() + 30000) / 1000);
                const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
                game.mainMessageId = newMsg.id;
                startKabelTimer(guildId);
            }
        }
    }
    else if (interaction.customId === 'skill_tinkerer') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        const uncutSafeCables = game.cables.filter(c => !game.cutCables.includes(c.id) && c.id !== game.bombCable);
        if (uncutSafeCables.length === 0) return interaction.reply({ content: '❌ Gak ada kabel aman sisa!', ephemeral: true });
        
        game.skillsUsed.tinkerer = true;
        const revealedCable = uncutSafeCables[Math.floor(Math.random() * uncutSafeCables.length)];
        
        await interaction.update({ content: `🛠️ **BONGKAR PANEL SUKSES:** Kamu mengumumkan kabel ${revealedCable.id} aman!`, components: [] });
        
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});
        
        const state = buildGameState(game, `🛠️ **TEKNISI MEMBONGKAR PANEL!**\nKabel **${revealedCable.id}** dipastikan 100% AMAN! Silakan dipotong!`);
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = newMsg.id;
        startKabelTimer(guildId); 
    }
    else if (interaction.customId === 'skill_swapper') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        game.skillsUsed.swapper = true;
        
        const otherPlayers = game.players.filter(p => p !== interaction.user.id);
        const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        
        const tempRole = game.playerRoles[interaction.user.id];
        game.playerRoles[interaction.user.id] = game.playerRoles[randomTarget];
        game.playerRoles[randomTarget] = tempRole;
        
        await interaction.update({ content: `🔄 **TUKAR NASIB SUKSES:** Kamu diam-diam menukar rolamu dengan <@${randomTarget}>! Role kamu sekarang: **${game.playerRoles[interaction.user.id].name}**`, components: [] });
        
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});
        const state = buildGameState(game, `🔄 **PENUKAR BERAKSI!**\nSeseorang diam-diam menukar identitasnya dengan pemain lain! Cek kembali role kalian masing-masing!`);
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = newMsg.id;
        startKabelTimer(guildId); 
    }
    else if (interaction.customId === 'skill_sniper') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        
        const otherPlayers = game.turnQueue.filter(p => p !== interaction.user.id);
        if (otherPlayers.length === 0) return interaction.reply({ content: '❌ Gak ada target tersisa!', ephemeral: true });
        
        game.skillsUsed.sniper = true;
        const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        
        game.turnQueue = game.turnQueue.filter(p => p !== randomTarget);
        if (game.turnIndex >= game.turnQueue.length) game.turnIndex = 0; 
        
        await interaction.update({ content: `🎯 **TEMBAKAN SUKSES:** Kamu mencoret <@${randomTarget}> dari antrian bermain!`, components: [] });
        
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});
        const state = buildGameState(game, `🎯 **SNIPER BERAKSI!**\n<@${randomTarget}> tertembak dan dikeluarkan dari antrian bermain secara permanen!`);
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = newMsg.id;
        startKabelTimer(guildId); 
    }

    else if (interaction.customId === 'game_skip') {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        const userId = interaction.user.id;
        const currentTurnUser = game.turnQueue[game.turnIndex];
        if (userId !== currentTurnUser && userId !== game.host) return interaction.reply({ content: `⏳ Sabar elah, belum giliran lu.`, ephemeral: true });

        await interaction.deferUpdate().catch(()=>{});
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});

        let msg = `🤷 <@${currentTurnUser}> ngerasa sus, jadi dia milih skip.`;
        if (userId === game.host && userId !== currentTurnUser) msg = `⏩ Host nge-skip paksa <@${currentTurnUser}> gara-gara kelamaan/AFK.`;

        game.turnIndex = (game.turnIndex + 1) % game.turnQueue.length;
        
        const state = buildGameState(game, msg);
        const expireUnix = Math.floor((Date.now() + 30000) / 1000);
        const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
        game.mainMessageId = newMsg.id;
        startKabelTimer(guildId); 
    }

    else if (interaction.customId.startsWith('wire_')) {
        const guildId = interaction.guild.id;
        const game = activeGames.get(guildId);
        const userId = interaction.user.id;
        const currentTurnUser = game.turnQueue[game.turnIndex];
        
        if (userId !== currentTurnUser) return interaction.reply({ content: `⏳ Tunggu giliran lu dong.`, ephemeral: true });

        const role = game.playerRoles[userId];
        const isImpostorFaction = ['IMPOSTOR', 'HACKER', 'TRICKSTER', 'PROVOCATEUR', 'SWAPPER', 'SNIPER'].includes(role.id);
        
        if (isImpostorFaction) return interaction.reply({ content: `❌ Woy ${role.name} dilarang motong kabel!`, ephemeral: true });

        await interaction.deferUpdate().catch(()=>{});
        const oldMsg = await interaction.channel.messages.fetch(game.mainMessageId).catch(()=>null);
        if(oldMsg) await oldMsg.delete().catch(()=>{});

        const selectedColor = interaction.customId.split('_')[1];
        
        const db = loadDB();
        const pData = getDBPlayer(db, userId);

        if (selectedColor === game.bombCable) {
            if (pData.inventory.kacamata > 0 && role.id !== 'JOKER') {
                pData.inventory.kacamata -= 1; saveDB(db);
                game.cutCables.push(selectedColor);
                game.safeCablesLeft -= 1; 
                game.bombCable = 'NEUTRALIZED';
                
                if (game.safeCablesLeft === 0) {
                    const rewardData = processGameEnd(game, 'CREWMATE');
                    const embed = new EmbedBuilder().setColor('#2ecc71').setTitle('🎉 GAME SELESAI!').setDescription(`BOMB DIPOTONG! TAPI 🥽 **Kacamata Las** menahan ledakan! Semua selamat!\n\n🧑‍🚀 **KRU MENANG!**\n\n💰 **Hadiah:**\n${rewardData}`).setImage('https://media.giphy.com/media/9DkQ5G1lHkK78rD0qS/giphy.gif');
                    clearTimeout(game.turnTimer); activeGames.delete(guildId);
                    return await interaction.channel.send({ embeds: [embed] });
                } else {
                    game.turnIndex = (game.turnIndex + 1) % game.turnQueue.length;
                    const state = buildGameState(game, `💥 <@${userId}> memotong BOMB! Tapi 🥽 **Kacamata Las** menahan ledakan! Kabel bomb kini jinak.`);
                    const expireUnix = Math.floor((Date.now() + 30000) / 1000);
                    const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
                    game.mainMessageId = newMsg.id;
                    return startKabelTimer(guildId); 
                }
            }

            game.cutCables.push(selectedColor);
            let winText = "";
            let rewardData = "";

            if (role.id === 'JOKER') {
                winText = `🃏 **JOKER MENANG SOLO!** <@${userId}> sengaja bunuh diri motong bomb!`;
                rewardData = processGameEnd(game, 'JOKER');
            } else {
                winText = `💥 **DUARR! KAPAL MELEDAK!**\n<@${userId}> salah potong!\n🔪 **IMPOSTOR MENANG:** <@${game.impostor}>`;
                rewardData = processGameEnd(game, 'IMPOSTOR');
            }

            const embed = new EmbedBuilder().setColor('#000000').setTitle('💥 KABEL BOMB DIPOTONG!').setDescription(`${winText}\n\n**Daftar Role Tadi:**\n${game.players.map(p => `<@${p}> : ${game.playerRoles[p].name}`).join('\n')}\n\n💰 **Distribusi Koin:**\n${rewardData}`).setImage('https://media.giphy.com/media/oe33xf3B50fsc/giphy.gif'); 
            
            clearTimeout(game.turnTimer);
            activeGames.delete(guildId);
            await interaction.channel.send({ embeds: [embed] });
        } else {
            game.cutCables.push(selectedColor);
            game.safeCablesLeft -= 1;
            
            if (game.safeCablesLeft === 0) {
                const rewardData = processGameEnd(game, 'CREWMATE');
                const embed = new EmbedBuilder().setColor('#2ecc71').setTitle('🎉 GAME SELESAI!').setDescription(`Semua kabel aman dibersihkan!\n\n🧑‍🚀 **KRU MENANG!**\n\n**Daftar Role Tadi:**\n${game.players.map(p => `<@${p}> : ${game.playerRoles[p].name}`).join('\n')}\n\n💰 **Distribusi Koin:**\n${rewardData}`).setImage('https://media.giphy.com/media/9DkQ5G1lHkK78rD0qS/giphy.gif');
                clearTimeout(game.turnTimer);
                activeGames.delete(guildId);
                await interaction.channel.send({ embeds: [embed] });
            } else {
                game.turnIndex = (game.turnIndex + 1) % game.turnQueue.length;
                const state = buildGameState(game, `✅ <@${userId}> motong kabel **${selectedColor}** dan aman ges.`);
                const expireUnix = Math.floor((Date.now() + 30000) / 1000);
                const newMsg = await interaction.channel.send({ content: `🔔 Giliran: <@${game.turnQueue[game.turnIndex]}>\n⏳ Waktu tersisa: <t:${expireUnix}:R>`, embeds: state.embeds, components: getGameComponents(game) });
                game.mainMessageId = newMsg.id;
                startKabelTimer(guildId); 
            }
        }
    }
});

client.login(TOKEN).catch(err => console.error('[ERROR] Login Gagal:', err));
